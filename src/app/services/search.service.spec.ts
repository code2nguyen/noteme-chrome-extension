// The service and NgRx's injectables are partially compiled: JIT finishes them outside an Angular build.
import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActionsSubject, Store } from '@ngrx/store';
import { BehaviorSubject, firstValueFrom, map } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { selectAllItemDatas, selectIsAllLoadedItemDatas, selectItemDatasLoadFailed } from '../store/reducers';
import { ItemDataActions } from '../store/actions';
import { ItemData } from '../store/models';
import { DataType } from '../store/models/data-type';
import { SearchService } from './search.service';

const note = (id: string, data: string): ItemData => ({ id, data, dataType: DataType.MARKDOWN }) as ItemData;

/** The service over a store whose items and load flags the test sets. */
function setUp() {
  const state = new BehaviorSubject({ items: [] as ItemData[], isAllLoaded: false, failed: false });
  const dispatched: string[] = [];
  const store = {
    dispatch: (action: { type: string }) => void dispatched.push(action.type),
    select: (selector: unknown) =>
      state.pipe(
        map((value) =>
          selector === selectAllItemDatas
            ? value.items
            : selector === selectIsAllLoadedItemDatas
              ? value.isAllLoaded
              : selector === selectItemDatasLoadFailed
                ? value.failed
                : undefined,
        ),
      ),
  };
  const actions = new ActionsSubject();
  const injector = Injector.create({
    providers: [
      { provide: Store, useValue: store },
      { provide: ActionsSubject, useValue: actions },
    ],
  });
  const service = runInInjectionContext(injector, () => new SearchService());
  return { service, state, dispatched, actions };
}

describe('SearchService', () => {
  it('searches once every note is read', async () => {
    const { service, state } = setUp();
    const answer = firstValueFrom(service.search('milk'));
    state.next({ items: [note('a', 'Buy milk'), note('b', 'Call mum')], isAllLoaded: true, failed: false });
    expect(await answer).toEqual(['a']);
  });

  it('still answers when reading the notes failed, from those it has, and reads them again for the next search', async () => {
    const { service, state, dispatched, actions } = setUp();
    const answer = firstValueFrom(service.search('milk'));
    state.next({ items: [note('a', 'Buy milk')], isAllLoaded: false, failed: true });
    expect(await answer).toEqual(['a']);
    // That index follows no note changes: nothing is left listening once it answered.
    expect(actions.observed).toBe(false);

    await Promise.resolve();
    state.next({ items: [note('a', 'Buy milk'), note('b', 'Oat milk')], isAllLoaded: true, failed: false });
    expect((await firstValueFrom(service.search('milk'))).sort()).toEqual(['a', 'b']);
    expect(dispatched.filter((type) => type === ItemDataActions.getAllItemData.type)).toHaveLength(2);
  });
});
