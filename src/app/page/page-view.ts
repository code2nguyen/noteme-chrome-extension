import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { MenuSelectEventDetail } from '@c2n/components/menu';
// The c2 elements of a page, loaded with its route: the editor (ProseMirror, shiki on demand) never loads on Home.
import '@c2n/components/menu';
import '@c2n/components/menu/menu-item';
import '@c2n/components/page-editor';
import '@c2n/components/inline-edit';
import '@c2n/feather-icons/icons/archive.js';
import '@c2n/feather-icons/icons/arrow-left.js';
import '@c2n/feather-icons/icons/more-horizontal.js';
import '@c2n/feather-icons/icons/rotate-ccw.js';
import '@c2n/feather-icons/icons/trash-2.js';
import type { PageEditor } from '@c2n/components/page-editor';
import type { InlineEdit } from '@c2n/components/inline-edit';
import { combineLatest, EMPTY, interval } from 'rxjs';
import { filter, map, startWith, switchMap, take, tap, timeout } from 'rxjs/operators';

import { DataService } from '../services/data.service';
import { INSTANCE_ID } from '../services/instance-id';
import { editedLabel, pageMarkdownToText } from '../services/utils';
import { ArtBoardItem, ItemData } from '../store/models';
import { DataType } from '../store/models/data-type';

/** How long "Saving…" stays after the last keystroke: the store writes 300ms after typing stops. */
const SAVING_DELAY = 700;

/**
 * A page, full screen: a title and a c2-page-editor. Everything saves as you type. A page left with no title and no
 * text is removed when you leave it, so "New page" never leaves empty cards behind.
 */
