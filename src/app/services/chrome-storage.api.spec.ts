// The storage class is partially compiled: JIT finishes it outside an Angular build.
import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExtensionId } from '../extension-id';
import { DataType } from '../store/models/data-type';
import { ChromeStorageApi, SYNC_RETRY_PREFIX } from './chrome-storage.api';
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

type ChangeListener = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, areaName: string) => void;

function setUp(localRecords: Record<string, string> = {}, { drain = false } = {}) {
  const local = area(localRecords);
  const sync = area();
  const listeners: ChangeListener[] = [];
  vi.stubGlobal('chrome', {
    storage: { local, sync, onChanged: { addListener: (listener: ChangeListener) => listeners.push(listener) } },
  });
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
  return { api, local, sync, listeners };
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

  describe('a note chrome.storage.sync refused (the area full)', () => {
    const note = (data: string) => ({ id: 'a', dataType: DataType.MARKDOWN, data, empty: false });
    const other = { ART_BOARD_ITEM__old: JSON.stringify({ id: 'old', extensionId: ExtensionId.TextNote }) };

    /** Write the note and let chrome.storage.sync refuse it. */
    async function refused(localRecords: Record<string, string> = {}) {
      vi.useFakeTimers();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const setup = setUp(localRecords, { drain: true });
      setup.sync.set.mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'));
      await setup.api.setPromise('ITEM_DATA__a', note('Hi'));
      await vi.advanceTimersByTimeAsync(700);
      expect(setup.sync.records).toEqual({});
      expect(setup.local.records[SYNC_RETRY_PREFIX + 'ITEM_DATA__a']).toBe('1');
      return setup;
    }

    it('is sent again once a removal frees room', async () => {
      const { api, sync, local } = await refused(other);
      await api.removePromise('ART_BOARD_ITEM__old');
      await vi.advanceTimersByTimeAsync(700 * 3);
      expect(sync.remove).toHaveBeenCalledWith(['ART_BOARD_ITEM__old']);
      expect(JSON.parse(sync.records['ITEM_DATA__a'])).toMatchObject({ data: 'Hi' });
      expect(local.records[SYNC_RETRY_PREFIX + 'ITEM_DATA__a']).toBeUndefined();
    });

    it('is sent again when another device removes something from chrome.storage.sync', async () => {
      const { sync, listeners } = await refused();
      listeners.forEach((listener) => listener({ ITEM_DATA__gone: { oldValue: '{"id":"gone"}' } }, 'sync'));
      await vi.advanceTimersByTimeAsync(700 * 2);
      expect(JSON.parse(sync.records['ITEM_DATA__a'])).toMatchObject({ data: 'Hi' });
    });

    it('is sent again after a restart', async () => {
      const { local } = await refused();
      const restarted = setUp(local.records, { drain: true });
      await vi.advanceTimersByTimeAsync(700 * 2);
      expect(JSON.parse(restarted.sync.records['ITEM_DATA__a'])).toMatchObject({ data: 'Hi' });
    });

    it('is not sent again once deleted, even when the refusal comes after the deletion', async () => {
      vi.useFakeTimers();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { api, sync, local } = setUp({}, { drain: true });
      sync.set.mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'));
      await api.setPromise('ITEM_DATA__a', note('Hi'));
      // Deleted while its write is still queued: the refusal and the removal come after.
      await api.removePromise('ITEM_DATA__a');
      await vi.advanceTimersByTimeAsync(700 * 4);
      expect(sync.remove).toHaveBeenCalledWith(['ITEM_DATA__a']);
      expect(sync.set).toHaveBeenCalledTimes(1);
      expect(sync.records).toEqual({});
      expect(local.records).toEqual({});
    });

    it('is not sent over a newer copy that came from the remote', async () => {
      const { api, sync } = await refused(other);
      // What syncRemoteToLocal writes when the remote copy is newer.
      await api.setPromise('ITEM_DATA__a', note('Newer, from another device'), 'remote', 'other-device');
      await api.removePromise('ART_BOARD_ITEM__old');
      await vi.advanceTimersByTimeAsync(700 * 3);
      expect(sync.set).toHaveBeenCalledTimes(1);
      expect(sync.records['ITEM_DATA__a']).toBeUndefined();
    });

    it('is marked by each tab on its own, so two tabs refused at once both retry', async () => {
      vi.useFakeTimers();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const first = setUp({}, { drain: true });
      // A second tab over the same chrome.storage areas.
      const second = runInInjectionContext(
        Injector.create({
          providers: [
            { provide: INSTANCE_ID, useValue: 'other-tab' },
            { provide: StoreSyncService, useValue: { sync: () => undefined } },
          ],
        }),
        () => new ChromeStorageApi(),
      );
      first.sync.set.mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'));
      first.sync.set.mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'));
      // Reads take a moment, as they do across processes: the two tabs' refusals overlap.
      const read = first.local.get;
      first.local.get = async (keys) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return read(keys);
      };
      await Promise.all([
        first.api.setPromise('ITEM_DATA__a', note('From the first tab')),
        second.setPromise('ITEM_DATA__b', { ...note('From the second tab'), id: 'b' }),
      ]);
      await vi.advanceTimersByTimeAsync(700);
      expect(first.local.records[SYNC_RETRY_PREFIX + 'ITEM_DATA__a']).toBe('1');
      expect(first.local.records[SYNC_RETRY_PREFIX + 'ITEM_DATA__b']).toBe('1');
      // Both come back after a restart.
      const restarted = setUp(first.local.records, { drain: true });
      await vi.advanceTimersByTimeAsync(700 * 3);
      expect(Object.keys(restarted.sync.records).sort()).toEqual(['ITEM_DATA__a', 'ITEM_DATA__b']);
    });

    it('is replaced by a newer write of the note', async () => {
      const { api, sync } = await refused();
      await api.setPromise('ITEM_DATA__a', note('Hi again'));
      await vi.advanceTimersByTimeAsync(700 * 3);
      expect(JSON.parse(sync.records['ITEM_DATA__a'])).toMatchObject({ data: 'Hi again' });
      expect(sync.set).toHaveBeenCalledTimes(2);
    });
  });
});
