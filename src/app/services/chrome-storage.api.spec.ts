// The storage class is partially compiled: JIT finishes it outside an Angular build.
import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExtensionId } from '../extension-id';
import { DataType } from '../store/models/data-type';
import { ChromeStorageApi } from './chrome-storage.api';
import { INSTANCE_ID } from './instance-id';
import { StoreSyncService } from './store-sync.service';

/** A storage area that keeps its records in a map. */
function area(records: Record<string, string> = {}) {
  return {
    records,
    get: async (keys: string | string[] | null) => {
      const wanted = keys === null ? Object.keys(records) : Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(wanted.filter((key) => key in records).map((key) => [key, records[key]]));
    },
    set: vi.fn(async (items: Record<string, string>) => void Object.assign(records, items)),
    remove: vi.fn(async (keys: string | string[]) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        delete records[key];
      }
    }),
  };
}

function setUp(localRecords: Record<string, string> = {}, { drain = false } = {}) {
  const local = area(localRecords);
  const sync = area();
  vi.stubGlobal('chrome', { storage: { local, sync, onChanged: { addListener: () => undefined } } });
  const injector = Injector.create({
    providers: [
      { provide: INSTANCE_ID, useValue: 'tab' },
      { provide: StoreSyncService, useValue: { sync: () => undefined } },
    ],
  });
  const api = runInInjectionContext(injector, () => new ChromeStorageApi());
  if (!drain) {
    // Leave the queue for the test to read instead of draining it on a timer.
    api.syncToRemote = () => undefined;
  }
  return { api, local, sync };
}

describe('ChromeStorageApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('queues a note for chrome.storage.sync, not a page or a note over the item quota', async () => {
    const { api } = setUp();
    await api.setPromise('ITEM_DATA__a', { id: 'a', dataType: DataType.MARKDOWN, data: 'Hi', empty: false });
    await api.setPromise('ITEM_DATA__p', { id: 'p', dataType: DataType.PAGE, data: 'Long', empty: false });
    await api.setPromise('ITEM_DATA__b', {
      id: 'b',
      dataType: DataType.MARKDOWN,
      data: 'x'.repeat(9000),
      empty: false,
    });
    expect(api.remoteDataQueue.map(({ key }) => key)).toEqual(['ITEM_DATA__a']);
  });

  it('removes from chrome.storage.sync only what the policy syncs', async () => {
    const { api, local } = setUp({
      ART_BOARD_ITEM__a: JSON.stringify({ id: 'a', extensionId: ExtensionId.TextNote }),
      ART_BOARD_ITEM__p: JSON.stringify({ id: 'p', extensionId: ExtensionId.Page }),
      ART_BOARD_ITEM__f: JSON.stringify({ id: 'f', extensionId: ExtensionId.Flow }),
      ITEM_DATA__p: JSON.stringify({ id: 'p', dataType: DataType.PAGE, empty: false }),
    });
    await api.removePromise('ART_BOARD_ITEM__p');
    await api.removePromise('ITEM_DATA__p');
    await api.removePromise(['ART_BOARD_ITEM__a', 'ART_BOARD_ITEM__f']);
    expect(local.records).toEqual({});
    expect(api.remoteDataQueue).toEqual([{ key: ['ART_BOARD_ITEM__a'], action: 'remove' }]);
  });

  it('sends a note chrome.storage.sync refused (the area full) again once a removal frees room', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { api, sync } = setUp(
      { ART_BOARD_ITEM__old: JSON.stringify({ id: 'old', extensionId: ExtensionId.TextNote }) },
      { drain: true },
    );
    sync.set.mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'));
    await api.setPromise('ITEM_DATA__a', { id: 'a', dataType: DataType.MARKDOWN, data: 'Hi', empty: false });
    await vi.advanceTimersByTimeAsync(700);
    expect(sync.records).toEqual({});
    expect(api.refusedRemoteWrites.has('ITEM_DATA__a')).toBe(true);

    await api.removePromise('ART_BOARD_ITEM__old');
    await vi.advanceTimersByTimeAsync(700 * 3);
    expect(sync.remove).toHaveBeenCalledWith(['ART_BOARD_ITEM__old']);
    expect(JSON.parse(sync.records['ITEM_DATA__a'])).toMatchObject({ data: 'Hi' });
    expect(api.refusedRemoteWrites.size).toBe(0);
  });

  it('drops a refused write that a newer write of the note replaces', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { api, sync } = setUp({}, { drain: true });
    sync.set.mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'));
    await api.setPromise('ITEM_DATA__a', { id: 'a', dataType: DataType.MARKDOWN, data: 'Hi', empty: false });
    await vi.advanceTimersByTimeAsync(700);
    await api.setPromise('ITEM_DATA__a', { id: 'a', dataType: DataType.MARKDOWN, data: 'Hi again', empty: false });
    expect(api.refusedRemoteWrites.size).toBe(0);
    await vi.advanceTimersByTimeAsync(700 * 2);
    expect(JSON.parse(sync.records['ITEM_DATA__a'])).toMatchObject({ data: 'Hi again' });
  });
});
