import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { ArtBoardItemActions, ItemDataActions } from '../store/actions';
import { ArtBoardItem, DEFAULT_BOARD_ID, ItemData } from '../store/models';
import { DataType } from '../store/models/data-type';
import { AppState, selectArtBoardItemsByBoardId, selectItemDataById } from '../store/reducers';

@Injectable({ providedIn: 'root' })
export class DataService {
  constructor(private store: Store<AppState>) {}

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

  getArtBoardItems(boardId: string): Observable<ArtBoardItem[]> {
    this.store.dispatch(ArtBoardItemActions.loadArtBoardItems({ boardId }));
    return this.store.pipe(select(selectArtBoardItemsByBoardId, { boardId }));
  }

  addArtBoardItem(artBoardItem: ArtBoardItem): void {
    this.store.dispatch(ArtBoardItemActions.createArtBoardItem({ artBoardItem }));
  }

  toggleArtBoardItemStarState(artBoardItem: ArtBoardItem): void {
    this.updateArtBoardItem({ ...artBoardItem, ...{ starred: !artBoardItem.starred } });
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
}
