import { Injectable, Inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import { ItemDataActions, ItemDataApiActions } from '../actions';
import { StorageApi, itemDataKey, STORAGE_API } from '../../services/storage.api';
import { catchError, switchMap, map, debounceTime, mergeMap } from 'rxjs/operators';
import { of, asyncScheduler } from 'rxjs';
import { ItemData } from '../models';
import { createEmptyItemData, getCurrentDate } from '../../services/utils';

@Injectable()
export class ItemDataEffects {
  getItemData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ItemDataActions.getItemData),
      mergeMap(({ itemDataId }) => {
        return this.storageApi.get<ItemData>(itemDataKey(itemDataId)).pipe(
          map((itemData) => {
            if (itemData) {
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
          .set(itemDataKey(itemData.id), { ...itemData, ...{ createdDate: currentDate, modifiedDate: currentDate } })
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
        return this.storageApi
          .set(itemDataKey(itemData.id), { ...itemData, ...{ modifiedDate: getCurrentDate() } })
          .pipe(
            map(() => ItemDataApiActions.updateItemDataSuccess({ itemData })),
            catchError((error) => of(ItemDataApiActions.createItemDataFailure({ error })))
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

  constructor(private actions$: Actions, @Inject(STORAGE_API) private storageApi: StorageApi) {}
}
