import { Injectable, Inject } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { STORAGE_API, StorageApi, itemDataIndexKey } from './storage.api';
import { map, take } from 'rxjs/operators';
import lunr from 'lunr';
import Fuse from 'fuse.js';

import { Store, select } from '@ngrx/store';
import { AppState, selectAllItemDatas } from '../store/reducers';
import { IndexableItemTypes, getText } from './utils';

interface FuseDocument {
  id: string;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private idx: lunr.Index | undefined;
  private readonly fuseOptions: Fuse.IFuseOptions<FuseDocument> = {
    keys: ['text'],
  };

  constructor(@Inject(STORAGE_API) private storageApi: StorageApi, private store: Store<AppState>) {}

  search(query: string): Observable<string[]> {
    return forkJoin({
      idx: this._getLunr(),
      fuse: this._getFuse(),
    }).pipe(
      map((searchTools) => {
        const lunrResults: string[] = searchTools.idx.search(query).map((i) => i.ref);
        const fuseResults = searchTools.fuse.search(query).map((item: any) => item.item.id);
        return Array.from(new Set([...lunrResults, ...fuseResults]));
      })
    );
  }

  private _getLunr(): Observable<lunr.Index> {
    if (this.idx) {
      return of(this.idx);
    }
    return this.storageApi.get(itemDataIndexKey()).pipe(
      map((dataIndexed) => {
        this.idx = lunr.Index.load(dataIndexed);
        return this.idx;
      }),
      take(1)
    );
  }

  private _getFuse(): Observable<Fuse<FuseDocument, Fuse.IFuseOptions<FuseDocument>>> {
    return this.store.pipe(
      select(selectAllItemDatas),
      map((items) => {
        const docs: FuseDocument[] = items
          .filter((item) => IndexableItemTypes.includes(item.dataType))
          .map((item) => ({
            id: item.id,
            text: getText(item.data, item.dataType),
          }));
        return new Fuse(docs, this.fuseOptions);
      }),
      take(1)
    );
  }
}
