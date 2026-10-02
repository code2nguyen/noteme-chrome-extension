import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { ArtBoardItemActions, ArtBoardItemApiActions, ItemDataApiActions } from '../store/actions';
import { layoutSyncKey } from './storage.api';
import { normalizeArtBoardItem, normalizeItemData } from './migration';
import { ArtBoardItem, DEFAULT_BOARD_ID, ItemData } from '../store/models';

/** Turns storage change events (another tab, another device) into store actions. */
@Injectable({ providedIn: 'root' })
export class StoreSyncService {
  private readonly store = inject(Store);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sync(key: string, newValue: any, oldValue: any): void {
    if (key.startsWith('ART_BOARD_ITEM__')) {
      if (!oldValue && newValue) {
        const artBoardItem = normalizeArtBoardItem(newValue as ArtBoardItem);
        this.store.dispatch(ArtBoardItemApiActions.createArtBoardItemSuccess({ artBoardItem }));
      } else if (!newValue && oldValue) {
        this.store.dispatch(ArtBoardItemApiActions.deleteArtBoardItemSuccess({ artBoardItemId: oldValue.id }));
      } else if (newValue && !newValue.silent) {
        const artBoardItem = normalizeArtBoardItem(newValue as ArtBoardItem);
        this.store.dispatch(ArtBoardItemApiActions.updateArtBoardItemSuccess({ artBoardItem }));
      }
    } else if (key.startsWith('ITEM_DATA__')) {
      if (!oldValue && newValue) {
        this.store.dispatch(
          ItemDataApiActions.createItemDataSuccess({ itemData: normalizeItemData(newValue as ItemData) }),
        );
      } else if (!newValue && oldValue) {
        this.store.dispatch(ItemDataApiActions.deleteItemDataSuccess({ itemDataId: oldValue.id }));
      } else if (newValue) {
        this.store.dispatch(
          ItemDataApiActions.updateItemDataSuccess({ itemData: normalizeItemData(newValue as ItemData) }),
        );
      }
    } else if (key === layoutSyncKey()) {
      this.store.dispatch(ArtBoardItemActions.loadArtBoardItems({ boardId: DEFAULT_BOARD_ID }));
    }
  }
}
