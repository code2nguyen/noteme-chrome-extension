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
import type { MasonryLayoutChangeDetail, MasonryLayoutSnapshot } from '@c2n/components/masonry';
import type { MenuSelectEventDetail } from '@c2n/components/menu';
import type { SearchFieldSearchDetail } from '@c2n/components/search-field';
import type { ToastRegion } from '@c2n/components/toast';
import { Dictionary } from '@ngrx/entity';
import { combineLatest, of, ReplaySubject } from 'rxjs';
import { distinctUntilChanged, filter, map, switchMap, take } from 'rxjs/operators';

import './board-elements';
import { ExtensionId } from '../extension-id';
import { latestNotePaper, noteDefaultProperties, paperColorFor } from '../note-config';
import { DataService } from '../services/data.service';
import { DeviceSyncService } from '../services/device-sync.service';
import { FULL_SCREEN, SearchSuggestion, searchShortcut, searchSuggestions } from '../services/search-results';
import { editedLabel, getCurrentDate, pageMarkdownToText, uuid } from '../services/utils';
import { ArtBoardItemApiActions, ItemDataActions } from '../store/actions';
import { ArtBoardItem, DEFAULT_BOARD_ID, ItemData } from '../store/models';
import { selectIsAllLoadedItemDatas, selectItemDataEntities } from '../store/reducers';
import { hasFeature } from '../settings/settings';
import { SettingsPanel } from '../settings/settings-panel';
import { SettingsService } from '../settings/settings.service';
import { ArchiveView } from './archive-view';
import { NoteCard } from './note-card';
import { FlowCard } from './flow-card';
import { cardRows, storedRows } from './card-rows';
import { PageCard } from './page-card';
import { groupByMonth, NoteSummary, rearrange, splitBoard, summarize } from './older-notes';

type BoardView = 'notes' | 'archive';

/** Keys that start something new from anywhere on the board, as shown in the New menu. */
const NEW_KEYS: Record<string, ExtensionId> = { n: ExtensionId.TextNote, p: ExtensionId.Page, f: ExtensionId.Flow };

/**
 * Every note in one place, newest first. Quick notes are written right on their card; pages and flows show a card and
 * open full screen. Notes, pages and flows put away land in the Archive view (`?view=archive`); the search on the
 * Notes view covers everything, archived or not.
 */
@Component({
  selector: 'ntm-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [ArchiveView, NoteCard, PageCard, FlowCard, RouterLink, SettingsPanel],
  templateUrl: './board.html',
  styleUrl: './board.scss',
  host: {
    '(window:scroll)': 'onScroll()',
    '(document:keydown)': 'onKey($event)',
    '(document:visibilitychange)': 'onVisibilityChange()',
  },
})
export class Board {
  private readonly router = inject(Router);
  private readonly settings = inject(SettingsService).settings;
  /** Plan is optional: its link shows only while it is switched on in Settings. */
  readonly planOn = computed(() => hasFeature(this.settings(), 'plan'));
  private readonly store = inject(Store);
  private readonly dataService = inject(DataService);
  private readonly deviceSync = inject(DeviceSyncService);
  private readonly cards = viewChildren(NoteCard);
  private readonly searchField = viewChild<ElementRef<HTMLElement>>('searchField');
  private readonly toasts = viewChild<ElementRef<ToastRegion>>('toasts');
  private readonly route = inject(ActivatedRoute);

  readonly ExtensionId = ExtensionId;

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

  /** The view is in the URL, so the way back from a page opened in the Archive leads to the Archive. */
  readonly view = toSignal(
    this.route.queryParamMap.pipe(map((params): BoardView => (params.get('view') === 'archive' ? 'archive' : 'notes'))),
    { initialValue: 'notes' as BoardView },
  );
  readonly inNotesView = computed(() => this.view() === 'notes');
  /** Settings open in a sheet over the board, as over Home (`?settings=1`), so closing it comes back here. */
  readonly settingsOpen = toSignal(this.route.queryParamMap.pipe(map((params) => params.has('settings'))), {
    initialValue: false,
  });

  /** What the search field holds, as typed (binding it back trimmed would eat a space the user just typed). */
  readonly query = signal('');
  readonly searchQuery = computed(() => this.query().trim());
  readonly raised = signal(false);
  readonly focusItemId = signal<string | null>(null);

