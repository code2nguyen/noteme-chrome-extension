import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { ArtBoardItemActions, ItemDataActions } from '../store/actions';
import { ArtBoardItem, DEFAULT_BOARD_ID, ItemData } from '../store/models';
import { ArtBoardItemPosition } from '../store/models/art-board-item-position';
import { DataType } from '../store/models/data-type';
import { GridPosition } from '../store/models/grid-position';
import {
  AppState,
  selectArtBoardItemById,
  selectArtBoardItemsByBoardId,
  selectArtBoardItemSearchResults,
  selectItemDataById,
} from '../store/reducers';
import { StorageApi } from './storage.api';
import { StoreSyncService } from './store-sync.service';

@Injectable({ providedIn: 'root' })
export class DataService {
  constructor(private store: Store<AppState>, private storeSync: StoreSyncService) {}

  get syncLayout(): Observable<void> {
    return this.storeSync.onLayoutChange;
  }

  getItemData(itemDataId: string): Observable<ItemData> {
    this.store.dispatch(ItemDataActions.getItemData({ itemDataId }));
    return this.store.pipe(select(selectItemDataById, { itemDataId })).pipe(filter((data) => !!data));
  }

  updateDataItem(itemDataId: string, data: any, dataType: DataType): void {
    this.store.dispatch(
      ItemDataActions.updateItemData({
        itemData: { id: itemDataId, data, empty: false, dataType },
      })
    );
  }

  getSearchResults(): Observable<ArtBoardItem[]> {
    return this.store.pipe(select(selectArtBoardItemSearchResults));
  }

  getArtBoardItems(boardId: string, force = true): Observable<ArtBoardItem[]> {
    if (force) {
      this.store.dispatch(ArtBoardItemActions.loadArtBoardItems({ boardId }));
    }
    return this.store.pipe(select(selectArtBoardItemsByBoardId, { boardId }));
  }

  getArtBoardItemById(artBoardItemId: string): Observable<ArtBoardItem> {
    return this.store.pipe(select(selectArtBoardItemById, { artBoardItemId }));
  }

  addArtBoardItem(artBoardItem: ArtBoardItem): void {
    this.store.dispatch(ArtBoardItemActions.createArtBoardItem({ artBoardItem }));
  }

  toggleArtBoardItemStarState(artBoardItem: ArtBoardItem): void {
    this.updateArtBoardItem({ ...artBoardItem, ...{ starred: !artBoardItem.starred } });
  }

  changeArtBoardItemPosition(artBoardItemId: string, position: GridPosition): void {
    this.getArtBoardItemById(artBoardItemId)
      .pipe(take(1))
      .subscribe((artBoardItem) => {
        this.updateArtBoardItem({ ...artBoardItem, ...{ gridPosition: position } });
      });
  }

  changeArtBoardItemColorIndex(artBoardItemId: string, colorIndex: number): void {
    this.getArtBoardItemById(artBoardItemId)
      .pipe(take(1))
      .subscribe((artBoardItem) => {
        this.updateArtBoardItem({ ...artBoardItem, ...{ colorIndex } });
      });
  }

  changeAllArtBoardItemPosition(artBoardItemsPositon: ArtBoardItemPosition[]): void {
    this.store.dispatch(ArtBoardItemActions.updateAllArtBoardItemLayout({ itemLayouts: artBoardItemsPositon }));
  }

  changeArtBoardItemProperties(properties: { [key: string]: any }, artBoardItem: ArtBoardItem): void {
    const boardProperties = { ...artBoardItem.properties, ...properties };
    this.updateArtBoardItem({ ...artBoardItem, ...{ properties: boardProperties } });
  }

  updateArtBoardItem(artBoardItem: ArtBoardItem): void {
    this.store.dispatch(ArtBoardItemActions.updateArtBoardItem({ artBoardItem }));
  }

  removeArtBoardItem(artBoardItem: ArtBoardItem): void {
    this.store.dispatch(
      ArtBoardItemActions.deleteArtBoardItem({ boardId: artBoardItem.boardId, artBoardItemId: artBoardItem.id })
    );
  }

  hideArtBoardItem(artBoardItem: ArtBoardItem): void {
    if (!artBoardItem.boardId) {
      return;
    }

    this.store
      .pipe(select(selectItemDataById, { itemDataId: artBoardItem.id }))
      .pipe(take(1))
      .subscribe((data) => {
        if (!data || data.empty) {
          this.removeArtBoardItem(artBoardItem);
        } else {
          this.store.dispatch(
            ArtBoardItemActions.hideArtBoardItem({ boardId: artBoardItem.boardId!, artBoardItemId: artBoardItem.id })
          );
        }
      });
  }

  showArtBoardItem(item: ArtBoardItem, order: number): void {
    this.store.dispatch(
      ArtBoardItemActions.showArtBoardItem({ boardId: DEFAULT_BOARD_ID, artBoardItemId: item.id, order })
    );
  }

  searchArtBoardItem(query: string): void {
    this.store.dispatch(ArtBoardItemActions.searchArtBoardItems({ query }));
  }
}
