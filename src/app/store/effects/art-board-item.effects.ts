import { Injectable, Inject, APP_ID } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import without from 'lodash-es/without';
import { mergeMap, catchError, switchMap, map, debounceTime, mapTo, withLatestFrom, take, tap } from 'rxjs/operators';
import { forkJoin, of, iif, asyncScheduler, EMPTY, from } from 'rxjs';

import { ArtBoardItemActions, ArtBoardItemApiActions, ItemDataActions, ItemDataApiActions } from '../actions';
import {
  StorageApi,
  artBoardArtBoardItemIdsKey,
  artBoardItemKey,
  STORAGE_API,
  artBoardItemIdsKey,
  itemDataKey,
  layoutSyncKey,
} from '../../services/storage.api';
import { ArtBoardItem } from '../models';
import { getCurrentDate, isNotNullOrUndefined, convertItemData } from '../../services/utils';
import { SearchService } from '../../services/search.service';
import { Store, select, Action } from '@ngrx/store';
import { AppState, selectItemDataById, selectIsAllLoadedArtBoardItems, selectArtBoardItemById } from '../reducers';
import { ExtensionId } from '../../extension-id';
import { NBR_COLORS } from '../../extension-config';

@Injectable()
export class ArtBoardItemEffects {
  loadArtBoardItems$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.loadArtBoardItems),
      switchMap(({ boardId }) => {
        return this.storageApi.get<string[]>(artBoardArtBoardItemIdsKey(boardId)).pipe(
          mergeMap((artBoardItemIds) => {
            if (artBoardItemIds) {
              return this.storageApi
                .get<ArtBoardItem>(artBoardItemIds.map((artBoardItemId) => artBoardItemKey(artBoardItemId)))
                .pipe(
                  map((items) => {
                    return items.filter(isNotNullOrUndefined).map((item) => this.normalizeArtBoardItem(item));
                  })
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
              this.storageApi.set(artBoardItemKey(artBoardItem.id), {
                ...artBoardItem,
                silent: false,
                sourceId: this.ID,
              }),
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
          .set(artBoardItemKey(artBoardItem.id), {
            ...artBoardItem,
            ...{ modifiedDate: getCurrentDate(), silent: false, sourceId: this.ID },
          })
          .pipe(
            map(() => ArtBoardItemApiActions.updateArtBoardItemSuccess({ artBoardItem })),
            catchError((error) => of(ArtBoardItemApiActions.updateArtBoardItemFailure({ error })))
          );
      })
    )
  );

  updateAllArtBoardItemLayout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.updateAllArtBoardItemLayout),
      mergeMap(({ itemLayouts }) => {
        return forkJoin(
          itemLayouts.map((item) => {
            return this.store
              .pipe(select(selectArtBoardItemById, { artBoardItemId: item.artBoardItemId }), take(1))
              .pipe(
                mergeMap((artBoardItem) => {
                  const updatedArtBoardItem: ArtBoardItem = {
                    ...artBoardItem,
                    ...{ gridPosition: item.gridPosition },
                    ...{ modifiedDate: getCurrentDate() },
                    ...{ silent: true, sourceId: this.ID },
                  };
                  return this.storageApi
                    .set(artBoardItemKey(artBoardItem.id), updatedArtBoardItem)
                    .pipe(mapTo(updatedArtBoardItem));
                })
              );
          })
        ).pipe(
          tap(() => {
            // Notify layout sync
            this.storageApi.set(layoutSyncKey(), { time: new Date().getTime() });
          }),
          map(
            (artBoardItems) => {
              return ArtBoardItemApiActions.updateAllArtBoardItemLayoutSuccess({ artBoardItems });
            },
            catchError((error) => of(ArtBoardItemApiActions.updateAllArtBoardItemLayoutFailure({ error })))
          )
        );
      })
    )
  );

  // changeArtBoardItemType$ = createEffect(() =>
  //   this.actions$.pipe(
  //     ofType(ArtBoardItemActions.changeArtBoardItemType),
  //     mergeMap(({ artBoardItem, changedDataType }) => {
  //       return of(null).pipe(
  //         withLatestFrom(this.store.pipe(select(selectItemDataById, { itemDataId: artBoardItem.id }))),
  //         mergeMap(([_, itemData]) => {
  //           const convertedItemData = itemData ? convertItemData(itemData, changedDataType) : null;
  //           return forkJoin([
  //             this.storageApi.set(artBoardItemKey(artBoardItem.id), {
  //               ...artBoardItem,
  //               ...{ modifiedDate: getCurrentDate() },
  //             }),
  //             iif(
  //               () => !!convertedItemData,
  //               this.storageApi.set(itemDataKey(convertedItemData!.id), {
  //                 ...convertedItemData,
  //                 ...{ modifiedDate: getCurrentDate(), dataType: changedDataType },
  //               }),
  //               of(null)
  //             ),
  //           ]).pipe(
  //             mergeMap(() => {
  //               const actions: Action[] = [ArtBoardItemApiActions.changeArtBoardItemTypeSuccess({ artBoardItem })];
  //               if (convertedItemData) {
  //                 actions.unshift(ItemDataApiActions.updateItemDataSuccess({ itemData: convertedItemData }));
  //               }
  //               return from(actions);
  //             }),
  //             catchError((error) => of(ArtBoardItemApiActions.changeArtBoardItemTypeFailure({ error })))
  //           );
  //         })
  //       );
  //     })
  //   )
  // );

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
          return of(
            ArtBoardItemApiActions.searchArtBoardItemsSuccess({
              artBoardItems: [],
            })
          );
        }
        return this.searchService.search(query).pipe(
          mergeMap((artBoardItemIds) => {
            if (artBoardItemIds && artBoardItemIds.length > 0) {
              return this.storageApi.get<ArtBoardItem>(artBoardItemIds.map((id) => artBoardItemKey(id))).pipe(
                map((artBoardItems) =>
                  ArtBoardItemApiActions.searchArtBoardItemsSuccess({
                    artBoardItems: artBoardItems
                      .filter(isNotNullOrUndefined)
                      .map((item) => this.normalizeArtBoardItem(item)),
                  })
                )
              );
            }
            return of(
              ArtBoardItemApiActions.searchArtBoardItemsSuccess({
                artBoardItems: [],
              })
            );
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
            const hidedArtBoardItem = { ...artBoardItem, ...{ boardId: undefined, silent: false, sourceId: this.ID } };
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
      mergeMap(({ boardId, artBoardItemId, order }) => {
        return forkJoin([
          this.storageApi.get<string[]>(artBoardArtBoardItemIdsKey(boardId)),
          this.storageApi.get<ArtBoardItem>(artBoardItemKey(artBoardItemId)),
        ]).pipe(
          mergeMap(([artBoardItemIds, artBoardItem]) => {
            artBoardItemIds = artBoardItemIds ? artBoardItemIds : [];
            if (!artBoardItem || artBoardItem.boardId === boardId) {
              return EMPTY;
            }
            artBoardItem = this.normalizeArtBoardItem(artBoardItem);
            const showArtBoardItem = {
              ...artBoardItem,
              ...{ boardId, gridPosition: { ...artBoardItem.gridPosition, order, silent: false, sourceId: this.ID } },
            };
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
              return this.storageApi
                .get<ArtBoardItem>(artBoardItemIds.map((artBoardItemId) => artBoardItemKey(artBoardItemId)))
                .pipe(
                  map((items) => {
                    return items.filter(isNotNullOrUndefined).map((item) => this.normalizeArtBoardItem(item));
                  })
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

  // convert old version artBoardItem to new Grid ArtBoardItem.
  private normalizeArtBoardItem(artBoardItem: ArtBoardItem): ArtBoardItem {
    if (!artBoardItem) {
      return artBoardItem;
    }

    const defaultPosition = {
      order: 0,
      rows: 10,
      screenColumns: {
        Large: 3,
        Medium: 3,
        Small: 3,
        XSmall: 1,
      },
    };
    artBoardItem.gridPosition = artBoardItem.gridPosition
      ? { ...defaultPosition, ...artBoardItem.gridPosition }
      : { ...defaultPosition };
    artBoardItem.extensionId = artBoardItem.extensionId ?? ExtensionId.TextNote;
    artBoardItem.colorIndex = artBoardItem.colorIndex ?? Math.floor(Math.random() * NBR_COLORS);
    return artBoardItem;
  }

  constructor(
    @Inject(APP_ID) private ID: string,
    private actions$: Actions,
    private store: Store<AppState>,
    @Inject(STORAGE_API) private storageApi: StorageApi,
    private searchService: SearchService
  ) {}
}