  readonly searching = toSignal(this.dataService.selectArtBoardItemSearchLoading(), { initialValue: false });

  /** The notes of the board in their stored order: a new note goes first. */
  private readonly boardItems = toSignal(
    this.dataService
      .getArtBoardItems(DEFAULT_BOARD_ID)
      .pipe(map((items) => [...items].sort((a, b) => a.gridPosition.order - b.gridPosition.order))),
    { initialValue: [] as ArtBoardItem[] },
  );

  /** What the Archive view shows: everything archived, oldest edit first, or what matches the search. */
  private readonly archivedItems = toSignal(
    combineLatest([toObservable(this.view), toObservable(this.searchQuery)]).pipe(
      // Typing on the Notes view must not reload the archive, and the archive is only read once it is opened.
      map(([view, query]) => (view === 'archive' ? query : null)),
      distinctUntilChanged(),
      switchMap((query) => {
        if (query === null) {
          return of([]);
        }
        if (query) {
          return this.dataService.getSearchResults().pipe(map((items) => items.filter((item) => !item.boardId)));
        }
        return this.dataService
          .getArchivedArtBoardItems()
          .pipe(
            map((items) =>
              [...items].sort((a, b) =>
                (a.dataModifiedDate || a.modifiedDate).localeCompare(b.dataModifiedDate || b.modifiedDate),
              ),
            ),
          );
      }),
    ),
    { initialValue: [] as ArtBoardItem[] },
  );

  protected readonly itemData = toSignal(this.store.select(selectItemDataEntities), { requireSync: true });
  /** Every note's stored text is read: each one's last edit is known, and with it which notes the board shows. */
  private readonly dataLoaded = toSignal(this.store.select(selectIsAllLoadedItemDatas), { initialValue: false });
  /** Notes shown on the board on purpose this session, recent or not: picked in the search, or just unpinned. */
  private readonly revealed = signal<ReadonlySet<string>>(new Set());

  /** The board's notes split: pinned and recent ones on the board, the rest in the Older notes sheet. */
  private readonly split = computed(() => splitBoard(this.boardItems(), this.itemData(), this.revealed()));

  /** Whether the view has what it shows: the Notes view waits for the notes' dates, or it would show them all first. */
  readonly ready = computed(() => !this.inNotesView() || this.dataLoaded());

  readonly items = computed(() =>
    this.inNotesView() ? (this.dataLoaded() ? this.split().shown : []) : this.archivedItems(),
  );

  readonly olderOpen = signal(false);
  /** The Older notes sheet's filters: a kind (or all of them) and words. */
  readonly olderKind = signal<'all' | 'Note' | 'Page' | 'Flow'>('all');
  readonly olderQuery = signal('');
  /** The note open in the sheet. */
  readonly olderOpenId = signal<string | null>(null);
  /**
   * The notes whose detail is drawn: the open one, and one still sliding shut after another was opened. A detail
   * leaves once its own panel says it closed, at the end of the slide, so it never vanishes mid-way.
   */
  readonly olderRendered = signal<ReadonlySet<string>>(new Set());
  readonly older = computed(() => (this.dataLoaded() ? this.split().older : []));
  private readonly olderSummaries = computed(() => {
    const data = this.itemData();
    return this.older().map((item) => ({ item, ...summarize(item, data) }));
  });
  /** How many older notes there are of each kind, for the filter. */
  readonly olderCounts = computed(() => {
    const counts = { Note: 0, Page: 0, Flow: 0 };
    for (const note of this.olderSummaries()) {
      counts[note.kind]++;
    }
    return counts;
  });
  readonly olderGroups = computed(() => {
    const kind = this.olderKind();
    const words = this.olderQuery().trim().toLowerCase();
    return groupByMonth(
      this.olderSummaries().filter(
        (note) =>
          (kind === 'all' || note.kind === kind) &&
          (!words || `${note.label} ${note.excerpt}`.toLowerCase().includes(words)),
      ),
    );
  });

