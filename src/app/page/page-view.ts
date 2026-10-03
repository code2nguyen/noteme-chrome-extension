import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { MenuSelectEventDetail } from '@c2n/menu';
// The c2 elements of a page, loaded with its route: the editor (ProseMirror, shiki on demand) never loads on Home.
import '@c2n/menu';
import '@c2n/menu/menu-item.js';
import '@c2n/page-editor';
import '@c2n/text-field';
import '@c2n/feather-icons/icons/arrow-left.js';
import '@c2n/feather-icons/icons/more-horizontal.js';
import '@c2n/feather-icons/icons/trash-2.js';
import type { PageEditor } from '@c2n/page-editor';
import type { TextField } from '@c2n/text-field';
import { combineLatest, interval } from 'rxjs';
import { filter, map, startWith, switchMap, take } from 'rxjs/operators';

import { DataService } from '../services/data.service';
import { INSTANCE_ID } from '../services/instance-id';
import { editedLabel, pageMarkdownToText } from '../services/utils';
import { ArtBoardItem } from '../store/models';
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
  private readonly titleField = viewChild<ElementRef<TextField>>('titleField');
  private readonly editor = viewChild<ElementRef<PageEditor>>('editor');

  readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')), { initialValue: '' });
  readonly title = signal('');
  readonly value = signal('');
  readonly saving = signal(false);
  readonly found = signal<boolean | null>(null);
  private readonly modified = signal<string | undefined>(undefined);
  private readonly tick = toSignal(interval(30_000).pipe(startWith(0)));
  private item: ArtBoardItem | undefined;
  private deleted = false;
  private savingTimer?: ReturnType<typeof setTimeout>;

  readonly status = computed(() => {
    this.tick();
    if (this.saving()) {
      return 'Saving…';
    }
    const modified = this.modified();
    return modified ? `Saved · edited ${editedLabel(modified)}` : 'Saved';
  });
  readonly created = computed(() => {
    const modified = this.modified();
    return modified ? new Date(modified).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : '';
  });

  constructor() {
    this.dataService.loadAllArtBoardItems();
    let firstBinding = true;
    combineLatest([
      this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
      this.dataService.isAllArtBoardItemsLoaded().pipe(filter(Boolean), take(1)),
    ])
      .pipe(
        switchMap(([id]) =>
          combineLatest([this.dataService.getArtBoardItemById(id), this.dataService.getItemData(id)]),
        ),
      )
      .subscribe(([item, data]) => {
        this.item = item;
        this.found.set(!!item);
        this.modified.set(data.empty ? undefined : data.modifiedDate);
        // Bind the stored page once, then only changes made elsewhere: re-applying our own saves would move the caret.
        if (firstBinding || data.sourceId !== this.instanceId) {
          firstBinding = false;
          this.title.set(data.properties?.title ?? '');
          this.value.set(data.data ?? '');
        }
      });

    if (this.route.snapshot.queryParamMap.has('new')) {
      afterNextRender(() => void this.focusTitle());
    }

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.savingTimer);
      this.removeIfEmpty();
    });
  }

  onTitleInput(event: Event): void {
    // The title sits in the editor's header slot: keep its input from reaching the editor's own listener.
    event.stopPropagation();
    const title = (event.target as TextField).value;
    this.title.set(title);
    this.save({ properties: { title } });
  }

  /** Enter in the title moves on to the page, as in any document editor. */
  onTitleKeydown(event: KeyboardEvent): void {
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
    if ((event as CustomEvent<MenuSelectEventDetail>).detail.value === 'delete' && this.item) {
      this.deleted = true;
      this.dataService.removeArtBoardItem(this.item);
      this.router.navigate(['/main-board']);
    }
  }

  private save(changes: { data?: string; properties?: { title: string } }): void {
    this.dataService.updateDataItem({ id: this.id(), dataType: DataType.PAGE, ...changes });
    this.saving.set(true);
    clearTimeout(this.savingTimer);
    this.savingTimer = setTimeout(() => this.saving.set(false), SAVING_DELAY);
  }

  private async focusTitle(): Promise<void> {
    const field = this.titleField()?.nativeElement;
    if (!field) {
      return;
    }
    await customElements.whenDefined('c2-text-field');
    await field.updateComplete;
    field.focus();
  }

  private removeIfEmpty(): void {
    const item = this.item;
    if (item && !this.deleted && !this.title().trim() && !pageMarkdownToText(this.value()).trim()) {
      this.dataService.removeArtBoardItem(item);
    }
  }
}
