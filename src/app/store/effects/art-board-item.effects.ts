import { Injectable, Inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import without from 'lodash/without';
import { mergeMap, catchError, switchMap, map, debounceTime, mapTo, withLatestFrom } from 'rxjs/operators';
import { forkJoin, of, iif, asyncScheduler, EMPTY, from } from 'rxjs';

import { ArtBoardItemActions, ArtBoardItemApiActions, ItemDataActions, ItemDataApiActions } from '../actions';
import {
  StorageApi,
  artBoardArtBoardItemIdsKey,
  artBoardItemKey,
  STORAGE_API,
  artBoardItemIdsKey,
  itemDataKey,
} from '../../services/storage.api';
import { ArtBoardItem } from '../models';
import { getCurrentDate, isNotNullOrUndefined, convertItemData } from '../../services/utils';
import { SearchService } from '../../services/search.service';
import { Store, select, Action } from '@ngrx/store';
import { AppState, selectItemDataById, selectIsAllLoadedArtBoardItems } from '../reducers';

@Injectable()
export class ArtBoardItemEffects {
  loadArtBoardItems$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.loadArtBoardItems),
      switchMap(({ boardId }) => {
        return this.storageApi.get<string[]>(artBoardArtBoardItemIdsKey(boardId)).pipe(
          mergeMap((artBoardItemIds) => {
            if (artBoardItemIds) {
              return this.storageApi.get<ArtBoardItem>(
                artBoardItemIds.map((artBoardItemId) => artBoardItemKey(artBoardItemId))
              );
            }
            return of([]);
          }),
          map((artBoardItems) => ArtBoardItemApiActions.loadArtBoardItemsSuccess({ artBoardItems })),
          catchError((error) => of(ArtBoardItemApiActions.loadArtBoardItemsFailure({ error })))
        );
      })
    )
  );

  createArtBoardItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.createArtBoardItem),
      mergeMap(({ artBoardItem }) => {
        if (!artBoardItem.boardId) {
          return EMPTY;
        }
        const boardId = artBoardItem.boardId;
        return forkJoin([
          this.storageApi.get<string[]>(artBoardArtBoardItemIdsKey(boardId)),
          this.storageApi.get<string[]>(artBoardItemIdsKey()),
        ]).pipe(
          mergeMap(([artBoardArtBoardItemIds, artBoardItemIds]) => {
            artBoardArtBoardItemIds = artBoardArtBoardItemIds ? artBoardArtBoardItemIds : [];
            artBoardItemIds = artBoardItemIds ? artBoardItemIds : [];
            return forkJoin([
              this.storageApi.set(artBoardArtBoardItemIdsKey(boardId), [...artBoardArtBoardItemIds, artBoardItem.id]),
              this.storageApi.set(artBoardItemIdsKey(), [...artBoardItemIds, artBoardItem.id]),
              this.storageApi.set(artBoardItemKey(artBoardItem.id), artBoardItem),
            ]);
          }),
          map(() => {
            return ArtBoardItemApiActions.createArtBoardItemSuccess({ artBoardItem });
          }),
          catchError((error) => {
            return of(ArtBoardItemApiActions.createArtBoardItemFailure({ error }));
          })
        );
      })
    )
  );

  updateArtBoardItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.updateArtBoardItem),
      mergeMap(({ artBoardItem }) => {
        return this.storageApi
          .set(artBoardItemKey(artBoardItem.id), { ...artBoardItem, ...{ modifiedDate: getCurrentDate() } })
          .pipe(
            map(() => ArtBoardItemApiActions.updateArtBoardItemSuccess({ artBoardItem })),
            catchError((error) => of(ArtBoardItemApiActions.updateArtBoardItemFailure({ error })))
          );
      })
    )
  );

  changeArtBoardItemType$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.changeArtBoardItemType),
      mergeMap(({ artBoardItem, changedDataType }) => {
        return of(null).pipe(
          withLatestFrom(this.store.pipe(select(selectItemDataById, { itemDataId: artBoardItem.id }))),
          mergeMap(([_, itemData]) => {
            const convertedItemData = itemData ? convertItemData(itemData, changedDataType) : null;
            return forkJoin([
              this.storageApi.set(artBoardItemKey(artBoardItem.id), {
                ...artBoardItem,
                ...{ modifiedDate: getCurrentDate() },
              }),
              iif(
                () => !!convertedItemData,
                this.storageApi.set(itemDataKey(convertedItemData!.id), {
                  ...convertedItemData,
                  ...{ modifiedDate: getCurrentDate(), dataType: changedDataType },
                }),
                of(null)
              ),
            ]).pipe(
              mergeMap(() => {
                const actions: Action[] = [ArtBoardItemApiActions.changeArtBoardItemTypeSuccess({ artBoardItem })];
                if (convertedItemData) {
                  actions.unshift(ItemDataApiActions.updateItemDataSuccess({ itemData: convertedItemData }));
                }
                return from(actions);
              }),
              catchError((error) => of(ArtBoardItemApiActions.changeArtBoardItemTypeFailure({ error })))
            );
          })
        );
      })
    )
  );

  deleteArtBoardItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.deleteArtBoardItem),
      mergeMap(({ boardId, artBoardItemId }) => {
        return forkJoin([
          iif(() => !!boardId, this.storageApi.get<string[]>(artBoardArtBoardItemIdsKey(boardId!)), of([])),
          this.storageApi.get<string[]>(artBoardItemIdsKey()),
        ]).pipe(
          mergeMap(([artBoardArtBoardItemIds, artBoardItemIds]) => {
            artBoardArtBoardItemIds = artBoardArtBoardItemIds ? artBoardArtBoardItemIds : [];
            artBoardItemIds = artBoardItemIds ? artBoardItemIds : [];
            return forkJoin([
              iif(
                () => !!boardId,
                this.storageApi.set(
                  artBoardArtBoardItemIdsKey(boardId!),
                  without(artBoardArtBoardItemIds, artBoardItemId)
                ),
                of(null)
              ),
              this.storageApi.set(artBoardItemIdsKey(), without(artBoardItemIds, artBoardItemId)),
              this.storageApi.remove(artBoardItemKey(artBoardItemId)),
            ]);
          }),
          mergeMap(() =>
            of(
              ArtBoardItemApiActions.deleteArtBoardItemSuccess({ artBoardItemId }),
              ItemDataActions.deleteItemData({ itemDataId: artBoardItemId })
            )
          ),
          catchError((error) => of(ArtBoardItemApiActions.deleteArtBoardItemFailure({ error })))
        );
      })
    )
  );

  seachArtBoarItems$ = createEffect(() => ({ debounce = 300, scheduler = asyncScheduler } = {}) =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.searchArtBoardItems),
      debounceTime(debounce, scheduler),
      switchMap(({ query }) => {
        if (query === '') {
          return EMPTY;
        }
        return this.searchService.search(query).pipe(
          mergeMap((artBoardItemIds) => {
            if (artBoardItemIds && artBoardItemIds.length > 0) {
              return this.storageApi.get<ArtBoardItem>(artBoardItemIds.map((id) => artBoardItemKey(id))).pipe(
                map((artBoardItems) =>
                  ArtBoardItemApiActions.searchArtBoardItemsSuccess({
                    artBoardItems: artBoardItems.filter(isNotNullOrUndefined),
                  })
                )
              );
            }
            return EMPTY;
          })
        );
      })
    )
  );

  hideArtBoardItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.hideArtBoardItem),
      mergeMap(({ boardId, artBoardItemId }) => {
        return forkJoin([
          this.storageApi.get<string[]>(artBoardArtBoardItemIdsKey(boardId)),
          this.storageApi.get<ArtBoardItem>(artBoardItemKey(artBoardItemId)),
        ]).pipe(
          mergeMap(([artBoardItemIds, artBoardItem]) => {
            artBoardItemIds = artBoardItemIds ? artBoardItemIds : [];
            if (!artBoardItem) {
              return EMPTY;
            }
            const hidedArtBoardItem = { ...artBoardItem, ...{ boardId: undefined } };
            return forkJoin([
              this.storageApi.set(artBoardArtBoardItemIdsKey(boardId), without(artBoardItemIds, artBoardItemId)),
              this.storageApi.set(artBoardItemKey(artBoardItemId), hidedArtBoardItem),
            ]).pipe(mapTo(hidedArtBoardItem));
          }),
          map((artBoardItem) => ArtBoardItemApiActions.hideArtBoardItemSuccess({ artBoardItem })),
          catchError((error) => of(ArtBoardItemApiActions.hideArtBoardItemFailure({ error })))
        );
      })
    )
  );

  showArtBoardItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.showArtBoardItem),
      mergeMap(({ boardId, artBoardItemId }) => {
        return forkJoin([
          this.storageApi.get<string[]>(artBoardArtBoardItemIdsKey(boardId)),
          this.storageApi.get<ArtBoardItem>(artBoardItemKey(artBoardItemId)),
        ]).pipe(
          mergeMap(([artBoardItemIds, artBoardItem]) => {
            artBoardItemIds = artBoardItemIds ? artBoardItemIds : [];
            if (!artBoardItem || artBoardItem.boardId === boardId) {
              return EMPTY;
            }
            const showArtBoardItem = { ...artBoardItem, ...{ boardId } };
            return forkJoin([
              this.storageApi.set(artBoardArtBoardItemIdsKey(boardId!), [...artBoardItemIds, artBoardItemId]),
              this.storageApi.set(artBoardItemKey(artBoardItemId), showArtBoardItem),
            ]).pipe(mapTo(showArtBoardItem));
          }),
          map((artBoardItem) => ArtBoardItemApiActions.showArtBoardItemSuccess({ artBoardItem })),
          catchError((error) => of(ArtBoardItemApiActions.showArtBoardItemFailure({ error })))
        );
      })
    )
  );

  getAllArtBoardItems$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.getAllArtBoardItems),
      withLatestFrom(this.store.pipe(select(selectIsAllLoadedArtBoardItems))),
      switchMap(([_, isAllLoaded]) => {
        if (isAllLoaded) {
          return EMPTY;
        }
        return this.storageApi.get<string[]>(artBoardItemIdsKey()).pipe(
          mergeMap((artBoardItemIds) => {
            if (artBoardItemIds) {
              return this.storageApi.get<ArtBoardItem>(
                artBoardItemIds.map((artBoardItemId) => artBoardItemKey(artBoardItemId))
              );
            }
            return of([]);
          }),
          map((artBoardItems) => ArtBoardItemApiActions.getAllArtBoardItemsSuccess({ artBoardItems })),
          catchError((error) => of(ArtBoardItemApiActions.getAllArtBoardItemsFailure({ error })))
        );
      })
    )
  );

  constructor(
    private actions$: Actions,
    private store: Store<AppState>,
    @Inject(STORAGE_API) private storageApi: StorageApi,
    private searchService: SearchService
  ) {}
}