  /**
   * Search results as autocomplete rows on the Notes view: every note, archived ones included. The Archive view
   * filters its own grid instead.
   */
  readonly suggestions = toSignal(
    toObservable(this.view).pipe(
      switchMap((view) =>
        view === 'notes'
          ? combineLatest([this.dataService.getSearchResults(), this.store.select(selectItemDataEntities)])
          : of<[ArtBoardItem[], Dictionary<ItemData>]>([[], {}]),
      ),
      map(([items, data]) => searchSuggestions(items, data)),
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

  /** The rows a card spans (card-rows.ts): a page card left at its default height follows its excerpt. */
  rowsOf(item: ArtBoardItem): number {
    return cardRows(item, () => this.pageTextLength(item));
  }

  private pageTextLength(item: ArtBoardItem): number {
    const data = this.itemData()[item.id];
    return data ? pageMarkdownToText(data.data ?? '').length : 0;
  }

  /** The store already searched (fuse.js); the autocomplete shows every result it is given. */
  readonly matchAll = () => true;
  /** The search shortcut as this keyboard writes it; onKey takes both. */
  readonly searchKey = searchShortcut();

  private readonly minOrder = computed(() => {
    const items = this.boardItems();
    return items.length > 0 ? Math.min(...items.map((item) => item.gridPosition.order ?? 0)) : 0;
  });

  constructor() {
    toObservable(this.searchQuery).subscribe((query) => this.dataService.searchArtBoardItem(query));
    // Every note's text, for when each was last edited: the board shows the recent ones.
    this.store.dispatch(ItemDataActions.getAllItemData());
    this.deviceSync.sync();
    this.handleHomeActions();
    inject(DestroyRef).onDestroy(() => this.boardLoadedSubscription.unsubscribe());
  }

  /**
   * Home links here with `?new=note` (write a note), `?search=1` (search) or `?show=<id>` (a note picked in its search,
   * shown as one picked here); each runs once, then leaves the URL.
   */
  private handleHomeActions(): void {
    const params = this.route.snapshot.queryParamMap;
    if (params.has('new')) {
      const kind = params.get('new') === 'page' ? ExtensionId.Page : ExtensionId.TextNote;
      // The new note goes before the first one, so wait until the board has read its notes.
      this.boardLoaded.pipe(take(1)).subscribe(() => setTimeout(() => this.create(kind)));
    }
    if (params.has('search')) {
      afterNextRender(() => this.searchField()?.nativeElement.focus());
    }
    const show = params.get('show');
    if (show) {
      this.reveal(show);
      this.boardLoaded.pipe(take(1)).subscribe(() => this.highlight(show));
    }
    if (params.has('new') || params.has('search') || show) {
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  changeView(event: Event): void {
    const view = (event as CustomEvent<{ value: string }>).detail.value === 'archive' ? 'archive' : 'notes';
    this.showView(view);
  }

  private showView(view: BoardView): void {
    if (view === this.view()) {
      return;
    }
    this.query.set('');
    // A new note takes focus once, when it is created: not when its card is drawn again later.
    this.focusItemId.set(null);
    this.router.navigate([], { queryParams: { view: view === 'archive' ? 'archive' : null }, replaceUrl: true });
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
      // An archived one says so before it is read, as when it is opened from the Archive.
      this.router.navigate([route, id], found.boardId ? {} : { queryParams: { from: 'archive' } });
      return;
    }
    // An archived note comes back to the board, first; an older one is shown on it.
    if (!found.boardId) {
      this.dataService.restoreArtBoardItem(found);
    }
    this.reveal(id);
    this.highlight(id);
  }

  onNewMenu(event: Event): void {
    const value = (event as CustomEvent<MenuSelectEventDetail>).detail.value;
    this.create(value === 'page' ? ExtensionId.Page : value === 'flow' ? ExtensionId.Flow : ExtensionId.TextNote);
  }

  /** N for a note, P for a page, F for a flow (on the Notes view, where they land), when the keyboard is not busy in a field or an editor. */
  onKey(event: KeyboardEvent): void {
    // The settings sheet has the keyboard: N in it must not start a note behind it.
    if (this.settingsOpen()) {
      return;
    }
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
    // A held key repeats: one press, one note.
    if (!event.repeat) {
      this.create(kind);
    }
  }

  create(kind: ExtensionId): void {
    this.showView('notes');
    const defaults = structuredClone(noteDefaultProperties[kind]);
    // A new note starts on the paper (pad, ruling and colour) last picked for a note.
    const paper = kind === ExtensionId.TextNote ? latestNotePaper(this.boardItems()) : undefined;
    if (paper) {
      defaults.colorIndex = paper.colorIndex;
      for (const key of ['pad', 'paper'] as const) {
        if (paper.properties[key] !== undefined) {
          defaults.properties[key] = paper.properties[key];
        }
      }
    }
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

  archive(item: ArtBoardItem): void {
    if (this.focusItemId() === item.id) {
      this.focusItemId.set(null);
    }
    this.dataService.hideArtBoardItem(item);
  }

  /** Back to the board, and shown on it this session whatever its age. */
  restore(item: ArtBoardItem): void {
    this.dataService.restoreArtBoardItem(item);
    this.reveal(item.id);
  }

  /** Notes restored from the Archive view, one or several at once. */
  restoreMany(items: ArtBoardItem[]): void {
    for (const item of items) {
      this.restore(item);
    }
    const label =
      items.length === 1 ? `“${summarize(items[0], this.itemData()).label}” is` : `${items.length} notes are`;
    this.toasts()?.nativeElement.show({ message: `${label} back on the board`, duration: 4000, noIcon: true });
  }

  /** Notes deleted forever from the Archive view, once confirmed there. */
  removeMany(items: ArtBoardItem[]): void {
    for (const item of items) {
      this.removeNote(item);
    }
  }

  /** A page or a flow of the Archive, full screen; it says it is archived, and the way back leads to the Archive. */
  openArchived(item: ArtBoardItem): void {
    const route = FULL_SCREEN[item.extensionId];
    if (route) {
      this.router.navigate([route, item.id], { queryParams: { from: 'archive' } });
    }
  }

  /** An action from a tile's own menu, for a card that has no menu of its own (a page or a flow). */
  onTileMenu(item: ArtBoardItem, event: Event): void {
    const value = (event as CustomEvent<MenuSelectEventDetail>).detail.value;
    if (value === 'archive') {
      this.archive(item);
    } else if (value === 'restore') {
      this.restore(item);
    } else if (value === 'delete') {
      this.removeNote(item);
    } else if (value === 'pin') {
      this.pin(item);
    } else if (value === 'unpin') {
      this.unpin(item);
    }
  }

  /**
   * Pin a note: it stays on the board, first, until unpinned. From the Older notes sheet it comes back to the board,
   * lit up, with a message that can undo it.
   */
  pin(item: ArtBoardItem, fromOlder = false): void {
    const previous = item.gridPosition;
    // First of the pinned notes.
    this.dataService.updateArtBoardItem({
      ...item,
      starred: true,
      gridPosition: { ...item.gridPosition, order: this.minOrder() - 1 },
    });
    if (!fromOlder) {
      return;
    }
    this.olderOpen.set(false);
    this.olderOpenId.set(null);
    this.olderRendered.set(new Set());
    this.highlight(item.id);
    const toasts = this.toasts()?.nativeElement;
    if (toasts) {
      const id = toasts.show({
        message: `“${summarize(item, this.itemData()).label}” is pinned to the board`,
        actionLabel: 'Undo',
        actionPlacement: 'end',
        duration: 6000,
        noIcon: true,
      });
      this.undoes.set(id, () => {
        const current = this.boardItems().find((candidate) => candidate.id === item.id) ?? item;
        this.dataService.updateArtBoardItem({
          ...current,
          starred: false,
          gridPosition: { ...current.gridPosition, order: previous.order },
        });
      });
    }
  }

  /** Unpin a note. It stays on the board until the next visit, if it is not among the recent ones: not gone from under the pointer. */
  unpin(item: ArtBoardItem): void {
    this.reveal(item.id);
    this.dataService.updateArtBoardItem({ ...item, starred: false });
  }

  /** What each message's Undo does, by the message's id. */
  private readonly undoes = new Map<string, () => void>();

  onToastAction(event: Event): void {
    const { id } = (event as CustomEvent<{ id: string }>).detail;
    this.undoes.get(id)?.();
    this.undoes.delete(id);
  }

  onToastDismiss(event: Event): void {
    this.undoes.delete((event as CustomEvent<{ id: string }>).detail.id);
  }

  /** A note of the sheet opened or closed: only the open one's content is drawn. */
  onOlderToggle(note: NoteSummary, event: Event): void {
    const open = (event as ToggleEvent).newState === 'open';
    this.olderRendered.update((rendered) => {
      const next = new Set(rendered);
      if (open) {
        next.add(note.id);
      } else {
        next.delete(note.id);
      }
      return next;
    });
    if (open) {
      this.olderOpenId.set(note.id);
    } else if (this.olderOpenId() === note.id) {
      this.olderOpenId.set(null);
    }
  }

  onOlderKind(event: Event): void {
    const value = (event as CustomEvent<{ value: string }>).detail.value;
    this.olderKind.set(value === 'Note' || value === 'Page' || value === 'Flow' ? value : 'all');
  }

  onOlderSearch(event: Event): void {
    this.olderQuery.set((event as CustomEvent<SearchFieldSearchDetail>).detail.value);
  }

  /** Open a page or a flow of the sheet, full screen. */
  openOlder(item: ArtBoardItem): void {
    const route = FULL_SCREEN[item.extensionId];
    if (route) {
      this.router.navigate([route, item.id]);
    }
  }

  /** "Sep 24" this year, "Sep 24, 2025" before. */
  shortDate(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }),
    });
  }

