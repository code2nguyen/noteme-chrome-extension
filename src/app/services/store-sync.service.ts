import { Injectable } from '@angular/core';
import { AppState } from '../store/reducers';
import { Store } from '@ngrx/store';
import { ArtBoardItemApiActions, ItemDataApiActions } from '../store/actions';

@Injectable({ providedIn: 'root' })
export class StoreSyncService {
  constructor(private store: Store<AppState>) {}

  sync(key: string, newValue: any, oldValue: any): void {
    if (key.startsWith('ART_BOARD_ITEM__')) {
      if (!oldValue) {
        return this.store.dispatch(ArtBoardItemApiActions.createArtBoardItemSuccess({ artBoardItem: newValue }));
      }
      if (!newValue) {
        return this.store.dispatch(ArtBoardItemApiActions.deleteArtBoardItemSuccess({ artBoardItemId: oldValue.id }));
      }
      this.store.dispatch(ArtBoardItemApiActions.updateArtBoardItemSuccess({ artBoardItem: newValue }));
    } else if (key.startsWith('ITEM_DATA__')) {
      if (!oldValue) {
        return this.store.dispatch(ItemDataApiActions.createItemDataSuccess({ itemData: newValue }));
      }
      if (!newValue) {
        return this.store.dispatch(ItemDataApiActions.deleteItemDataSuccess({ itemDataId: oldValue.id }));
      }
      this.store.dispatch(ItemDataApiActions.updateItemDataSuccess({ itemData: newValue }));
    }
  }
}
