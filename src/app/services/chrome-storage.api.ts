import { BehaviorSubject, from, interval, Observable, Subscription } from 'rxjs';
import { map, takeWhile } from 'rxjs/operators';
import { inject, Injectable } from '@angular/core';
import { StorageApi } from './storage.api';
import { StoreSyncService } from './store-sync.service';
import { INSTANCE_ID } from './instance-id';
import { fitsChromeSyncItem, syncsWithChromeProfile } from './sync-policy';
import { getTime } from './utils';

type StoredRecord = Record<string, unknown> & { sourceId?: string; trust?: string; modifiedDate?: string };

/**
 * Marks a key whose last write chrome.storage.sync refused: `SYNC__RETRY__<key>` in chrome.storage.local, so a restart
 * still retries it. One marker per key, set or removed whole, so tabs open at once never overwrite each other's (a
 * shared list read and written back by two tabs would lose one). Only the key: a retry sends the record as it is then,
 * so a note deleted or replaced meanwhile is never sent stale.
 */
export const SYNC_RETRY_PREFIX = 'SYNC__RETRY__';

@Injectable()
export class ChromeStorageApi implements StorageApi {
  private readonly id = inject(INSTANCE_ID);
  private readonly storeSync = inject(StoreSyncService);
  readonly localStorageApi: chrome.storage.StorageArea = chrome.storage.local;
  readonly chromeSyncApi: chrome.storage.StorageArea = chrome.storage.sync;
  remoteDataQueue: Array<{ key: string | string[]; value?: string; action: 'remove' | 'set' }> = [];
  writingToRemoteSubscription: Subscription | null = null;
  remoteSync$ = new BehaviorSubject(false);