  edited(iso: string): string {
    return editedLabel(iso);
  }

  paperColor(item: ArtBoardItem): string {
    return paperColorFor(item.colorIndex);
  }

  /** A note's markdown, for the sheet to show it on its paper. */
  olderText(id: string): string {
    return this.itemData()[id]?.data ?? '';
  }

  private reveal(id: string): void {
    if (!this.revealed().has(id)) {
      this.revealed.update((ids) => new Set([...ids, id]));
    }
  }

  /**
   * A card moved or resized: store the order and spans of the cards shown, so the arrangement survives a reload. They
   * take the order values they held between them (older-notes.ts), so the notes in the sheet keep their place.
   */
  onLayoutChange(event: Event): void {
    const { layout } = (event as CustomEvent<MasonryLayoutChangeDetail>).detail;
    const items = new Map(this.boardItems().map((item) => [item.id, item]));
    const orders = new Map(
      rearrange(layout.items.map((tile) => items.get(tile.id)).filter((item) => !!item)).map(({ item, order }) => [
        item.id,
        order,
      ]),
    );
    this.dataService.changeAllArtBoardItemPosition(
      layout.items.map((tile, index) => {
        const item = items.get(tile.id);
        return {
          artBoardItemId: tile.id,
          gridPosition: {
            order: orders.get(tile.id) ?? index,
            rows: item ? storedRows(item, tile.rows, () => this.pageTextLength(item)) : tile.rows,
            screenColumns: {
              Large: tile.columns.lg,
              Medium: tile.columns.md,
              Small: tile.columns.sm,
              XSmall: tile.columns.xs,
            },
          },
        };
      }),
    );
  }

  onScroll(): void {
    this.raised.set(window.scrollY > 0);
  }

  /**
   * Sync runs in the background, with nothing to show for it: on opening the board, and again each time the tab comes
   * back into view, which pulls in what other devices wrote meanwhile (chrome.storage brings most of it live already).
   */
  onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      this.deviceSync.sync();
    }
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  openSettings(): void {
    this.router.navigate([], { queryParams: { settings: 1 }, queryParamsHandling: 'merge' });
  }

  closeSettings(): void {
    this.router.navigate([], { queryParams: { settings: null }, queryParamsHandling: 'merge' });
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

  /**
   * Light the note up once it is on the board (a restored or pinned note renders a moment later); a page or a flow is
   * brought into view.
   */
  private highlight(id: string, attempts = 20): void {
    const card = this.cards().find((candidate) => candidate.item().id === id);
    const tile = document.querySelector<HTMLElement>(`ntm-board c2-masonry-item[item-id="${CSS.escape(id)}"]`);
    if (card) {
      card.highlight();
    } else if (tile) {
      tile.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (attempts > 0) {
      setTimeout(() => this.highlight(id, attempts - 1), 50);
    }
  }
}
