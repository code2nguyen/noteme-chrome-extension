import { Injectable, Inject } from '@angular/core';
import { Observable, of, forkJoin, combineLatest } from 'rxjs';
import { STORAGE_API, StorageApi, itemDataIndexKey } from './storage.api';
import { filter, last, map, shareReplay, startWith, switchMap, take, withLatestFrom } from 'rxjs/operators';
import * as lunr from 'lunr';
import Fuse from 'fuse.js';

import { Store, select, ActionsSubject } from '@ngrx/store';
import {
  AppState,
  selectAllArtBoardItems,
  selectAllItemDatas,
  selectIsAllLoadedArtBoardItems,
  selectIsAllLoadedItemDatas,
} from '../store/reducers';
import { IndexableItemTypes, getText } from './utils';
import { ArtBoardItemActions, ItemDataActions, ItemDataApiActions } from '../store/actions';
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

  constructor(
    @Inject(STORAGE_API) private storageApi: StorageApi,
    private store: Store<AppState>,
    private actionsSubj: ActionsSubject
  ) {}

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

  private _getFuse(): Observable<Fuse<FuseDocument>> {
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
      take(1),
      map((items) => {
        const docs: FuseDocument[] = items
          .filter((item) => IndexableItemTypes.includes(item.dataType))
          .map((item) => ({
            id: item.id,
            text: getText(item.data, item.dataType),
          }));
        return new Fuse(docs, this.fuseOptions);
      }),
      switchMap((fuse) => {
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
      }),
      shareReplay(1)
    );
  }
}
