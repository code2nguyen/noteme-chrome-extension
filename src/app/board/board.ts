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
import type { Menu, MenuSelectEventDetail } from '@c2n/components/menu';
import type { SearchFieldSearchDetail } from '@c2n/components/search-field';
import type { ToastRegion } from '@c2n/components/toast';
import { Dictionary } from '@ngrx/entity';
import { combineLatest, of, ReplaySubject } from 'rxjs';
import { distinctUntilChanged, filter, map, startWith, switchMap, take } from 'rxjs/operators';

import './board-elements';
import { ExtensionId } from '../extension-id';
import { latestNotePaper, noteDefaultProperties, paperColorFor } from '../note-config';
import { DataService } from '../services/data.service';
import { DeviceSyncService } from '../services/device-sync.service';
import { FULL_SCREEN, SearchSuggestion, searchShortcut, searchSuggestions } from '../services/search-results';
import { getCurrentDate, pageMarkdownToText, uuid } from '../services/utils';
import { ArtBoardItemApiActions, ItemDataActions } from '../store/actions';
import { ArtBoardItem, DEFAULT_BOARD_ID, ItemData } from '../store/models';
import { selectIsAllLoadedItemDatas, selectItemDataEntities, selectItemDatasLoadFailed } from '../store/reducers';
import { I18n } from '../i18n/i18n.service';
import type { MessageKey } from '../i18n/messages';
import { hasFeature } from '../settings/settings';
import { SettingsPanel } from '../settings/settings-panel';
import { SettingsService } from '../settings/settings.service';
import { ArchiveView } from './archive-view';
import { NoteCard } from './note-card';
import { FlowCard } from './flow-card';
import { cardRows, MIN_CARD_COLUMNS, minCardRows, storedRows } from './card-rows';
import { PageCard } from './page-card';
import { TodoCard } from './todo-card';
import { bringIntoView } from './bring-into-view';
import {
  countKinds,
  groupByMonth,
  isNoteKind,
  NoteKind,
  NoteSummary,
  rearrange,
  shortKindKey,
  splitBoard,
  summarize,
} from './older-notes';

type BoardView = 'notes' | 'archive';

/** Keys that start something new from anywhere on the board, as shown in the New menu. */
const NEW_KEYS: Record<string, ExtensionId> = {
  n: ExtensionId.TextNote,
  p: ExtensionId.Page,
  f: ExtensionId.Flow,
  t: ExtensionId.TodoList,
};

const TILE_LABELS: Record<ExtensionId, MessageKey> = {
  [ExtensionId.TextNote]: 'common.note',
  [ExtensionId.Page]: 'common.page',
  [ExtensionId.Flow]: 'common.flow',
  [ExtensionId.TodoList]: 'common.list',
};

/** The New menu's values. */
const NEW_KINDS: Record<string, ExtensionId> = {
  note: ExtensionId.TextNote,
  page: ExtensionId.Page,
  flow: ExtensionId.Flow,
  todo: ExtensionId.TodoList,
};

/**
 * Every note in one place, newest first. Quick notes and to-do lists are worked on right on their card; pages and
 * flows show a card and open full screen. Notes, pages, flows and lists put away land in the Archive view (`?view=archive`); the search on the
 * Notes view covers everything, archived or not.
 */
