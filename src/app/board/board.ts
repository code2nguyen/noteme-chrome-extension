import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import type { AutocompleteSelectEventDetail } from '@c2n/autocomplete';
import type { MasonryLayoutChangeDetail, MasonryLayoutSnapshot } from '@c2n/masonry';
import type { TabsSelectionChangeEventDetail } from '@c2n/tabs';
import { combineLatest, of } from 'rxjs';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';

import { ExtensionId } from '../extension-id';
import { DEFAULT_EXTENSION_ID, noteDefaultProperties } from '../note-config';
import { DataService } from '../services/data.service';
import { DeviceSyncService, SyncState } from '../services/device-sync.service';
import { getCurrentDate, getText, uuid } from '../services/utils';
import { Dictionary } from '@ngrx/entity';
import { ArtBoardItem, DEFAULT_BOARD_ID, ItemData } from '../store/models';
import { selectItemDataEntities } from '../store/reducers';
import { NoteCard } from './note-card';

type BoardTab = 'notes' | 'archive';

interface SearchSuggestion {
  id: string;
  label: string;
  description: string;
}

const PREVIEW_LENGTH = 80;

@Component({
  selector: 'ntm-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NoteCard],
  templateUrl: './board.html',
  styleUrl: './board.scss',
  host: {
    '(window:scroll)': 'onScroll()',
  },
})
export class Board {
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly dataService = inject(DataService);
  private readonly deviceSync = inject(DeviceSyncService);
  private readonly cards = viewChildren(NoteCard);

  readonly ExtensionId = ExtensionId;
  readonly SyncState = SyncState;

  readonly tab = signal<BoardTab>('notes');
  /** What the search field holds, as typed (binding it back trimmed would eat a space the user just typed). */
  readonly query = signal('');
  readonly searchQuery = computed(() => this.query().trim());
  readonly arranging = signal(false);
  readonly raised = signal(false);
  readonly focusItemId = signal<string | null>(null);
  readonly inNoteTab = computed(() => this.tab() === 'notes');

  readonly syncState = toSignal(this.deviceSync.syncState$, { requireSync: true });
  readonly searching = toSignal(this.dataService.selectArtBoardItemSearchLoading(), { initialValue: false });

  /** Notes of the board in layout order, or the archived notes (oldest edit first, or matching the search). */
  readonly items = toSignal(
    combineLatest([toObservable(this.tab), toObservable(this.searchQuery)]).pipe(
      // The query only matters on the Archive tab; typing on the Notes tab must not reload the board.
      map(([tab, query]) => [tab, tab === 'archive' ? query : ''] as const),
      distinctUntilChanged((a, b) => a[0] === b[0] && a[1] === b[1]),
      switchMap(([tab, query]) => {
        if (tab === 'notes') {
          return this.dataService
            .getArtBoardItems(DEFAULT_BOARD_ID)
            .pipe(map((items) => [...items].sort((a, b) => a.gridPosition.order - b.gridPosition.order)));
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

  /** Search results as autocomplete rows, only on the Notes tab (the Archive tab filters its own grid). */
  readonly suggestions = toSignal(
    toObservable(this.tab).pipe(
      switchMap((tab) =>
        tab === 'notes'
          ? combineLatest([this.dataService.getSearchResults(), this.store.select(selectItemDataEntities)])
          : of<[ArtBoardItem[], Dictionary<ItemData>]>([[], {}]),
      ),
      map(([items, data]) =>
        items.map((item): SearchSuggestion => {
          const itemData = data[item.id];
          const text = itemData ? getText(itemData.data, itemData.dataType) : '';
          const firstLine = text.split('\n').find((line) => line.trim()) ?? 'Empty note';
          const kind = item.extensionId === ExtensionId.CodeNote ? 'Code' : 'Text';
          const modified = new Date(item.dataModifiedDate || item.modifiedDate).toLocaleDateString();
          return {
            id: item.id,
            label: firstLine.length > PREVIEW_LENGTH ? firstLine.slice(0, PREVIEW_LENGTH) + '…' : firstLine,
            description: `${kind} note${item.boardId ? '' : ' · archived'} · ${modified}`,
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
      rows: item.gridPosition.rows,
      columns: {
        xs: item.gridPosition.screenColumns.XSmall,
        sm: item.gridPosition.screenColumns.Small,
        md: item.gridPosition.screenColumns.Medium,
        lg: item.gridPosition.screenColumns.Large,
      },
    })),
  }));

  /** The store already searched (fuse.js); the autocomplete shows every result it is given. */
  readonly matchAll = () => true;

  private readonly minOrder = computed(() => {
    const items = this.items();
    return this.inNoteTab() && items.length > 0 ? Math.min(...items.map((item) => item.gridPosition.order ?? 0)) : 0;
  });

  constructor() {
    toObservable(this.searchQuery).subscribe((query) => this.dataService.searchArtBoardItem(query));
    this.deviceSync.sync();
  }

  changeTab(event: Event): void {
    const tab = (event as CustomEvent<TabsSelectionChangeEventDetail>).detail.value as BoardTab;
    this.tab.set(tab);
    this.query.set('');
    this.arranging.set(false);
  }

  search(event: Event): void {
    this.query.set((event as CustomEvent<{ query: string }>).detail.query);
  }

  selectSearchResult(event: Event): void {
    const { item } = (event as CustomEvent<AutocompleteSelectEventDetail>).detail;
    const id = (item as SearchSuggestion).id;
    const artBoardItem = this.findSearchResult(id);
    if (artBoardItem && !artBoardItem.boardId) {
      this.dataService.showArtBoardItem(artBoardItem, this.minOrder() - 1);
    }
    this.query.set('');
    this.highlight(id);
  }

  newNote(extensionId: ExtensionId = DEFAULT_EXTENSION_ID): void {
    const defaults = structuredClone(noteDefaultProperties[extensionId]);
    const item: ArtBoardItem = {
      ...defaults,
      id: uuid(),
      modifiedDate: getCurrentDate(),
      boardId: DEFAULT_BOARD_ID,
      gridPosition: { ...defaults.gridPosition, order: this.minOrder() - 1 },
    };
    this.dataService.addArtBoardItem(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.focusItemId.set(item.id);
  }

  toggleArchive(item: ArtBoardItem): void {
    if (this.inNoteTab()) {
      this.dataService.hideArtBoardItem(item);
    } else {
      this.dataService.showArtBoardItem(item, item.gridPosition?.order || 0);
    }
  }

  removeNote(item: ArtBoardItem): void {
    this.dataService.removeArtBoardItem(item);
  }

  onLayoutChange(event: Event): void {
    const { layout } = (event as CustomEvent<MasonryLayoutChangeDetail>).detail;
    this.dataService.changeAllArtBoardItemPosition(
      layout.items.map((tile, index) => ({
        artBoardItemId: tile.id,
        gridPosition: {
          order: index,
          rows: tile.rows,
          screenColumns: {
            Large: tile.columns.lg,
            Medium: tile.columns.md,
            Small: tile.columns.sm,
            XSmall: tile.columns.xs,
          },
        },
      })),
    );
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
