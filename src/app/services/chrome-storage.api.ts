import { BehaviorSubject, from, interval, Observable, Subscription } from 'rxjs';
import { map, takeWhile } from 'rxjs/operators';
import { inject, Injectable } from '@angular/core';
import { StorageApi } from './storage.api';
import { StoreSyncService } from './store-sync.service';
import { INSTANCE_ID } from './instance-id';
import { fitsChromeSyncItem, syncsWithChromeProfile } from './sync-policy';
import { getTime } from './utils';

type StoredRecord = Record<string, unknown> & { sourceId?: string; trust?: string; modifiedDate?: string };

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
    chrome.storage.onChanged.addListener((changes) => {
      for (const key of Object.keys(changes)) {
        const change = changes[key];
        const newValue = this.jsonParse(change.newValue);
        const oldValue = this.jsonParse(change.oldValue);
        if (!newValue || newValue.sourceId !== this.id) {
          this.storeSync.sync(key, newValue, oldValue);
        }
      }
    });
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
          write.catch((error: unknown) => console.error(error));
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
    await this.localStorageApi.remove(key);
    this.remoteDataQueue.push({ key, action: 'remove' });
    this.syncToRemote();
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
