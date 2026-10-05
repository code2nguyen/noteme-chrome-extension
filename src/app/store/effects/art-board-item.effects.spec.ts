// The effects class and NgRx's injectables are partially compiled: JIT finishes them outside an Angular build.
import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { Actions } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { firstValueFrom, from, of, Subject } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { describe, expect, it } from 'vitest';
import type { Action } from '@ngrx/store';

import { ArtBoardItemActions, ArtBoardItemApiActions } from '../actions';
import { INSTANCE_ID } from '../../services/instance-id';
import { SearchService } from '../../services/search.service';
import {
  artBoardArtBoardItemIdsKey,
  artBoardItemIdsKey,
  artBoardItemKey,
  STORAGE_API,
  StorageApi,
} from '../../services/storage.api';
import { ExtensionId } from '../../extension-id';
import { ArtBoardItem, DEFAULT_BOARD_ID } from '../models';
import { ArtBoardItemEffects } from './art-board-item.effects';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve));

const note = (id: string, order: number, boardId?: string): ArtBoardItem => ({
  id,
  boardId,
  extensionId: ExtensionId.TextNote,
  colorIndex: 0,
  properties: {},
  modifiedDate: '2026-01-01T00:00:00.000Z',
  gridPosition: { order, rows: 10, screenColumns: { Large: 3, Medium: 3, Small: 3, XSmall: 1 } },
});

/** A note as a restore stores it and hands it to the store. */
const shownItem = (id: string, order: number): ArtBoardItem => ({
  ...note(id, order, DEFAULT_BOARD_ID),
  silent: false,
  sourceId: 'tab',
});

/** The effects over a storage that answers asynchronously, as chrome.storage does. */
function setUp(records: Record<string, unknown>) {
  const actions = new Subject<Action>();
  const read = async (key: string | string[]) => {
    await tick();
    return Array.isArray(key) ? key.map((k) => structuredClone(records[k])) : structuredClone(records[key]);
  };
  const storage = {
    get: (key: string | string[]) => from(read(key)),
    set: (key: string, value: unknown) => from(tick().then(() => void (records[key] = structuredClone(value)))),
    remove: (key: string) => from(tick().then(() => void delete records[key])),
  } as unknown as StorageApi;
  const injector = Injector.create({
    providers: [
      { provide: Actions, useValue: new Actions(actions) },
      { provide: Store, useValue: { select: () => of(undefined) } },
      { provide: STORAGE_API, useValue: storage },
      { provide: SearchService, useValue: {} },
      { provide: INSTANCE_ID, useValue: 'tab' },
    ],
  });
  const effects = runInInjectionContext(injector, () => new ArtBoardItemEffects());
  return { actions, effects, records };
}

describe('ArtBoardItemEffects', () => {
  it('restores two notes at once: both stay on the board, first, in the order they were restored', async () => {
    const { actions, effects, records } = setUp({
      [artBoardArtBoardItemIdsKey(DEFAULT_BOARD_ID)]: ['kept'],
      [artBoardItemIdsKey()]: ['kept', 'a', 'b'],
      [artBoardItemKey('kept')]: note('kept', 4, DEFAULT_BOARD_ID),
      [artBoardItemKey('a')]: note('a', 9),
      [artBoardItemKey('b')]: note('b', 9),
    });
    const shown = firstValueFrom(effects.showArtBoardItem$.pipe(take(2), toArray()));
    actions.next(ArtBoardItemActions.showArtBoardItem({ boardId: DEFAULT_BOARD_ID, artBoardItemId: 'a' }));
    actions.next(ArtBoardItemActions.showArtBoardItem({ boardId: DEFAULT_BOARD_ID, artBoardItemId: 'b' }));

    // What the store is given: each on the board, first, the second before the first.
    expect(await shown).toEqual([
      ArtBoardItemApiActions.showArtBoardItemSuccess({ artBoardItem: shownItem('a', 3) }),
      ArtBoardItemApiActions.showArtBoardItemSuccess({ artBoardItem: shownItem('b', 2) }),
    ]);

    expect(records[artBoardArtBoardItemIdsKey(DEFAULT_BOARD_ID)]).toEqual(['kept', 'a', 'b']);
    // Taken from the stored board, not from a store that may not have read it: before the card already there.
    expect((records[artBoardItemKey('a')] as ArtBoardItem).gridPosition.order).toBe(3);
    expect((records[artBoardItemKey('b')] as ArtBoardItem).gridPosition.order).toBe(2);
  });

  it('archives one note while another is restored without losing either change', async () => {
    const { actions, effects, records } = setUp({
      [artBoardArtBoardItemIdsKey(DEFAULT_BOARD_ID)]: ['kept', 'gone'],
      [artBoardItemKey('kept')]: note('kept', 0, DEFAULT_BOARD_ID),
      [artBoardItemKey('gone')]: note('gone', 1, DEFAULT_BOARD_ID),
      [artBoardItemKey('back')]: note('back', 5),
    });
    const hidden = firstValueFrom(effects.hideArtBoardItem$);
    const shown = firstValueFrom(effects.showArtBoardItem$);
    actions.next(ArtBoardItemActions.hideArtBoardItem({ boardId: DEFAULT_BOARD_ID, artBoardItemId: 'gone' }));
    actions.next(ArtBoardItemActions.showArtBoardItem({ boardId: DEFAULT_BOARD_ID, artBoardItemId: 'back' }));

    expect(await hidden).toEqual(
      ArtBoardItemApiActions.hideArtBoardItemSuccess({
        artBoardItem: { ...note('gone', 1), boardId: undefined, silent: false, sourceId: 'tab' },
      }),
    );
    // Before the card left on the board.
    expect(await shown).toEqual(
      ArtBoardItemApiActions.showArtBoardItemSuccess({ artBoardItem: shownItem('back', -1) }),
    );

    expect(records[artBoardArtBoardItemIdsKey(DEFAULT_BOARD_ID)]).toEqual(['kept', 'back']);
  });
});
