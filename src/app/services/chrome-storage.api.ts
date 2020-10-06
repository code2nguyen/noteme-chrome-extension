import { Observable, bindCallback, from, Subject } from 'rxjs';
import { StorageApi } from './storage.api';
import { uuid } from './utils';
import { StoreSyncService } from './store-sync.service';
import { Injectable } from '@angular/core';

export interface StorageChanges {
  [key: string]: chrome.storage.StorageChange;
}

@Injectable()
export class ChromeStorageApi implements StorageApi {
  readonly localStorageApi: chrome.storage.StorageArea;
  readonly chromeSyncApi: chrome.storage.StorageArea;

  readonly onChanged = new Subject<chrome.storage.StorageChange>();
  readonly ID: string;
  constructor(private storeSync: StoreSyncService) {
    this.ID = uuid();
    this.localStorageApi = chrome.storage.local;
    this.chromeSyncApi = chrome.storage.sync;

    chrome.storage.onChanged.addListener((changes: StorageChanges) => {
      for (const key of Object.keys(changes)) {
        const change = changes[key];
        const newValue = change.newValue ? JSON.parse(change.newValue) : null;
        const oldValue = change.oldValue ? JSON.parse(change.oldValue) : null;
        if (!newValue || (newValue && newValue.sourceId !== this.ID)) {
          this.storeSync.sync(key, newValue, oldValue);
        }
        this.syncLocalToChromeSync(key, change.newValue, change.oldValue);
      }
      this.onChanged.next(changes);
    });
  }

  set(key: string, value: any): Observable<any> {
    return from(
      new Promise((resolve, reject) => {
        if (!Array.isArray(value)) {
          value = { ...value, ...{ sourceId: this.ID } };
        }
        this.localStorageApi.set({ [key]: JSON.stringify(value) }, () => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return reject(chrome.runtime.lastError);
          }
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
            console.error(chrome.runtime.lastError);
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
            console.error(chrome.runtime.lastError);
            return reject(chrome.runtime.lastError);
          }
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

  private syncLocalToChromeSync(key: string, newValue: string, oldValue: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (key.startsWith('ART_BOARD_ITEM__') || key.startsWith('ITEM_DATA__')) {
        if (!newValue) {
          this.chromeSyncApi.remove(key, () => {
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError);
              return reject(chrome.runtime.lastError);
            }
            resolve(null);
          });
        } else {
          this.chromeSyncApi.set({ [key]: newValue }, () => {
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError);
              return reject(chrome.runtime.lastError);
            }
            resolve();
          });
        }
      } else {
        resolve();
      }
    });
  }
}
