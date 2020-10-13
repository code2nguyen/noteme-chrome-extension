import { Injectable, Inject, APP_ID } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import { ItemDataActions, ItemDataApiActions } from '../actions';
import { StorageApi, itemDataKey, STORAGE_API, artBoardItemIdsKey } from '../../services/storage.api';
import { catchError, switchMap, map, debounceTime, mergeMap, withLatestFrom, take } from 'rxjs/operators';
import { of, asyncScheduler } from 'rxjs';
import { ItemData } from '../models';
import { convertItemData, createEmptyItemData, getCurrentDate, isNotNullOrUndefined } from '../../services/utils';
import { select, Store } from '@ngrx/store';
import { AppState, selectIsAllLoadedItemDatas, selectItemDataById } from '../reducers';
import { DataType } from '../models/data-type';
import { EMPTY } from 'rxjs';

@Injectable()
export class ItemDataEffects {
  getItemData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ItemDataActions.getItemData),
      mergeMap(({ itemDataId }) => {
        return this.storageApi.get<ItemData>(itemDataKey(itemDataId)).pipe(
          map((itemData) => {
            if (itemData) {
              itemData = convertItemData(itemData, DataType.DELTA);
              return ItemDataApiActions.getItemDataSuccess({ itemData });
            }
            return ItemDataApiActions.getItemDataSuccess({ itemData: createEmptyItemData(itemDataId) });
          }),
          catchError((error) => of(ItemDataApiActions.getItemDataFailure({ error })))
        );
      })
    )
  );

  createItemData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ItemDataActions.createItemData),
      mergeMap(({ itemData }) => {
        const currentDate = getCurrentDate();
        return this.storageApi
          .set(itemDataKey(itemData.id), {
            ...itemData,
            ...{ createdDate: currentDate, modifiedDate: currentDate, sourceId: this.ID },
          })
          .pipe(
            map(() => {
              return ItemDataApiActions.createItemDataSuccess({ itemData });
            }),
            catchError((error) => {
              return of(ItemDataApiActions.createItemDataFailure({ error }));
            })
          );
      })
    )
  );

  updateItemData$ = createEffect(({ debounce = 300, scheduler = asyncScheduler } = {}) =>
    this.actions$.pipe(
      ofType(ItemDataActions.updateItemData),
      debounceTime(debounce, scheduler),
      mergeMap(({ itemData }) => {
        return this.store.pipe(
          select(selectItemDataById, { itemDataId: itemData.id }),
          take(1),
          mergeMap((oldItemData) => {
            const updatedDataItem = {
              ...oldItemData,
              ...itemData,
              ...{ modifiedDate: getCurrentDate(), sourceId: this.ID },
            };
            return this.storageApi.set(itemDataKey(itemData.id), updatedDataItem).pipe(
              map(() => ItemDataApiActions.updateItemDataSuccess({ itemData: updatedDataItem })),
              catchError((error) => of(ItemDataApiActions.createItemDataFailure({ error })))
            );
          })
        );
      })
    )
  );

  deleteItemData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ItemDataActions.deleteItemData),
      mergeMap(({ itemDataId }) => {
        return this.storageApi.remove(itemDataKey(itemDataId)).pipe(
          map(() => ItemDataApiActions.deleteItemDataSuccess({ itemDataId })),
          catchError((error) => of(ItemDataApiActions.deleteItemDataFailure({ error })))
        );
      })
    )
  );

  getAllItemDatas$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ItemDataActions.getAllItemData),
      withLatestFrom(this.store.pipe(select(selectIsAllLoadedItemDatas))),
      switchMap(([_, isAllLoaded]) => {
        if (isAllLoaded) {
          return EMPTY;
        }
        return this.storageApi.get<string[]>(artBoardItemIdsKey()).pipe(
          mergeMap((itemDataIds) => {
            if (itemDataIds) {
              return this.storageApi.get<ItemData>(itemDataIds.map((itemDataId) => itemDataKey(itemDataId))).pipe(
                map((items) => {
                  return items.filter(isNotNullOrUndefined).map((item) => convertItemData(item, DataType.DELTA));
                })
              );
            }
            return of([]);
          }),
          map((itemDatas) => ItemDataApiActions.getAllItemDataSuccess({ itemDatas })),
          catchError((error) => of(ItemDataApiActions.getAllItemDataFailure({ error })))
        );
      })
    )
  );

  constructor(
    @Inject(APP_ID) private ID: string,
    private store: Store<AppState>,
    private actions$: Actions,
    @Inject(STORAGE_API) private storageApi: StorageApi
  ) {}
}
