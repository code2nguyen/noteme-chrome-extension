import { Injectable, Inject } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { STORAGE_API, StorageApi } from './storage.api';
import { filter, first, map, mergeMap, shareReplay, startWith, take } from 'rxjs/operators';
import Fuse from 'fuse.js';

import { Store, select, ActionsSubject } from '@ngrx/store';
import { AppState, selectAllItemDatas, selectIsAllLoadedItemDatas } from '../store/reducers';
import { IndexableItemTypes, getText } from './utils';
import { ItemDataActions, ItemDataApiActions } from '../store/actions';
import { ItemData } from '../store/models';

interface FuseDocument {
  id: string;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private fuse$: Observable<Fuse<FuseDocument>>;
  private readonly fuseOptions: Fuse.IFuseOptions<FuseDocument> = {
    keys: ['text'],
    useExtendedSearch: true,
  };

  constructor(private store: Store<AppState>, private actionsSubj: ActionsSubject) {}

  search(query: string): Observable<string[]> {
    if (!this.fuse$) {
      this.fuse$ = this._getFuse();
    }

    return this.fuse$.pipe(
      map((fuse) => {
        return fuse.search(query).map((item: any) => item.item.id);
      }),
      take(1)
    );
  }

  private _getFuseForAllItems(): Observable<Fuse<FuseDocument>> {
    this.store.dispatch(ItemDataActions.getAllItemData());
    return combineLatest([
      this.store.pipe(select(selectAllItemDatas)),
      this.store.pipe(select(selectIsAllLoadedItemDatas)),
    ]).pipe(
      filter(([_, isAllLoaded]) => {
        return isAllLoaded;
      }),
      map(([items, _]) => {
        return items;
      }),
      first(),
      map((items) => {
        const docs: FuseDocument[] = items
          .filter((item) => IndexableItemTypes.includes(item.dataType))
          .map((item) => ({
            id: item.id,
            text: getText(item.data, item.dataType),
          }));
        return new Fuse(docs, this.fuseOptions);
      }),
      mergeMap((fuse) => {
        return this.actionsSubj.pipe(
          startWith({ type: 'initValue' }),
          filter((action) => {
            return (
              action.type === 'initValue' ||
              action.type === ItemDataApiActions.createItemDataSuccess.type ||
              action.type === ItemDataApiActions.deleteItemDataSuccess.type ||
              action.type === ItemDataApiActions.updateItemDataSuccess.type
            );
          }),
          map((action) => {
            if (action.type === ItemDataApiActions.createItemDataSuccess.type) {
              const item = (action as any).itemData as ItemData;
              fuse.add({
                id: item.id,
                text: getText(item.data, item.dataType),
              });
            }
            if (action.type === ItemDataApiActions.deleteItemDataSuccess.type) {
              const deleteItemId = (action as any).itemDataId as string;
              fuse.remove((item) => item && item.id === deleteItemId);
            }
            if (action.type === ItemDataApiActions.updateItemDataSuccess.type) {
              const updatedItem = (action as any).itemData as ItemData;
              fuse.remove((item) => item.id === updatedItem.id);
              fuse.add({
                id: updatedItem.id,
                text: getText(updatedItem.data, updatedItem.dataType),
              });
            }

            return fuse;
          })
        );
      })
    );
  }
  private _getFuse(): Observable<Fuse<FuseDocument>> {
    return this._getFuseForAllItems().pipe(shareReplay(1));
  }
}
