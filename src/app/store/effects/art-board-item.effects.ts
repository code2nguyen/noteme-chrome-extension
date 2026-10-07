import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { asyncScheduler, defer, EMPTY, forkJoin, from, iif, Observable, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  finalize,
  map,
  mergeMap,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';

import { ArtBoardItemActions, ArtBoardItemApiActions, ItemDataActions } from '../actions';
import {
  artBoardArtBoardItemIdsKey,
  artBoardItemIdsKey,
  artBoardItemKey,
  layoutSyncKey,
  STORAGE_API,
} from '../../services/storage.api';
import { ArtBoardItem } from '../models';
import { getCurrentDate, isNotNullOrUndefined, without } from '../../services/utils';
import { normalizeArtBoardItem } from '../../services/migration';
import { SearchService } from '../../services/search.service';
import { INSTANCE_ID } from '../../services/instance-id';
import { selectArtBoardItemById, selectIsAllLoadedArtBoardItems } from '../reducers';

@Injectable()
export class ArtBoardItemEffects {
  private readonly id = inject(INSTANCE_ID);
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly storageApi = inject(STORAGE_API);
  private readonly searchService = inject(SearchService);
  /** The end of the id-list change running now: see oneAtATime. */
  private idListChange: Promise<void> = Promise.resolve();

  loadArtBoardItems$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.loadArtBoardItems),
      switchMap(({ boardId }) =>
        this.storageApi.get<string[]>(artBoardArtBoardItemIdsKey(boardId)).pipe(
          mergeMap((artBoardItemIds) => this.readArtBoardItems(artBoardItemIds)),
          map((artBoardItems) => ArtBoardItemApiActions.loadArtBoardItemsSuccess({ artBoardItems })),
          catchError((error) => of(ArtBoardItemApiActions.loadArtBoardItemsFailure({ error }))),
        ),
      ),
    ),
  );

  createArtBoardItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.createArtBoardItem),
      mergeMap(({ artBoardItem }) => {
        if (!artBoardItem.boardId) {
          return EMPTY;
        }
        const boardId = artBoardItem.boardId;
        return this.oneAtATime(() =>
          forkJoin([
            this.storageApi.get<string[]>(artBoardArtBoardItemIdsKey(boardId)),
            this.storageApi.get<string[]>(artBoardItemIdsKey()),
          ]).pipe(
            mergeMap(([artBoardArtBoardItemIds, artBoardItemIds]) =>
              forkJoin([
                this.storageApi.set(artBoardArtBoardItemIdsKey(boardId), [
                  ...(artBoardArtBoardItemIds ?? []),
                  artBoardItem.id,
                ]),
                this.storageApi.set(artBoardItemIdsKey(), [...(artBoardItemIds ?? []), artBoardItem.id]),
                this.storageApi.set(artBoardItemKey(artBoardItem.id), {
                  ...artBoardItem,
                  silent: false,
                  sourceId: this.id,
                }),
              ]),
            ),
            map(() => ArtBoardItemApiActions.createArtBoardItemSuccess({ artBoardItem })),
            catchError((error) => of(ArtBoardItemApiActions.createArtBoardItemFailure({ error }))),
          ),
        );
      }),
    ),
  );

  updateArtBoardItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.updateArtBoardItem),
      mergeMap(({ artBoardItem }) =>
        this.storageApi
          .set(artBoardItemKey(artBoardItem.id), {
            ...artBoardItem,
            modifiedDate: getCurrentDate(),
            silent: false,
            sourceId: this.id,
          })
          .pipe(
            map(() => ArtBoardItemApiActions.updateArtBoardItemSuccess({ artBoardItem })),
            catchError((error) => of(ArtBoardItemApiActions.updateArtBoardItemFailure({ error }))),
          ),
      ),
    ),
  );

  updateAllArtBoardItemLayout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.updateAllArtBoardItemLayout),
      mergeMap(({ itemLayouts }) =>
        forkJoin(
          itemLayouts.map((item) =>
            this.store.select(selectArtBoardItemById(item.artBoardItemId)).pipe(
              take(1),
              mergeMap((artBoardItem) => {
                if (!artBoardItem) {
                  return of(null);
                }
                const updatedArtBoardItem: ArtBoardItem = {
                  ...artBoardItem,
                  gridPosition: item.gridPosition,
                  modifiedDate: getCurrentDate(),
                  silent: true,
                  sourceId: this.id,
                };
                return this.storageApi
                  .set(artBoardItemKey(artBoardItem.id), updatedArtBoardItem)
                  .pipe(map(() => updatedArtBoardItem));
              }),
            ),
          ),
        ).pipe(
          // Notify the other tabs that the layout changed.
          tap(() => this.storageApi.set(layoutSyncKey(), { time: new Date().getTime() }).subscribe()),
          map((artBoardItems) =>
            ArtBoardItemApiActions.updateAllArtBoardItemLayoutSuccess({
              artBoardItems: artBoardItems.filter(isNotNullOrUndefined),
            }),
          ),
          catchError((error) => of(ArtBoardItemApiActions.updateAllArtBoardItemLayoutFailure({ error }))),
        ),
      ),
    ),
  );

  deleteArtBoardItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.deleteArtBoardItem),
      mergeMap(({ boardId, artBoardItemId }) =>
        this.oneAtATime(() =>
          forkJoin([
            iif(() => !!boardId, this.storageApi.get<string[]>(artBoardArtBoardItemIdsKey(boardId!)), of([])),
            this.storageApi.get<string[]>(artBoardItemIdsKey()),
          ]).pipe(
            mergeMap(([artBoardArtBoardItemIds, artBoardItemIds]) =>
              forkJoin([
                iif(
                  () => !!boardId,
                  this.storageApi.set(
                    artBoardArtBoardItemIdsKey(boardId!),
                    without(artBoardArtBoardItemIds ?? [], artBoardItemId),
                  ),
                  of(null),
                ),
                this.storageApi.set(artBoardItemIdsKey(), without(artBoardItemIds ?? [], artBoardItemId)),
                this.storageApi.remove(artBoardItemKey(artBoardItemId)),
              ]),
            ),
            mergeMap(() =>
              of(
                ArtBoardItemApiActions.deleteArtBoardItemSuccess({ artBoardItemId }),
                ItemDataActions.deleteItemData({ itemDataId: artBoardItemId }),
              ),
            ),
            catchError((error) => of(ArtBoardItemApiActions.deleteArtBoardItemFailure({ artBoardItemId, error }))),
          ),
        ),
      ),
    ),
  );

  searchArtBoardItems$ = createEffect(({ debounce = 300, scheduler = asyncScheduler } = {}) =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.searchArtBoardItems),
      debounceTime(debounce, scheduler),
      switchMap(({ query }) => {
        if (query === '') {
          return of(ArtBoardItemApiActions.searchArtBoardItemsSuccess({ artBoardItems: [] }));
        }
        return this.searchService.search(query).pipe(
          mergeMap((artBoardItemIds) =>
            artBoardItemIds.length > 0 ? this.readArtBoardItems(artBoardItemIds) : of([]),
          ),
          map((artBoardItems) => ArtBoardItemApiActions.searchArtBoardItemsSuccess({ artBoardItems })),
          catchError((error) => of(ArtBoardItemApiActions.searchArtBoardItemsFailure({ error }))),
        );
      }),
    ),
  );

  hideArtBoardItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.hideArtBoardItem),
      mergeMap(({ boardId, artBoardItemId }) =>
        this.oneAtATime(() =>
          forkJoin([
            this.storageApi.get<string[]>(artBoardArtBoardItemIdsKey(boardId)),
            this.storageApi.get<ArtBoardItem>(artBoardItemKey(artBoardItemId)),
          ]).pipe(
            mergeMap(([artBoardItemIds, artBoardItem]) => {
              if (!artBoardItem) {
                return EMPTY;
              }
              const hiddenArtBoardItem: ArtBoardItem = {
                ...normalizeArtBoardItem(artBoardItem),
                boardId: undefined,
                archivedDate: new Date().toISOString(),
                silent: false,
                sourceId: this.id,
              };
              return forkJoin([
                this.storageApi.set(
                  artBoardArtBoardItemIdsKey(boardId),
                  without(artBoardItemIds ?? [], artBoardItemId),
                ),
                this.storageApi.set(artBoardItemKey(artBoardItemId), hiddenArtBoardItem),
              ]).pipe(map(() => hiddenArtBoardItem));
            }),
            map((artBoardItem) => ArtBoardItemApiActions.hideArtBoardItemSuccess({ artBoardItem })),
            catchError((error) => of(ArtBoardItemApiActions.hideArtBoardItemFailure({ error }))),
          ),
        ),
      ),
    ),
  );

  // First on the board, as a new note would be: before every card stored on it when the restore runs.
  showArtBoardItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.showArtBoardItem),
      mergeMap(({ boardId, artBoardItemId }) =>
        this.oneAtATime(() =>
          forkJoin([
            this.storageApi.get<string[]>(artBoardArtBoardItemIdsKey(boardId)),
            this.storageApi.get<ArtBoardItem>(artBoardItemKey(artBoardItemId)),
          ]).pipe(
            mergeMap(([artBoardItemIds, storedItem]) =>
              this.readArtBoardItems(artBoardItemIds).pipe(
                map((boardItems) => ({ artBoardItemIds, storedItem, boardItems })),
              ),
            ),
            mergeMap(({ artBoardItemIds, storedItem, boardItems }) => {
              if (!storedItem || storedItem.boardId === boardId) {
                return EMPTY;
              }
              const orders = boardItems.map((boardItem) => boardItem.gridPosition.order ?? 0);
              const order = orders.length > 0 ? Math.min(...orders) - 1 : 0;
              const { archivedDate: _archived, ...artBoardItem } = normalizeArtBoardItem(storedItem);
              const shownArtBoardItem: ArtBoardItem = {
                ...artBoardItem,
                boardId,
                restoredDate: new Date().toISOString(),
                gridPosition: { ...artBoardItem.gridPosition, order },
                silent: false,
                sourceId: this.id,
              };
              return forkJoin([
                this.storageApi.set(artBoardArtBoardItemIdsKey(boardId), [...(artBoardItemIds ?? []), artBoardItemId]),
                this.storageApi.set(artBoardItemKey(artBoardItemId), shownArtBoardItem),
              ]).pipe(map(() => shownArtBoardItem));
            }),
            map((artBoardItem) => ArtBoardItemApiActions.showArtBoardItemSuccess({ artBoardItem })),
            catchError((error) => of(ArtBoardItemApiActions.showArtBoardItemFailure({ error }))),
          ),
        ),
      ),
    ),
  );

  getAllArtBoardItems$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ArtBoardItemActions.getAllArtBoardItems),
      withLatestFrom(this.store.select(selectIsAllLoadedArtBoardItems)),
      switchMap(([, isAllLoaded]) => {
        if (isAllLoaded) {
          return EMPTY;
        }
        return this.storageApi.get<string[]>(artBoardItemIdsKey()).pipe(
          mergeMap((artBoardItemIds) => this.readArtBoardItems(artBoardItemIds)),
          map((artBoardItems) => ArtBoardItemApiActions.getAllArtBoardItemsSuccess({ artBoardItems })),
          catchError((error) => of(ArtBoardItemApiActions.getAllArtBoardItemsFailure({ error }))),
        );
      }),
    ),
  );

  /**
   * Create, delete, archive and restore read an id list, change it and write it back: two at once would each write
   * their own copy and drop the other's change (restoring two notes quickly would leave one off the board). They run
   * one after the other.
   */
  private oneAtATime<T>(change: () => Observable<T>): Observable<T> {
    return defer(() => {
      const previous = this.idListChange;
      let done!: () => void;
      this.idListChange = new Promise<void>((resolve) => (done = resolve));
      return from(previous).pipe(
        switchMap(change),
        finalize(() => done()),
      );
    });
  }

  private readArtBoardItems(artBoardItemIds: string[] | undefined): Observable<ArtBoardItem[]> {
    if (!artBoardItemIds || artBoardItemIds.length === 0) {
      return of([]);
    }
    return this.storageApi
      .get<ArtBoardItem>(artBoardItemIds.map((artBoardItemId) => artBoardItemKey(artBoardItemId)))
      .pipe(map((items) => items.filter(isNotNullOrUndefined).map((item) => normalizeArtBoardItem(item))));
  }
}
