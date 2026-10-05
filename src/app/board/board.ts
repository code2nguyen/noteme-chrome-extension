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
  viewChildren,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import type { AutocompleteSelectEventDetail } from '@c2n/components/autocomplete';
import type { MasonryLayoutSnapshot } from '@c2n/components/masonry';
import type { MenuSelectEventDetail } from '@c2n/components/menu';
import { combineLatest, ReplaySubject } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

import './board-elements';
import { ExtensionId } from '../extension-id';
import { noteDefaultProperties } from '../note-config';
import { DataService } from '../services/data.service';
import { DeviceSyncService, SyncState } from '../services/device-sync.service';
import { editedLabel, getCurrentDate, getText, pageMarkdownToText, uuid } from '../services/utils';
import { ArtBoardItemApiActions } from '../store/actions';
import { ArtBoardItem, DEFAULT_BOARD_ID } from '../store/models';
import { selectItemDataEntities } from '../store/reducers';
import { NoteCard } from './note-card';
import { FlowCard } from './flow-card';
import { PAGE_EXCERPT_LENGTH, PageCard } from './page-card';

interface SearchSuggestion {
  id: string;
  label: string;
  description: string;
}

const PREVIEW_LENGTH = 80;
const MIN_PAGE_ROWS = 3;
const MAX_PAGE_ROWS = 6;
const CHARS_PER_ROW = 70;

/** Keys that start something new from anywhere on the board, as shown in the New menu. */
const NEW_KEYS: Record<string, ExtensionId> = { n: ExtensionId.TextNote, p: ExtensionId.Page, f: ExtensionId.Flow };

/** The notes that open full screen, and their route. */
const FULL_SCREEN: Partial<Record<ExtensionId, string>> = { [ExtensionId.Page]: '/page', [ExtensionId.Flow]: '/flow' };

/**
 * Every note in one place, newest first. Quick notes are written right on their card; pages show their title and
 * first lines and open full screen. The search covers everything, including notes archived by older versions.
 */
@Component({
  selector: 'ntm-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NoteCard, PageCard, FlowCard, RouterLink],
  templateUrl: './board.html',
  styleUrl: './board.scss',
  host: {
    '(window:scroll)': 'onScroll()',
    '(document:keydown)': 'onKey($event)',
  },
})
export class Board {
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly dataService = inject(DataService);
  private readonly deviceSync = inject(DeviceSyncService);
  private readonly cards = viewChildren(NoteCard);
  private readonly searchField = viewChild<ElementRef<HTMLElement>>('searchField');

  readonly ExtensionId = ExtensionId;
  readonly SyncState = SyncState;

  /**
   * Emits once the board has read its notes. Subscribed before `items` asks for them: storage may answer at once
   * (localStorage in the web build), before the constructor runs.
   */
  private readonly boardLoaded = new ReplaySubject<void>(1);
  private readonly boardLoadedSubscription = inject(Actions)
    .pipe(
      ofType(ArtBoardItemApiActions.loadArtBoardItemsSuccess, ArtBoardItemApiActions.loadArtBoardItemsFailure),
      take(1),
    )
    .subscribe(() => this.boardLoaded.next());

  /** What the search field holds, as typed (binding it back trimmed would eat a space the user just typed). */
  readonly query = signal('');
  readonly searchQuery = computed(() => this.query().trim());
  readonly raised = signal(false);
  readonly focusItemId = signal<string | null>(null);

  readonly syncState = toSignal(this.deviceSync.syncState$, { requireSync: true });
  readonly searching = toSignal(this.dataService.selectArtBoardItemSearchLoading(), { initialValue: false });

  /** The notes of the board in their stored order: a new note goes first. */
  readonly items = toSignal(
    this.dataService
      .getArtBoardItems(DEFAULT_BOARD_ID)
      .pipe(map((items) => [...items].sort((a, b) => a.gridPosition.order - b.gridPosition.order))),
    { initialValue: [] as ArtBoardItem[] },
  );

  /** Search results as autocomplete rows: every note and page, archived ones included. */
  readonly suggestions = toSignal(
    combineLatest([this.dataService.getSearchResults(), this.store.select(selectItemDataEntities)]).pipe(
      map(([items, data]) =>
        items.map((item): SearchSuggestion => {
          const itemData = data[item.id];
          const text = itemData ? getText(itemData.data, itemData.dataType, itemData.properties) : '';
          const firstLine = text.split('\n').find((line) => line.trim()) ?? '';
          const kind =
            item.extensionId === ExtensionId.Page ? 'Page' : item.extensionId === ExtensionId.Flow ? 'Flow' : 'Note';
          const label = firstLine || (kind === 'Note' ? 'Empty note' : `Untitled ${kind.toLowerCase()}`);
          const edited = editedLabel(itemData?.modifiedDate ?? item.dataModifiedDate ?? item.modifiedDate);
          return {
            id: item.id,
            label: label.length > PREVIEW_LENGTH ? label.slice(0, PREVIEW_LENGTH) + '…' : label,
            description: `${kind} · ${edited}`,
          };
        }),
      ),
    ),
    { initialValue: [] as SearchSuggestion[] },
  );

  /**
   * The order and spans of the tiles. c2-masonry keeps its own order once it has seen a tile and appends tiles it has
   * not seen, so without this a new note (order = min - 1, first in the DOM) would show up last.
   */
  readonly layout = computed<MasonryLayoutSnapshot>(() => ({
    version: 1,
    items: this.items().map((item) => ({
      id: item.id,
      rows: this.rowsOf(item),
      columns: {
        xs: item.gridPosition.screenColumns.XSmall,
        sm: item.gridPosition.screenColumns.Small,
        md: item.gridPosition.screenColumns.Medium,
        lg: item.gridPosition.screenColumns.Large,
      },
    })),
  }));