@Component({
  selector: 'ntm-page-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [RouterLink],
  templateUrl: './page-view.html',
  styleUrl: './page-view.scss',
})
export class PageView {
  private readonly dataService = inject(DataService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly instanceId = inject(INSTANCE_ID);
  private readonly injector = inject(Injector);
  private readonly titleField = viewChild<ElementRef<InlineEdit>>('titleField');
  private readonly editor = viewChild<ElementRef<PageEditor>>('editor');

  readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')), { initialValue: '' });
  readonly title = signal('');
  readonly value = signal('');
  readonly saving = signal(false);
  readonly found = signal<boolean | null>(null);
  /** Archived: off the board, in the Archive view. */
  readonly archived = signal(false);
  /** Opened from the Archive (`?from=archive`): what the header goes by until the page is read. */
  private readonly openedFromArchive = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('from') === 'archive')),
    { initialValue: false },
  );
  /** Whether the way back leads to the Archive and the menu offers Restore. */
  readonly inArchive = computed(() => (this.found() === null ? this.openedFromArchive() : this.archived()));
  private readonly modified = signal<string | undefined>(undefined);
  private readonly createdDate = signal<string | undefined>(undefined);
  private readonly tick = toSignal(interval(30_000).pipe(startWith(0)));
  private item: ArtBoardItem | undefined;
  /** The page shown: Angular reuses this view from one page to the next. */
  private shownId: string | undefined;
  /** Whether the shown page's stored title and text are bound: until then the view holds nothing of it. */
  private bound = false;
  /** The stored data last seen: an emission for the item alone (restored, moved) must not bind it again. */
  private boundData: ItemData | undefined;
  /** Opened by "New page": the only page removed when it is left before its data was read. */
  private isNew = false;
  /** Deleted or archived from its menu: leaving it must not remove it. */
  private deleted = false;
  private savingTimer?: ReturnType<typeof setTimeout>;

  readonly status = computed(() => {
    this.tick();
    if (this.found() === null) {
      return 'Loading…';
    }
    if (this.saving()) {
      return 'Saving…';
    }
    const modified = this.modified();
    return modified ? `Saved · edited ${editedLabel(modified)}` : 'Saved';
  });
  readonly created = computed(() => {
    const created = this.createdDate();
    return created ? new Date(created).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : '';
  });

  constructor() {
    this.dataService.loadAllArtBoardItems();
    combineLatest([
      this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
      this.dataService.isAllArtBoardItemsLoaded().pipe(filter(Boolean), take(1)),
    ])
      .pipe(
        tap(([id]) => this.show(id)),
        switchMap(([id]) =>
          combineLatest([this.dataService.getArtBoardItemById(id), this.dataService.getItemData(id)]),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(([item, data]) => {
        this.item = item;
        this.found.set(!!item);
        this.archived.set(!!item && !item.boardId);
        this.modified.set(data.empty ? undefined : data.modifiedDate);
        this.createdDate.set(data.empty ? undefined : data.createdDate);
        // Bind the stored page once, then only changes made elsewhere: re-applying our own saves would move the caret.
        const changed = data !== this.boundData;
        this.boundData = data;
        if (!this.bound || (changed && data.sourceId !== this.instanceId)) {
          const first = !this.bound;
          this.bound = true;
          this.title.set(data.properties?.title ?? '');
          this.value.set(data.data ?? '');
          // The title field renders with the page, once it is found.
          if (first && item && this.isNew) {
            afterNextRender(() => void this.focusTitle(), { injector: this.injector });
          }
        }
      });

    effect((onCleanup) => {
      const field = this.titleField()?.nativeElement;
      if (field) {
        const listener = (event: KeyboardEvent) => this.onTitleKeydown(field, event);
        field.addEventListener('keydown', listener, { capture: true });
        onCleanup(() => field.removeEventListener('keydown', listener, { capture: true }));
      }
    });

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.savingTimer);
      this.leave();
    });
  }

  /** The title was committed (Enter, or leaving the field). */
  onTitleChange(event: Event): void {
    // The title sits in the editor's header slot: keep its events from reaching the editor's own listener.
    event.stopPropagation();
    const title = (event.target as InlineEdit).value;
    this.title.set(title);
    this.save({ properties: { title } });
  }

  /**
   * Enter in the open title saves it and moves on to the page, as in any document editor; so does the down arrow.
   * Listened to on the way down (capture): the inline edit closes on Enter inside its shadow root, before the key
   * would reach a listener on the element. Enter on the closed title only opens it.
   */
  private onTitleKeydown(field: InlineEdit, event: KeyboardEvent): void {
    if (!field.editing) {
      return;
    }
    // At once, so the next keys land in the page: the field, losing focus, commits (and saves) its title.
    if (event.key === 'Enter' || (event.key === 'ArrowDown' && !event.shiftKey)) {
      event.preventDefault();
      this.editor()?.nativeElement.focus();
    }
  }

  onEditorInput(event: Event): void {
    const editor = this.editor()?.nativeElement;
    if (event.target !== editor || !editor) {
      return;
    }
    const value = editor.value;
    this.value.set(value);
    this.save({ data: value });
  }

  onMenu(event: Event): void {
    const value = (event as CustomEvent<MenuSelectEventDetail>).detail.value;
    const item = this.item;
    if (!item) {
      return;
    }
    if (value === 'restore') {
      this.dataService.restoreArtBoardItem(item);
      return;
    }
    if (value !== 'delete' && value !== 'archive') {
      return;
    }
    this.deleted = true;
    // A blank page is removed rather than archived, as it would be when left.
    if (value === 'archive' && !(!this.title().trim() && !pageMarkdownToText(this.value()).trim())) {
      // Decided on what the view shows: the store may not have the last edit yet (its save is debounced).
      this.dataService.hideArtBoardItem(item, { keep: true });
    } else {
      this.dataService.removeArtBoardItem(item);
    }
    this.router.navigate(['/main-board']);
  }

  private save(changes: { data?: string; properties?: { title: string } }): void {
    this.dataService.updateDataItem({ id: this.id(), dataType: DataType.PAGE, ...changes });
    this.saving.set(true);
    clearTimeout(this.savingTimer);
    this.savingTimer = setTimeout(() => this.saving.set(false), SAVING_DELAY);
  }

  /** A new page opens with its title field open and focused, ready to type in. */
  private async focusTitle(): Promise<void> {
    const field = this.titleField()?.nativeElement;
    if (!field) {
      return;
    }
    await customElements.whenDefined('c2-inline-edit');
    field.editing = true;
    await field.updateComplete;
    field.focus();
  }

  private show(id: string): void {
    if (id === this.shownId) {
      return;
    }
    this.leave();
    this.shownId = id;
    this.isNew = this.route.snapshot.queryParamMap.has('new');
    // Nothing of the last one carries over: its "Saving…" (its save goes on regardless) or its being archived.
    clearTimeout(this.savingTimer);
    this.saving.set(false);
    this.archived.set(false);
    this.found.set(null);
  }

  /** A page left with no title and no text is removed, as when the view is destroyed. */
  private leave(): void {
    const id = this.shownId;
    if (id && !this.deleted) {
      if (this.bound) {
        const item = this.item;
        if (item && !this.title().trim() && !pageMarkdownToText(this.value()).trim()) {
          this.dataService.removeArtBoardItem(item);
        }
      } else if (this.isNew) {
        // Left before its data was read: decide on what is stored, which is empty unless another tab wrote to it.
        combineLatest([this.dataService.getArtBoardItemById(id), this.dataService.getItemData(id)])
          // A failed read never brings the data: give up rather than hold this view and a store selector forever.
          .pipe(take(1), timeout({ first: 10_000, with: () => EMPTY }))
          .subscribe(([item, data]) => {
            if (item && !data.properties?.title?.trim() && !pageMarkdownToText(data.data ?? '').trim()) {
              this.dataService.removeArtBoardItem(item);
            }
          });
      }
    }
    this.shownId = undefined;
    this.item = undefined;
    this.bound = false;
    this.boundData = undefined;
    this.deleted = false;
  }
}
