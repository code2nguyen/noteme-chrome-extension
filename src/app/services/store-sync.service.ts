import { Injectable, NgZone } from '@angular/core';
import { AppState } from '../store/reducers';
import { ActionsSubject, Store } from '@ngrx/store';
import { ArtBoardItemActions, ArtBoardItemApiActions, ItemDataApiActions } from '../store/actions';
import { layoutSyncKey } from './storage.api';
import { DEFAULT_BOARD_ID } from '../store/models';

@Injectable({ providedIn: 'root' })
export class StoreSyncService {
  constructor(private store: Store<AppState>, private actions$: ActionsSubject, private ngZone: NgZone) {}

  sync(key: string, newValue: any, oldValue: any): void {
    if (key.startsWith('ART_BOARD_ITEM__')) {
      if (!oldValue) {
        this.ngZone.run(() => {
          this.store.dispatch(ArtBoardItemApiActions.createArtBoardItemSuccess({ artBoardItem: newValue }));
        });
        return;
      }
      if (!newValue) {
        this.ngZone.run(() => {
          this.store.dispatch(ArtBoardItemApiActions.deleteArtBoardItemSuccess({ artBoardItemId: oldValue.id }));
        });
        return;
      }
      if (!newValue.silent) {
        this.ngZone.run(() => {
          this.store.dispatch(ArtBoardItemApiActions.updateArtBoardItemSuccess({ artBoardItem: newValue }));
        });
      }
    } else if (key.startsWith('ITEM_DATA__')) {
      if (!oldValue) {
        this.ngZone.run(() => {
          this.store.dispatch(ItemDataApiActions.createItemDataSuccess({ itemData: newValue }));
        });
        return;
      }
      if (!newValue) {
        this.ngZone.run(() => {
          this.store.dispatch(ItemDataApiActions.deleteItemDataSuccess({ itemDataId: oldValue.id }));
        });
        return;
      }
      this.ngZone.run(() => {
        this.store.dispatch(ItemDataApiActions.updateItemDataSuccess({ itemData: newValue }));
      });
    } else if (key === layoutSyncKey()) {
      this.loadArtBoardItems();
    }
  }

  private loadArtBoardItems(): void {
    this.ngZone.run(() => {
      this.store.dispatch(ArtBoardItemActions.loadArtBoardItems({ boardId: DEFAULT_BOARD_ID }));
    });
  }
}