  private readonly itemData = toSignal(this.store.select(selectItemDataEntities), { requireSync: true });

  /** Notes keep their stored height; a page card is as tall as its excerpt, so a short page is a short card. */
  rowsOf(item: ArtBoardItem): number {
    if (item.extensionId === ExtensionId.Flow) {
      return item.gridPosition.rows;
    }
    if (item.extensionId !== ExtensionId.Page) {
      return item.gridPosition.rows;
    }
    const data = this.itemData()[item.id];
    const length = data ? pageMarkdownToText(data.data ?? '').length : 0;
    return Math.min(MAX_PAGE_ROWS, MIN_PAGE_ROWS + Math.ceil(Math.min(length, PAGE_EXCERPT_LENGTH) / CHARS_PER_ROW));
  }

  /** The store already searched (fuse.js); the autocomplete shows every result it is given. */
  readonly matchAll = () => true;

  private readonly minOrder = computed(() => {
    const items = this.items();
    return items.length > 0 ? Math.min(...items.map((item) => item.gridPosition.order ?? 0)) : 0;
  });

  constructor() {
    toObservable(this.searchQuery).subscribe((query) => this.dataService.searchArtBoardItem(query));
    this.deviceSync.sync();
    this.handleHomeActions();
    inject(DestroyRef).onDestroy(() => this.boardLoadedSubscription.unsubscribe());
  }

  /** Home links here with `?new=note` (write a note) or `?search=1` (search); each runs once, then leaves the URL. */
  private handleHomeActions(): void {
    const params = inject(ActivatedRoute).snapshot.queryParamMap;
    if (params.has('new')) {
      const kind = params.get('new') === 'page' ? ExtensionId.Page : ExtensionId.TextNote;
      // The new note goes before the first one, so wait until the board has read its notes.
      this.boardLoaded.pipe(take(1)).subscribe(() => setTimeout(() => this.create(kind)));
    }
    if (params.has('search')) {
      afterNextRender(() => this.searchField()?.nativeElement.focus());
    }
    if (params.has('new') || params.has('search')) {
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  search(event: Event): void {
    this.query.set((event as CustomEvent<{ query: string }>).detail.query);
  }

  selectSearchResult(event: Event): void {
    const { item } = (event as CustomEvent<AutocompleteSelectEventDetail>).detail;
    const id = (item as SearchSuggestion).id;
    const found = this.findSearchResult(id);
    this.query.set('');
    if (!found) {
      return;
    }
    const route = FULL_SCREEN[found.extensionId];
    if (route) {
      this.router.navigate([route, id]);
      return;
    }
    // A note archived by an older version comes back to the board, first.
    if (!found.boardId) {
      this.dataService.showArtBoardItem(found, this.minOrder() - 1);
    }
    this.highlight(id);
  }

  onNewMenu(event: Event): void {
    const value = (event as CustomEvent<MenuSelectEventDetail>).detail.value;
    this.create(value === 'page' ? ExtensionId.Page : value === 'flow' ? ExtensionId.Flow : ExtensionId.TextNote);
  }

  /** N for a note, P for a page, when the keyboard is not busy in a field or an editor. */
  onKey(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchField()?.nativeElement.focus();
      return;
    }
    const kind = NEW_KEYS[event.key.toLowerCase()];
    if (!kind || event.ctrlKey || event.metaKey || event.altKey || this.typing(event)) {
      return;
    }
    event.preventDefault();
    this.create(kind);
  }

  create(kind: ExtensionId): void {
    const defaults = structuredClone(noteDefaultProperties[kind]);
    const item: ArtBoardItem = {
      ...defaults,
      id: uuid(),
      modifiedDate: getCurrentDate(),
      boardId: DEFAULT_BOARD_ID,
      gridPosition: { ...defaults.gridPosition, order: this.minOrder() - 1 },
    };
    this.dataService.addArtBoardItem(item);
    const route = FULL_SCREEN[kind];
    if (route) {
      // Open it once it is stored, so its view finds it.
      this.dataService
        .getArtBoardItemById(item.id)
        .pipe(filter(Boolean), take(1))
        .subscribe(() => this.router.navigate([route, item.id], { queryParams: { new: 1 } }));
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.focusItemId.set(item.id);
  }

  removeNote(item: ArtBoardItem): void {
    this.dataService.removeArtBoardItem(item);
  }

  onScroll(): void {
    this.raised.set(window.scrollY > 0);
  }

  resync(): void {
    this.deviceSync.sync();
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  openSettings(): void {
    this.router.navigate(['/'], { queryParams: { settings: 1 } });
  }

  private typing(event: KeyboardEvent): boolean {
    return event
      .composedPath()
      .some(
        (target) =>
          target instanceof HTMLElement &&
          (target.isContentEditable ||
            /^(input|textarea|select)$/i.test(target.localName) ||
            target.localName.startsWith('c2-menu')),
      );
  }

  private findSearchResult(id: string): ArtBoardItem | undefined {
    let found: ArtBoardItem | undefined;
    this.dataService
      .getSearchResults()
      .subscribe((items) => (found = items.find((item) => item.id === id)))
      .unsubscribe();
    return found;
  }

  /** Blink the note once it is on the board (a restored note renders a moment later). */
  private highlight(id: string, attempts = 20): void {
    const card = this.cards().find((candidate) => candidate.item().id === id);
    if (card) {
      card.highlight();
    } else if (attempts > 0) {
      setTimeout(() => this.highlight(id, attempts - 1), 50);
    }
  }
}