@Component({
  selector: 'ntm-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [ArchiveView, NoteCard, PageCard, FlowCard, TodoCard, RouterLink, SettingsPanel],
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
  private readonly i18n = inject(I18n);
  /** The app's locale as a stream, made once here: toObservable needs the injection context. */
  private readonly locale$ = toObservable(this.i18n.locale);
  readonly t = this.i18n.t;
  readonly shortKindKey = shortKindKey;
  private readonly settings = inject(SettingsService).settings;
  /** Plan is optional: its link shows only while it is switched on in Settings. */
  readonly planOn = computed(() => hasFeature(this.settings(), 'plan'));
  private readonly store = inject(Store);
  private readonly dataService = inject(DataService);
  private readonly deviceSync = inject(DeviceSyncService);
  private readonly cards = viewChildren(NoteCard);
  private readonly todoCards = viewChildren(TodoCard);
  private readonly searchField = viewChild<ElementRef<HTMLElement>>('searchField');
  private readonly toasts = viewChild<ElementRef<ToastRegion>>('toasts');
  private readonly newMenu = viewChild<ElementRef<Menu>>('newMenu');
  /** Opens or closes the New menu a moment after the mouse arrives or leaves; either cancels the other. */
  private newMenuTimer?: ReturnType<typeof setTimeout>;
  /** The New menu was opened by the mouse resting on it, not by a click. */
  private newMenuHovered = false;
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

  /**
   * What the Archive view shows: everything archived, oldest edit first, or what matches the search; `null` while it is
   * read, so the view never says the archive is empty before it knows.
   */
  private readonly archivedItems = toSignal<ArtBoardItem[] | null>(
    combineLatest([toObservable(this.view), toObservable(this.searchQuery)]).pipe(
      // Typing on the Notes view must not reload the archive, and the archive is only read once it is opened.
      map(([view, query]) => (view === 'archive' ? query : null)),
      distinctUntilChanged(),
      switchMap((query) => {
        if (query === null) {
          return of([]);
        }
        const items = query
          ? this.dataService.getSearchResults().pipe(map((items) => items.filter((item) => !item.boardId)))
          : this.dataService
              .getArchivedArtBoardItems()
              .pipe(
                map((items) =>
                  [...items].sort((a, b) =>
                    (a.dataModifiedDate || a.modifiedDate).localeCompare(b.dataModifiedDate || b.modifiedDate),
                  ),
                ),
              );
        return items.pipe(startWith(null));
      }),
    ),
    { initialValue: null },
  );

  protected readonly itemData = toSignal(this.store.select(selectItemDataEntities), { requireSync: true });
  /** Every note's stored text is read: each one's last edit is known, and with it which notes the board shows. */
  private readonly dataLoaded = toSignal(this.store.select(selectIsAllLoadedItemDatas), { initialValue: false });
  /** Reading the notes' text failed: the board shows every note rather than staying blank. */
  private readonly dataFailed = toSignal(this.store.select(selectItemDatasLoadFailed), { initialValue: false });
  /** Notes shown on the board on purpose this session, recent or not: picked in the search, or just unpinned. */
  private readonly revealed = signal<ReadonlySet<string>>(new Set());

  /** The board's notes split: pinned and recent ones on the board, the rest in the Older notes sheet. */
  private readonly split = computed(() => splitBoard(this.boardItems(), this.itemData(), this.revealed()));

  /**
   * Whether the view has what it shows: the Notes view waits for the notes' dates, or it would show them all first (or
   * gives up waiting when they cannot be read); the Archive waits for what is archived.
   */
  readonly ready = computed(() =>
    this.inNotesView() ? this.dataLoaded() || this.dataFailed() : this.archivedItems() !== null,
  );

  readonly items = computed(() => {
    if (!this.inNotesView()) {
      return this.archivedItems() ?? [];
    }
    if (this.dataLoaded()) {
      return this.split().shown;
    }
    // Without the notes' dates there is no telling recent from older: every note stays on the board.
    return this.dataFailed() ? this.boardItems() : [];
  });

  readonly olderOpen = signal(false);
  /** The Older notes sheet's filters: a kind (or all of them) and words. */
  readonly olderKind = signal<'all' | NoteKind>('all');
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
    return this.older().map((item) => ({ item, ...summarize(item, data, this.t) }));
  });
  /** How many older notes there are of each kind, for the filter. */
  readonly olderCounts = computed(() => countKinds(this.olderSummaries()));
  readonly olderGroups = computed(() => {
    const kind = this.olderKind();
    const words = this.olderQuery().trim().toLowerCase();
    return groupByMonth(
      this.olderSummaries().filter(
        (note) =>
          (kind === 'all' || note.kind === kind) &&
          (!words || `${note.label} ${note.excerpt}`.toLowerCase().includes(words)),
      ),
      this.i18n.locale(),
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
          ? combineLatest([
              this.dataService.getSearchResults(),
              this.store.select(selectItemDataEntities),
              this.dataService.selectArtBoardItemSearchLoading(),
              // In the language picked, again when it changes.
              this.locale$,
            ])
          : of<[ArtBoardItem[], Dictionary<ItemData>, boolean, string]>([[], {}, false, '']),
      ),
      // None while a search is pending: a quick pick must never open a match of the previous query.
      map(([items, data, loading, locale]) => (loading ? [] : searchSuggestions(items, data, this.t, locale))),
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

  /** The smallest a resize can leave a card (card-rows.ts). */
  readonly minRowsOf = minCardRows;
  readonly minCols = MIN_CARD_COLUMNS;

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
    inject(DestroyRef).onDestroy(() => {
      this.boardLoadedSubscription.unsubscribe();
      clearTimeout(this.newMenuTimer);
    });
    // A click on New once the mouse has opened the menu must not leave it shut.
    afterNextRender(() =>
      this.newMenu()?.nativeElement.addEventListener('click', (event) => this.keepNewMenuOpen(event), true),
    );
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

  /**
   * The New menu opens with the mouse resting on New (120ms, so passing over it does not) and closes 250ms after the
   * mouse has left both New and the menu, time enough to cross the gap between them. Touch and pen keep the tap.
   */
  hoverNewMenu(event: PointerEvent, inside: boolean): void {
    const menu = this.newMenu()?.nativeElement;
    if (!menu || event.pointerType !== 'mouse') {
      return;
    }
    clearTimeout(this.newMenuTimer);
    if (inside) {
      this.newMenuTimer = setTimeout(() => {
        if (!menu.open) {
          this.newMenuHovered = true;
          // The menu takes the focus as it opens, for the keyboard; opened by the mouse, it never keeps it: the focus
          // goes back where it was, so typing in a note goes on into the note, or nowhere, so a note about to take it
          // (a new one, the pointer resting where New appears after "+ Note" on Home) still can.
          const focused = deepActiveElement();
          menu.open = true;
          requestAnimationFrame(() => {
            if (focused && focused !== document.body) {
              focused.focus({ preventScroll: true });
            } else if (menu.contains(document.activeElement)) {
              (document.activeElement as HTMLElement).blur();
            }
          });
        }
      }, 120);
    } else if (this.newMenuHovered) {
      this.newMenuTimer = setTimeout(() => {
        // Closing hands the focus to New, for the keyboard; a menu the mouse opened leaves it where it was instead.
        const focused = deepActiveElement();
        menu.open = false;
        this.newMenuHovered = false;
        requestAnimationFrame(() => {
          if (focused && focused !== document.body && !menu.contains(focused)) {
            focused.focus({ preventScroll: true });
          } else if (menu.contains(document.activeElement)) {
            (document.activeElement as HTMLElement).blur();
          }
        });
      }, 250);
    }
  }

  /**
   * A click on New while the mouse holds the menu open keeps it open: the press already closed it (a click outside a
   * popover) and the menu's own handling may toggle it, so it is opened again once both are done.
   */
  private keepNewMenuOpen(event: MouseEvent): void {
    const menu = this.newMenu()?.nativeElement;
    const onTrigger = (event.target as Element).closest('[slot="trigger"]');
    if (onTrigger && !this.newMenuHovered) {
      // A click opens the menu before the pointer has rested on New: no hover is to open it again later.
      clearTimeout(this.newMenuTimer);
    }
    if (menu && this.newMenuHovered && onTrigger) {
      setTimeout(() => (menu.open = true));
    }
  }

  onNewMenu(event: Event): void {
    // A hover still waiting would open the menu again once it closes, and take the focus back from the new note.
    clearTimeout(this.newMenuTimer);
    this.newMenuHovered = false;
    const value = (event as CustomEvent<MenuSelectEventDetail>).detail.value;
    const kind = NEW_KINDS[value] ?? ExtensionId.TextNote;
    const menu = this.newMenu()?.nativeElement;
    if (!menu?.open) {
      this.create(kind);
      return;
    }
    // The menu hands the focus back to New as it closes, which would take it from the new note: create the note once
    // the menu has closed (or soon, should it not say so).
    let created = false;
    const createOnce = () => {
      if (!created) {
        created = true;
        menu.removeEventListener('toggle', onToggle);
        this.create(kind);
      }
    };
    const onToggle = (toggle: Event) => {
      if ((toggle as ToggleEvent).newState === 'closed') {
        setTimeout(createOnce);
      }
    };
    menu.addEventListener('toggle', onToggle);
    setTimeout(createOnce, 300);
  }

  /** N for a note, P for a page, F for a flow, T for a to-do list (on the Notes view, where they land), when the keyboard is not busy in a field or an editor. */
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
    // It lands first on the board: lit up and brought into view, as a note picked from the search results is.
    this.focusItemId.set(item.id);
    this.highlight(item.id);
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
    const title = items.length === 1 ? summarize(items[0], this.itemData(), this.t).label : '';
    this.toasts()?.nativeElement.show({
      message: this.t('board.toast.back', items.length, title),
      duration: 4000,
      noIcon: true,
    });
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
    } else if (value === 'delete') {
      this.removeNote(item);
    } else if (value === 'pin') {
      this.pin(item);
    } else if (value === 'unpin') {
      this.unpin(item);
    }
  }

  /**
   * Pin a note: it stays on the board until unpinned. On the board it stays where it is, so no other card moves. From
   * the Older notes sheet it comes back to the board first, lit up, with a message that can undo it.
   */
  pin(item: ArtBoardItem, fromOlder = false): void {
    if (!fromOlder) {
      this.dataService.updateArtBoardItem({ ...item, starred: true, starredDate: new Date().toISOString() });
      return;
    }
    const previous = item.gridPosition;
    this.dataService.updateArtBoardItem({
      ...item,
      starred: true,
      starredDate: new Date().toISOString(),
      gridPosition: { ...item.gridPosition, order: this.minOrder() - 1 },
    });
    this.olderOpen.set(false);
    this.olderOpenId.set(null);
    this.olderRendered.set(new Set());
    this.highlight(item.id);
    const toasts = this.toasts()?.nativeElement;
    if (toasts) {
      const id = toasts.show({
        message: this.t('board.toast.pinned', summarize(item, this.itemData(), this.t).label),
        actionLabel: this.t('common.undo'),
        actionPlacement: 'end',
        duration: 6000,
        noIcon: true,
      });
      this.undoes.set(id, () => {
        const current = this.boardItems().find((candidate) => candidate.id === item.id) ?? item;
        this.dataService.updateArtBoardItem({
          ...current,
          starred: false,
          starredDate: undefined,
          gridPosition: { ...current.gridPosition, order: previous.order },
        });
      });
    }
  }

  /** Unpin a note. It stays on the board until the next visit, if it is not among the recent ones: not gone from under the pointer. */
  unpin(item: ArtBoardItem): void {
    this.reveal(item.id);
    this.dataService.updateArtBoardItem({ ...item, starred: false, starredDate: undefined });
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
    this.olderKind.set(isNoteKind(value) ? value : 'all');
  }

  onOlderSearch(event: Event): void {
    this.olderQuery.set((event as CustomEvent<SearchFieldSearchDetail>).detail.value);
  }

  /** What a tile is called, for screen readers. */
  tileLabel(item: ArtBoardItem): string {
    return this.t(TILE_LABELS[item.extensionId] ?? 'common.note');
  }

  /** Whether a note opens full screen (a page or a flow), rather than being worked on on its card. */
  opensFullScreen(item: ArtBoardItem): boolean {
    return !!FULL_SCREEN[item.extensionId];
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
    return date.toLocaleDateString(this.i18n.locale(), {
      month: 'short',
      day: 'numeric',
      ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }),
    });
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
   * Light the note up once it is on the board (a restored, older or pinned note renders a moment later, later still
   * from chrome.storage): tried for up to 3s. A page or a flow is brought into view.
   */
  private highlight(id: string, attempts = 60): void {
    const card =
      this.cards().find((candidate) => candidate.item().id === id) ??
      this.todoCards().find((candidate) => candidate.item().id === id);
    const tile = document.querySelector<HTMLElement>(`ntm-board c2-masonry-item[item-id="${CSS.escape(id)}"]`);
    if (card) {
      card.highlight();
    } else if (tile) {
      bringIntoView(tile);
    } else if (attempts > 0) {
      setTimeout(() => this.highlight(id, attempts - 1), 50);
    }
  }
}

/** The focused element, inside the shadow roots it is in (a note's editor is in its c2-notepad's). */
function deepActiveElement(): HTMLElement | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active instanceof HTMLElement ? active : null;
}
