import { inject, Injectable } from '@angular/core';
import { ActionsSubject, Store } from '@ngrx/store';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { combineLatest, Observable } from 'rxjs';
import { filter, first, map, mergeMap, shareReplay, startWith, take } from 'rxjs/operators';

import { selectAllItemDatas, selectIsAllLoadedItemDatas } from '../store/reducers';
import { getText, IndexableItemTypes } from './utils';
import { ItemDataActions, ItemDataApiActions } from '../store/actions';
import { ItemData } from '../store/models';

interface FuseDocument {
  id: string;
  text: string;
}

const toDocument = (item: ItemData): FuseDocument => ({
  id: item.id,
  text: getText(item.data, item.dataType, item.properties),
});

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly store = inject(Store);
  private readonly actions$ = inject(ActionsSubject);
  private fuse$?: Observable<Fuse<FuseDocument>>;
  private readonly fuseOptions: IFuseOptions<FuseDocument> = {
    keys: ['text'],
    useExtendedSearch: true,
  };

  search(query: string): Observable<string[]> {
    this.fuse$ ??= this.createIndex().pipe(shareReplay(1));
    return this.fuse$.pipe(
      map((fuse) => fuse.search(query).map((result) => result.item.id)),
      take(1),
    );
  }

  private createIndex(): Observable<Fuse<FuseDocument>> {
    this.store.dispatch(ItemDataActions.getAllItemData());
    return combineLatest([this.store.select(selectAllItemDatas), this.store.select(selectIsAllLoadedItemDatas)]).pipe(
      filter(([, isAllLoaded]) => isAllLoaded),
      first(),
      map(
        ([items]) =>
          new Fuse(
            items.filter((item) => IndexableItemTypes.includes(item.dataType)).map(toDocument),
            this.fuseOptions,
          ),
      ),
      mergeMap((fuse) =>
        this.actions$.pipe(
          startWith({ type: 'initValue' }),
          map((action) => {
            if (action.type === ItemDataApiActions.createItemDataSuccess.type) {
              fuse.add(toDocument((action as ReturnType<typeof ItemDataApiActions.createItemDataSuccess>).itemData));
            } else if (action.type === ItemDataApiActions.deleteItemDataSuccess.type) {
              const { itemDataId } = action as ReturnType<typeof ItemDataApiActions.deleteItemDataSuccess>;
              fuse.remove((doc) => doc?.id === itemDataId);
            } else if (action.type === ItemDataApiActions.updateItemDataSuccess.type) {
              const { itemData } = action as ReturnType<typeof ItemDataApiActions.updateItemDataSuccess>;
              fuse.remove((doc) => doc?.id === itemData.id);
              fuse.add(toDocument(itemData));
            }
            return fuse;
          }),
        ),
      ),
    );
  }
}
