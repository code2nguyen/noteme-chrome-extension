import { Observable, from, Subscription } from 'rxjs';
import { StorageApi } from './storage.api';
import { StoreSyncService } from './store-sync.service';
import { Inject, Injectable, NgZone, APP_ID } from '@angular/core';
import { map, takeWhile } from 'rxjs/operators';
import { interval } from 'rxjs';
import { getTime } from '../services/utils';
export interface StorageChanges {
  [key: string]: chrome.storage.StorageChange;
}

@Injectable()
export class ChromeStorageApi implements StorageApi {
  readonly localStorageApi: chrome.storage.StorageArea;
  readonly chromeSyncApi: chrome.storage.StorageArea;
  remoteDataQueue = new Array<{ key: string | string[]; value?: any; action: 'remove' | 'set' }>();
  writingToRemoteSubscription?: Subscription;

  constructor(@Inject(APP_ID) private ID: string, private storeSync: StoreSyncService, private ngZone: NgZone) {
    this.localStorageApi = chrome.storage.local;
    this.chromeSyncApi = chrome.storage.sync;
    this.ngZone.runOutsideAngular(() => {
      chrome.storage.onChanged.addListener((changes: StorageChanges) => {
        for (const key of Object.keys(changes)) {
          const change = changes[key];
          const newValue = change.newValue ? JSON.parse(change.newValue) : null;
          const oldValue = change.oldValue ? JSON.parse(change.oldValue) : null;
          if (!newValue || newValue.sourceId !== this.ID) {
            this.storeSync.sync(key, newValue, oldValue);
          }
        }
      });
    });
  }

  syncToRemote(): void {
    if (this.writingToRemoteSubscription) {
      return;
    }

    this.writingToRemoteSubscription = interval(1000)
      .pipe(
        takeWhile(() => this.remoteDataQueue.length > 0),
        map(() => {
          const item = this.remoteDataQueue.shift();
          return item;
        })
      )
      .subscribe({
        next: (item) => {
          if (!item) {
            return;
          }
          if (item.action === 'remove') {
            this.chromeSyncApi.remove(item.key);
          } else {
            this.chromeSyncApi.set({ [item.key as string]: item.value });
          }
        },
        complete: () => {
          this.writingToRemoteSubscription = null;
        },
      });
  }

  set(key: string, value: any): Observable<any> {
    return from(this.setPromise(key, value));
  }

  setPromise(key: string, value: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(value)) {
        value = { ...value, ...{ sourceId: this.ID, trust: 'local' } };
      }
      const valueStr = JSON.stringify(value);
      this.localStorageApi.set({ [key]: valueStr }, () => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          return reject(chrome.runtime.lastError);
        }
        this.remoteDataQueue.push({ key, value: valueStr, action: 'set' });
        this.syncToRemote();
        resolve();
      });
    });
  }

  get(key: string | string[] | null): Observable<any> {
    return from(this.getPromise(key));
  }

  getPromise(key: string | string[] | null): Promise<any> {
    return new Promise((resolve, reject) => {
      this.localStorageApi.get(key, (value) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          return reject(chrome.runtime.lastError);
        }
        if (Array.isArray(key)) {
          resolve(key.map((itemKey) => this.jsonParse(value[itemKey])));
        } else {
          resolve(key ? this.jsonParse(value[key]) : value);
        }
      });
    });
  }

  getRemote(key: string | string[] | null): Promise<any> {
    return new Promise((resolve, reject) => {
      this.chromeSyncApi.get(key, (value) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          return reject(chrome.runtime.lastError);
        }
        if (Array.isArray(key)) {
          resolve(key.map((itemKey) => this.jsonParse(value[itemKey])));
        } else {
          resolve(key ? this.jsonParse(value[key]) : value);
        }
      });
    });
  }

  remove(key: string | string[]): Observable<any> {
    return from(this.removePromise(key));
  }

  removePromise(key: string | string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.localStorageApi.remove(key, () => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          return reject(chrome.runtime.lastError);
        }
        this.remoteDataQueue.push({ key, action: 'remove' });
        this.syncToRemote();
        resolve(null);
      });
    });
  }

  private jsonParse(value: any): any {
    if (value) {
      try {
        return JSON.parse(value);
      } catch (error) {
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
   *
   */
  async syncRemoveToLocal(): Promise<any> {
    const remoteItems = (await this.getRemote(null)) || {};
    const localItems = (await this.getPromise(null)) || {};
    const remoteKeys = Object.keys(remoteItems);
    const localKeys = Object.keys(localItems);
    for (const remoteKey of remoteKeys) {
      if (remoteKey.startsWith('ITEM_DATA__') || remoteKey.startsWith('ART_BOARD_ITEM__')) {
        const remoteData = this.jsonParse(remoteItems[remoteKey]);
        if (localKeys.includes(remoteKey)) {
          // update
          const localData = this.jsonParse(localItems[remoteKey]);
          if (
            remoteData.modifiedDate &&
            localData.modifiedDate &&
            getTime(remoteData.modifiedDate) > getTime(localData.modifiedDate)
          ) {
            remoteData.trust = 'remote';
            await this.setPromise(remoteKey, remoteData);
          }
        } else {
          // add
          if (remoteKey.startsWith('ART_BOARD_ITEM__')) {
            if (remoteData.boardId) {
              let artBoardArtBoardItemIds = await this.getPromise(
                `_ART_BOARD__ART_BOARD_ITEM_IDS__${remoteData.boardId}`
              );
              artBoardArtBoardItemIds = artBoardArtBoardItemIds || [];
              artBoardArtBoardItemIds.push(remoteData.id);
              await this.setPromise(`_ART_BOARD__ART_BOARD_ITEM_IDS__${remoteData.boardId}`, artBoardArtBoardItemIds);
            }

            let artBoardItemIds = await this.getPromise(`_ART_BOARD_ITEM__IDS`);
            artBoardItemIds = artBoardItemIds || [];
            artBoardItemIds.push(remoteData.id);
            await this.setPromise(`_ART_BOARD_ITEM__IDS`, artBoardItemIds);
          }
          remoteData.trust = 'remote';
          await this.setPromise(remoteKey, remoteData);
        }
      }
    }

    for (const localKey of localKeys) {
      if (!remoteKeys.includes(localKey)) {
        if (localKey.startsWith('ITEM_DATA__') || localKey.startsWith('ART_BOARD_ITEM__')) {
          const localData = this.jsonParse(localItems[localKey]);
          if (localData.trust === 'remote') {
            await this.removePromise(localKey);
          }
        }
      }
    }
  }
}
