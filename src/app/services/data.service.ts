import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { ArtBoardItemActions, ItemDataActions } from '../store/actions';
import { ArtBoardItem, DEFAULT_BOARD_ID, ItemData } from '../store/models';
import { ArtBoardItemPosition } from '../store/models/art-board-item-position';
import { GridPosition } from '../store/models/grid-position';
import {
  selectArchivedArtBoardItems,
  selectArtBoardItemById,
  selectArtBoardItemsByBoardId,
  selectArtBoardItemSearchLoading,
  selectArtBoardItemSearchResults,
  selectIsAllLoadedArtBoardItems,
  selectItemDataById,
} from '../store/reducers';
import { isNotNullOrUndefined } from './utils';

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly store = inject(Store);

  getItemData(itemDataId: string): Observable<ItemData> {
    this.store.dispatch(ItemDataActions.getItemData({ itemDataId }));
    return this.store.select(selectItemDataById(itemDataId)).pipe(filter(isNotNullOrUndefined));
  }

  updateDataItem(itemData: Partial<ItemData>): void {
    this.store.dispatch(ItemDataActions.updateItemData({ itemData }));
  }

  getSearchResults(): Observable<ArtBoardItem[]> {
    return this.store.select(selectArtBoardItemSearchResults);
  }

  selectArtBoardItemSearchLoading(): Observable<boolean> {
    return this.store.select(selectArtBoardItemSearchLoading);
  }

  getArtBoardItems(boardId: string, force = true): Observable<ArtBoardItem[]> {
    if (force) {
      this.store.dispatch(ArtBoardItemActions.loadArtBoardItems({ boardId }));
    }
    return this.store.select(selectArtBoardItemsByBoardId(boardId));
  }

  /** Read every note, on the board or not (a page opened by its link, or from the search). */
  loadAllArtBoardItems(): void {
    this.store.dispatch(ArtBoardItemActions.getAllArtBoardItems());
  }

  isAllArtBoardItemsLoaded(): Observable<boolean> {
    return this.store.select(selectIsAllLoadedArtBoardItems);
  }

  getArchivedArtBoardItems(): Observable<ArtBoardItem[]> {
    this.store.dispatch(ArtBoardItemActions.getAllArtBoardItems());
    return this.store.select(selectArchivedArtBoardItems);
  }

  getArtBoardItemById(artBoardItemId: string): Observable<ArtBoardItem | undefined> {
    return this.store.select(selectArtBoardItemById(artBoardItemId));
  }

  addArtBoardItem(artBoardItem: ArtBoardItem): void {
    this.store.dispatch(ArtBoardItemActions.createArtBoardItem({ artBoardItem }));
  }

  toggleArtBoardItemStarState(artBoardItem: ArtBoardItem): void {
    this.updateArtBoardItem({ ...artBoardItem, starred: !artBoardItem.starred });
  }

  changeArtBoardItemPosition(artBoardItemId: string, position: GridPosition): void {
    this.updateArtBoardItemById(artBoardItemId, { gridPosition: position });
  }

  changeArtBoardItemColorIndex(artBoardItemId: string, colorIndex: number): void {
    this.updateArtBoardItemById(artBoardItemId, { colorIndex });
  }

  changeAllArtBoardItemPosition(artBoardItemsPosition: ArtBoardItemPosition[]): void {
    this.store.dispatch(ArtBoardItemActions.updateAllArtBoardItemLayout({ itemLayouts: artBoardItemsPosition }));
  }

  changeArtBoardItemProperties(properties: Record<string, unknown>, artBoardItem: ArtBoardItem): void {
    this.updateArtBoardItem({ ...artBoardItem, properties: { ...artBoardItem.properties, ...properties } });
  }

  updateArtBoardItem(artBoardItem: ArtBoardItem): void {
    this.store.dispatch(ArtBoardItemActions.updateArtBoardItem({ artBoardItem }));
  }

  removeArtBoardItem(artBoardItem: ArtBoardItem): void {
    this.store.dispatch(
      ArtBoardItemActions.deleteArtBoardItem({ boardId: artBoardItem.boardId, artBoardItemId: artBoardItem.id }),
    );
  }

  hideArtBoardItem(artBoardItem: ArtBoardItem): void {
    const boardId = artBoardItem.boardId;
    if (!boardId) {
      return;
    }
    this.store
      .select(selectItemDataById(artBoardItem.id))
      .pipe(take(1))
      .subscribe((data) => {
        // An empty note is not worth archiving.
        if (!data || data.empty) {
          this.removeArtBoardItem(artBoardItem);
        } else {
          this.store.dispatch(ArtBoardItemActions.hideArtBoardItem({ boardId, artBoardItemId: artBoardItem.id }));
        }
      });
  }

  /**
   * Bring an archived note, page or flow back to the board, first, as a new one would be. The order is taken from the
   * stored board when the restore runs (art-board-item.effects.ts), not from the store, which may not have read the
   * board yet or may not hold another restore still being written.
   */
  restoreArtBoardItem(item: ArtBoardItem): void {
    this.store.dispatch(ArtBoardItemActions.showArtBoardItem({ boardId: DEFAULT_BOARD_ID, artBoardItemId: item.id }));
  }

  searchArtBoardItem(query: string): void {
    this.store.dispatch(ArtBoardItemActions.searchArtBoardItems({ query }));
  }

  private updateArtBoardItemById(artBoardItemId: string, changes: Partial<ArtBoardItem>): void {
    this.getArtBoardItemById(artBoardItemId)
      .pipe(take(1), filter(isNotNullOrUndefined))
      .subscribe((artBoardItem) => this.updateArtBoardItem({ ...artBoardItem, ...changes }));
  }
}
