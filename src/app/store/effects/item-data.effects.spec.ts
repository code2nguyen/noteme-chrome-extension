// The effects class and NgRx's injectables are partially compiled: JIT finishes them outside an Angular build.
import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { Actions } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of, Subject } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { describe, expect, it } from 'vitest';
import type { Action } from '@ngrx/store';

import { ArtBoardItemActions, ArtBoardItemApiActions, ItemDataActions, ItemDataApiActions } from '../actions';
import { INSTANCE_ID } from '../../services/instance-id';
import { STORAGE_API, StorageApi } from '../../services/storage.api';
import { DataType } from '../models/data-type';
import { ItemDataEffects } from './item-data.effects';

/** The effects with a store that knows no item yet and a storage that records its writes. */
function setUp() {
  const actions = new Subject<Action>();
  const writes: string[] = [];
  const values: unknown[] = [];
  const storage = {
    set: (key: string, value: unknown) => (writes.push(key), values.push(value), of(undefined)),
  } as unknown as StorageApi;
  const injector = Injector.create({
    providers: [
      { provide: Actions, useValue: new Actions(actions) },
      { provide: Store, useValue: { select: () => of(undefined) } },
      { provide: STORAGE_API, useValue: storage },
      { provide: INSTANCE_ID, useValue: 'tab' },
    ],
  });
  const effects = runInInjectionContext(injector, () => new ItemDataEffects());
  return { actions, writes, values, effects };
}

describe('ItemDataEffects', () => {
  it('saves an edit once the typing pauses', () => {
    new TestScheduler((actual, expected) => expect(actual).toEqual(expected)).run(({ flush }) => {
      const { actions, writes, effects } = setUp();
      effects.updateItemData$.subscribe();
      actions.next(ItemDataActions.updateItemData({ itemData: { id: 'a', data: 'Hi', dataType: DataType.PAGE } }));
      flush();
      expect(writes).toEqual(['ITEM_DATA__a']);
    });
  });

  it('drops an edit still waiting to be saved when its item is deleted', () => {
    new TestScheduler((actual, expected) => expect(actual).toEqual(expected)).run(({ flush }) => {
      const { actions, writes, effects } = setUp();
      effects.trackDeletions$.subscribe();
      effects.updateItemData$.subscribe();
      actions.next(
        ItemDataActions.updateItemData({ itemData: { id: 'a', data: 'Short-lived', dataType: DataType.PAGE } }),
      );
      actions.next(ItemDataActions.updateItemData({ itemData: { id: 'b', data: 'Kept', dataType: DataType.PAGE } }));
      actions.next(ArtBoardItemActions.deleteArtBoardItem({ boardId: 'board', artBoardItemId: 'a' }));
      flush();
      expect(writes).toEqual(['ITEM_DATA__b']);
    });
  });

  it('merges the edits made to one item within the window into one write', () => {
    new TestScheduler((actual, expected) => expect(actual).toEqual(expected)).run(({ flush }) => {
      const { actions, writes, values, effects } = setUp();
      effects.updateItemData$.subscribe();
      actions.next(ItemDataActions.updateItemData({ itemData: { id: 'a', data: 'Body', dataType: DataType.PAGE } }));
      actions.next(ItemDataActions.updateItemData({ itemData: { id: 'a', properties: { title: 'Title' } } }));
      flush();
      expect(writes).toEqual(['ITEM_DATA__a']);
      expect(values[0]).toMatchObject({ id: 'a', data: 'Body', properties: { title: 'Title' } });
    });
  });

  it('drops an edit still waiting to be saved when its item is deleted elsewhere', () => {
    new TestScheduler((actual, expected) => expect(actual).toEqual(expected)).run(({ flush }) => {
      const { actions, writes, effects } = setUp();
      effects.trackDeletions$.subscribe();
      effects.updateItemData$.subscribe();
      actions.next(
        ItemDataActions.updateItemData({ itemData: { id: 'a', data: 'Late', dataType: DataType.MARKDOWN } }),
      );
      actions.next(
        ItemDataActions.updateItemData({ itemData: { id: 'b', data: 'Late', dataType: DataType.MARKDOWN } }),
      );
      actions.next(ArtBoardItemApiActions.deleteArtBoardItemSuccess({ artBoardItemId: 'a' }));
      actions.next(ItemDataApiActions.deleteItemDataSuccess({ itemDataId: 'b' }));
      flush();
      expect(writes).toEqual([]);
    });
  });

  it('saves edits again when the item could not be deleted', () => {
    new TestScheduler((actual, expected) => expect(actual).toEqual(expected)).run(({ flush }) => {
      const { actions, writes, effects } = setUp();
      effects.trackDeletions$.subscribe();
      effects.trackFailedDeletions$.subscribe();
      effects.updateItemData$.subscribe();
      actions.next(ArtBoardItemActions.deleteArtBoardItem({ boardId: 'board', artBoardItemId: 'a' }));
      actions.next(ArtBoardItemApiActions.deleteArtBoardItemFailure({ artBoardItemId: 'a', error: new Error('full') }));
      actions.next(ItemDataActions.updateItemData({ itemData: { id: 'a', data: 'Kept', dataType: DataType.PAGE } }));
      flush();
      expect(writes).toEqual(['ITEM_DATA__a']);
    });
  });
});
