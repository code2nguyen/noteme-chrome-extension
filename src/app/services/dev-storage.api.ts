import { Observable, of } from 'rxjs';
import { StorageApi } from './storage.api';

const PREFIX = 'noteme-dev:';

/**
 * Storage used by `ng serve`, where the chrome.* APIs do not exist. Records live in localStorage so a reload keeps
 * them; there is no remote, so sync always reports done.
 */
export class DevStorageApi implements StorageApi {
  set(key: string, value: unknown): Observable<void> {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return of(undefined);
  }

  get<T = unknown>(key: string): Observable<T | undefined>;
  get<T = unknown>(key: string[]): Observable<T[]>;
  get(key: string | string[]): Observable<unknown> {
    return of(Array.isArray(key) ? key.map((itemKey) => this.read(itemKey)) : this.read(key));
  }

  remove(key: string | string[]): Observable<void> {
    for (const itemKey of Array.isArray(key) ? key : [key]) {
      localStorage.removeItem(PREFIX + itemKey);
    }
    return of(undefined);
  }

  getRemoteSyncStatus(): Observable<boolean> {
    return of(true);
  }

  syncRemoteToLocal(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // A missing key reads as null, as it does in ChromeStorageApi, so both storages exercise the same code paths.
  private read(key: string): unknown {
    const value = localStorage.getItem(PREFIX + key);
    return value ? JSON.parse(value) : null;
  }
}