  constructor() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      // Room freed in chrome.storage.sync, by another device too: send what it refused again.
      if (areaName === 'sync' && Object.values(changes).some((change) => change.newValue === undefined)) {
        void this.retryRefusedWrites();
      }
      for (const key of Object.keys(changes)) {
        const change = changes[key];
        const newValue = this.jsonParse(change.newValue);
        const oldValue = this.jsonParse(change.oldValue);
        if (!newValue || newValue.sourceId !== this.id) {
          this.storeSync.sync(key, newValue, oldValue);
        }
      }
    });
    // What was refused before a restart.
    void this.retryRefusedWrites();
  }

  getRemoteSyncStatus(): Observable<boolean> {
    return this.remoteSync$.asObservable();
  }

  syncToRemote(): void {
    if (this.writingToRemoteSubscription) {
      return;
    }
    this.remoteSync$.next(false);
    // chrome.storage.sync allows 120 writes a minute; one every 700ms stays under it.
    this.writingToRemoteSubscription = interval(700)
      .pipe(
        takeWhile(() => this.remoteDataQueue.length > 0),
        map(() => this.remoteDataQueue.shift()),
      )
      .subscribe({
        next: (item) => {
          if (!item) {
            return;
          }
          const write =
            item.action === 'remove'
              ? this.chromeSyncApi.remove(item.key)
              : this.chromeSyncApi.set({ [item.key as string]: item.value });
          // A refused write is retried once chrome.storage.sync takes a write again (room freed, a passing error over).
          write.then(
            () => void this.retryRefusedWrites(),
            (error: unknown) => {
              console.error(error);
              if (item.action === 'set') {
                void this.localStorageApi.set({ [SYNC_RETRY_PREFIX + item.key]: '1' });
              }
            },
          );
        },
        complete: () => {
          this.writingToRemoteSubscription = null;
          this.remoteSync$.next(true);
        },
      });
  }

  set(key: string, value: unknown): Observable<void> {
    return from(this.setPromise(key, value));
  }

  async setPromise(key: string, value: unknown, trust = 'local', sourceId?: string): Promise<void> {
    if (!Array.isArray(value)) {
      value = { ...(value as object), sourceId: sourceId || this.id, trust };
    }
    const valueStr = JSON.stringify(value);
    await this.localStorageApi.set({ [key]: valueStr });
    if (trust === 'local' && syncsWithChromeProfile(key, value) && fitsChromeSyncItem(key, valueStr)) {
      const oldActionIndex = this.remoteDataQueue.findIndex((item) => item.key === key);
      if (oldActionIndex > -1) {
        this.remoteDataQueue.splice(oldActionIndex, 1);
      }
      this.remoteDataQueue.push({ key, value: valueStr, action: 'set' });
      this.syncToRemote();
      // Queued again: no retry needed (and its refusal, if it comes, marks it again).
      void this.localStorageApi.remove(SYNC_RETRY_PREFIX + key);
    }
  }

  get<T = unknown>(key: string): Observable<T | undefined>;
  get<T = unknown>(key: string[]): Observable<T[]>;
  get(key: string | string[]): Observable<unknown> {
    return from(this.getPromise(key));
  }

  getPromise(key: string | string[] | null): Promise<unknown> {
    return this.read(this.localStorageApi, key);
  }

  getRemote(key: string | string[] | null): Promise<unknown> {
    return this.read(this.chromeSyncApi, key);
  }

  remove(key: string | string[]): Observable<void> {
    return from(this.removePromise(key));
  }

  async removePromise(key: string | string[]): Promise<void> {
    // Only what the policy syncs can be in chrome.storage.sync, whatever its size (an older copy that fitted may be
    // there). Read the records before the local copies are gone.
    const keys = Array.isArray(key) ? key : [key];
    const records = (await this.read(this.localStorageApi, keys)) as unknown[];
    const remoteKeys = keys.filter((itemKey, index) => syncsWithChromeProfile(itemKey, records[index]));
    await this.localStorageApi.remove(key);
    if (remoteKeys.length > 0) {
      this.remoteDataQueue.push({ key: remoteKeys, action: 'remove' });
      this.syncToRemote();
    }
  }

  /**
   * Send again the records chrome.storage.sync refused (SYNC_RETRY_PREFIX), as they are now in chrome.storage.local:
   * one deleted since is dropped, and so is one last written from the remote (its copy there is the newer one). Runs at
   * start, after every write chrome.storage.sync takes, and when something is removed from it. Two tabs retrying at
   * once may both send a record, which writes the same value twice.
   */
  async retryRefusedWrites(): Promise<void> {
    // Keys only, never the values: getKeys is Chrome 130+, and the build targets the last two versions (.browserslistrc).
    const markers = (await this.localStorageApi.getKeys()).filter((key) => key.startsWith(SYNC_RETRY_PREFIX));
    if (markers.length === 0) {
      return;
    }
    await this.localStorageApi.remove(markers);
    const keys = markers.map((marker) => marker.slice(SYNC_RETRY_PREFIX.length));
    const stored: Record<string, unknown> = await this.localStorageApi.get(keys);
    const before = this.remoteDataQueue.length;
    for (const key of keys) {
      const valueStr = stored[key];
      const record = this.jsonParse(valueStr) as StoredRecord | unknown[] | null;
      if (
        typeof valueStr !== 'string' ||
        !record ||
        // Id lists carry no trust: only this device writes them.
        (!Array.isArray(record) && record.trust !== 'local') ||
        !syncsWithChromeProfile(key, record) ||
        !fitsChromeSyncItem(key, valueStr) ||
        this.queued(key)
      ) {
        continue;
      }
      this.remoteDataQueue.push({ key, value: valueStr, action: 'set' });
    }
    if (this.remoteDataQueue.length > before) {
      this.syncToRemote();
    }
  }

  private queued(key: string): boolean {
    return this.remoteDataQueue.some((item) => item.key === key);
  }

  private async read(area: chrome.storage.StorageArea, key: string | string[] | null): Promise<unknown> {
    const value: Record<string, unknown> = await area.get(key);
    if (Array.isArray(key)) {
      return key.map((itemKey) => this.jsonParse(value[itemKey]));
    }
    return key ? this.jsonParse(value[key]) : value;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private jsonParse(value: unknown): any {
    if (typeof value === 'string' && value) {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Sync algorithm
   * Remote => Local
   *  - Found =>
   *        remote modifiedDate > local modifieddate =>  update local, set trust = remote
   *  - Not found => add to local, set trust = remote
   * Local => Remote
   *  - Not found => if trust = remote => remove from local
   */
  async syncRemoteToLocal(): Promise<void> {
    const remoteItems = ((await this.getRemote(null)) as Record<string, unknown>) || {};
    const localItems = ((await this.getPromise(null)) as Record<string, unknown>) || {};
    const remoteKeys = Object.keys(remoteItems);
    const localKeys = Object.keys(localItems);
    for (const remoteKey of remoteKeys) {
      if (!remoteKey.startsWith('ITEM_DATA__') && !remoteKey.startsWith('ART_BOARD_ITEM__')) {
        continue;
      }
      const remoteData: StoredRecord | null = this.jsonParse(remoteItems[remoteKey]);
      if (!remoteData) {
        continue;
      }
      if (localKeys.includes(remoteKey)) {
        // update
        const localData: StoredRecord | null = this.jsonParse(localItems[remoteKey]);
        if (
          remoteData.modifiedDate &&
          localData?.modifiedDate &&
          getTime(remoteData.modifiedDate) > getTime(localData.modifiedDate)
        ) {
          remoteData['silent'] = false;
          await this.setPromise(remoteKey, remoteData, 'remote', remoteData.sourceId);
          this.storeSync.sync(remoteKey, remoteData, localData);
        }
      } else {
        // add
        if (remoteKey.startsWith('ART_BOARD_ITEM__')) {
          const boardId = remoteData['boardId'] as string | undefined;
          if (boardId) {
            const boardKey = `_ART_BOARD__ART_BOARD_ITEM_IDS__${boardId}`;
            const boardItemIds = ((await this.getPromise(boardKey)) as string[] | null) || [];
            await this.setPromise(boardKey, [...boardItemIds, remoteData['id']]);
          }
          const artBoardItemIds = ((await this.getPromise('_ART_BOARD_ITEM__IDS')) as string[] | null) || [];
          await this.setPromise('_ART_BOARD_ITEM__IDS', [...artBoardItemIds, remoteData['id']]);
        }
        remoteData['silent'] = false;
        await this.setPromise(remoteKey, remoteData, 'remote', remoteData.sourceId);
        this.storeSync.sync(remoteKey, remoteData, null);
      }
    }

    for (const localKey of localKeys) {
      if (!remoteKeys.includes(localKey)) {
        if (localKey.startsWith('ITEM_DATA__') || localKey.startsWith('ART_BOARD_ITEM__')) {
          const localData: StoredRecord | null = this.jsonParse(localItems[localKey]);
          if (localData?.trust === 'remote') {
            await this.removePromise(localKey);
            this.storeSync.sync(localKey, null, localData);
          }
        }
      }
    }
  }
}
