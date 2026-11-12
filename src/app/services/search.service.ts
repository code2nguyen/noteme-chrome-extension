import { inject, Injectable } from '@angular/core';
import { ActionsSubject, Store } from '@ngrx/store';
import type Fuse from 'fuse.js';
import { combineLatest, defer, Observable, of } from 'rxjs';
import { catchError, filter, first, map, mergeMap, shareReplay, startWith, take } from 'rxjs/operators';

import { selectAllItemDatas, selectIsAllLoadedItemDatas, selectItemDatasLoadFailed } from '../store/reducers';
import { SEARCH_OPTIONS, SearchDocument, toSearchDocument } from './search-index';
import { IndexableItemTypes } from './utils';
import { ItemDataActions, ItemDataApiActions } from '../store/actions';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly store = inject(Store);
  private readonly actions$ = inject(ActionsSubject);
  private fuse$?: Observable<Fuse<SearchDocument>>;

  search(query: string): Observable<string[]> {
    this.fuse$ ??= this.createIndex().pipe(shareReplay(1));
    return this.fuse$.pipe(
      map((fuse) => fuse.search(query).map((result) => result.item.id)),
      take(1),
    );
  }

  /**
   * The index of every note, once they are all read, kept up to date as notes change. If reading them fails, it is
   * built once from what was read, so a search still answers, and completes there: it follows no changes, and the
   * next search reads the notes again. fuse.js is read with the first search: a new tab that searches nothing never
   * loads it.
   */
  private createIndex(): Observable<Fuse<SearchDocument>> {
    this.store.dispatch(ItemDataActions.getAllItemData());
    return combineLatest([
      this.store.select(selectAllItemDatas),
      this.store.select(selectIsAllLoadedItemDatas),
      this.store.select(selectItemDatasLoadFailed),
      defer(() => import('fuse.js')),
    ]).pipe(
      filter(([, isAllLoaded, failed]) => isAllLoaded || failed),
      first(),
      mergeMap(([items, isAllLoaded, , { default: Fuse }]) => {
        const fuse = new Fuse(
          items.filter((item) => IndexableItemTypes.includes(item.dataType)).map(toSearchDocument),
          SEARCH_OPTIONS,
        );
        if (!isAllLoaded) {
          queueMicrotask(() => (this.fuse$ = undefined));
          return of(fuse);
        }
        return this.followChanges(fuse);
      }),
      // fuse.js not read: this search fails, the next one tries again.
      catchError((error: unknown) => {
        this.fuse$ = undefined;
        throw error;
      }),
    );
  }

  /** The index, updated as notes are created, edited and deleted. */
  private followChanges(fuse: Fuse<SearchDocument>): Observable<Fuse<SearchDocument>> {
    return this.actions$.pipe(
      startWith({ type: 'initValue' }),
      map((action) => {
        if (action.type === ItemDataApiActions.createItemDataSuccess.type) {
          fuse.add(toSearchDocument((action as ReturnType<typeof ItemDataApiActions.createItemDataSuccess>).itemData));
        } else if (action.type === ItemDataApiActions.deleteItemDataSuccess.type) {
          const { itemDataId } = action as ReturnType<typeof ItemDataApiActions.deleteItemDataSuccess>;
          fuse.remove((doc) => doc?.id === itemDataId);
        } else if (action.type === ItemDataApiActions.updateItemDataSuccess.type) {
          const { itemData } = action as ReturnType<typeof ItemDataApiActions.updateItemDataSuccess>;
          fuse.remove((doc) => doc?.id === itemData.id);
          fuse.add(toSearchDocument(itemData));
        }
        return fuse;
      }),
    );
  }
}
