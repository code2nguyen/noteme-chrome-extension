import { Observable, from, Subject, Subscription } from 'rxjs';
import { layoutSyncKey, StorageApi } from './storage.api';
import { StoreSyncService } from './store-sync.service';
import { Inject, Injectable, NgZone, APP_ID } from '@angular/core';
import { bufferTime, delay, exhaustMap, filter, map, mapTo, takeWhile } from 'rxjs/operators';
import { interval } from 'rxjs';
import { until } from 'protractor';

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
    return from(
      new Promise((resolve, reject) => {
        if (!Array.isArray(value)) {
          value = { ...value, ...{ sourceId: this.ID } };
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
      })
    );
  }

  get(key: string | string[]): Observable<any> {
    return from(
      new Promise((resolve, reject) => {
        this.localStorageApi.get(key, (value) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            return reject(chrome.runtime.lastError);
          }
          if (Array.isArray(key)) {
            resolve(key.map((itemKey) => this.jsonParse(value[itemKey])));
          } else {
            resolve(this.jsonParse(value[key]));
          }
        });
      })
    );
  }

  remove(key: string | string[]): Observable<any> {
    return from(
      new Promise((resolve, reject) => {
        this.localStorageApi.remove(key, () => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            return reject(chrome.runtime.lastError);
          }
          this.remoteDataQueue.push({ key, action: 'remove' });
          this.syncToRemote();
          resolve(null);
        });
      })
    );
  }

  private debug(): void {
    this.localStorageApi.get(null, (items) => {
      console.log(items);
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
}
