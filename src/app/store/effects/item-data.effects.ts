import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { asyncScheduler, EMPTY, of } from 'rxjs';
import {
  buffer,
  catchError,
  debounceTime,
  groupBy,
  map,
  mergeMap,
  switchMap,
  take,
  withLatestFrom,
} from 'rxjs/operators';

import { ItemDataActions, ItemDataApiActions } from '../actions';
import { artBoardItemIdsKey, itemDataKey, STORAGE_API } from '../../services/storage.api';
import { ItemData } from '../models';
import { createEmptyItemData, getCurrentDate, isNotNullOrUndefined } from '../../services/utils';
import { normalizeItemData } from '../../services/migration';
import { mergeItemDataUpdates } from '../item-data-updates';
import { INSTANCE_ID } from '../../services/instance-id';
import { selectIsAllLoadedItemDatas, selectItemDataById } from '../reducers';

@Injectable()
export class ItemDataEffects {
  private readonly id = inject(INSTANCE_ID);
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly storageApi = inject(STORAGE_API);

  getItemData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ItemDataActions.getItemData),
      mergeMap(({ itemDataId }) =>
        this.storageApi.get<ItemData>(itemDataKey(itemDataId)).pipe(
          map((itemData) =>
            ItemDataApiActions.getItemDataSuccess({
              itemData: itemData ? normalizeItemData(itemData) : createEmptyItemData(itemDataId),
            }),
          ),
          catchError((error) => of(ItemDataApiActions.getItemDataFailure({ error }))),
        ),
      ),
    ),
  );

  createItemData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ItemDataActions.createItemData),
      mergeMap(({ itemData }) => {
        const currentDate = getCurrentDate();
        return this.storageApi
          .set(itemDataKey(itemData.id), {
            ...itemData,
            createdDate: currentDate,
            modifiedDate: currentDate,
            sourceId: this.id,
          })
          .pipe(
            map(() => ItemDataApiActions.createItemDataSuccess({ itemData })),
            catchError((error) => of(ItemDataApiActions.createItemDataFailure({ error }))),
          );
      }),
    ),
  );

  // Debounced per note, and every partial update made within the window is merged: keeping only the last one would
  // drop the code typed just before a language change (and, with one debounce for all notes as in 2.x, an edit to
  // one note made within 300ms of an edit to another).
  updateItemData$ = createEffect(({ debounce = 300, scheduler = asyncScheduler } = {}) =>
    this.actions$.pipe(
      ofType(ItemDataActions.updateItemData),
      map(({ itemData }) => itemData),
      groupBy((itemData) => itemData.id),
      mergeMap((updates$) =>
        updates$.pipe(
          buffer(updates$.pipe(debounceTime(debounce, scheduler))),
          map(mergeItemDataUpdates),
          mergeMap((itemData) =>
            this.store.select(selectItemDataById(itemData.id!)).pipe(
              take(1),
              mergeMap((oldItemData) => {
                const updatedDataItem = {
                  ...oldItemData,
                  ...itemData,
                  properties: { ...oldItemData?.properties, ...itemData.properties },
                  empty: false,
                  modifiedDate: getCurrentDate(),
                  sourceId: this.id,
                } as ItemData;
                return this.storageApi.set(itemDataKey(updatedDataItem.id), updatedDataItem).pipe(
                  map(() => ItemDataApiActions.updateItemDataSuccess({ itemData: updatedDataItem })),
                  catchError((error) => of(ItemDataApiActions.updateItemDataFailure({ error }))),
                );
              }),
            ),
          ),
        ),
      ),
    ),
  );

  deleteItemData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ItemDataActions.deleteItemData),
      mergeMap(({ itemDataId }) =>
        this.storageApi.remove(itemDataKey(itemDataId)).pipe(
          map(() => ItemDataApiActions.deleteItemDataSuccess({ itemDataId })),
          catchError((error) => of(ItemDataApiActions.deleteItemDataFailure({ error }))),
        ),
      ),
    ),
  );

  getAllItemDatas$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ItemDataActions.getAllItemData),
      withLatestFrom(this.store.select(selectIsAllLoadedItemDatas)),
      switchMap(([, isAllLoaded]) => {
        if (isAllLoaded) {
          return EMPTY;
        }
        return this.storageApi.get<string[]>(artBoardItemIdsKey()).pipe(
          mergeMap((itemDataIds) =>
            itemDataIds && itemDataIds.length > 0
              ? this.storageApi
                  .get<ItemData>(itemDataIds.map((itemDataId) => itemDataKey(itemDataId)))
                  .pipe(map((items) => items.filter(isNotNullOrUndefined).map(normalizeItemData)))
              : of([]),
          ),
          map((itemDatas) => ItemDataApiActions.getAllItemDataSuccess({ itemDatas })),
          catchError((error) => of(ItemDataApiActions.getAllItemDataFailure({ error }))),
        );
      }),
    ),
  );
}
