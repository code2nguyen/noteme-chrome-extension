import { StorageApi } from './storage.api';
import { Observable, of } from 'rxjs';
import { devData } from './dev-data';
import clone from 'lodash-es/clone';
export class DevStorageApi implements StorageApi {
  private data: any = devData;

  set(key: string, value: any): Observable<any> {
    this.data[key] = clone(value);
    return of(null);
  }

  get(key: string | string[]): Observable<any> {
    if (Array.isArray(key)) {
      return of(key.map((itemKey) => clone(this.data[itemKey])));
    }
    return of(key ? clone(this.data[key]) : clone(this.data));
  }

  remove(key: string): Observable<any> {
    delete this.data[key];
    return of(null);
  }

  getRemoteSyncStatus(): Observable<boolean> {
    return of(true);
  }

  syncRemoveToLocal(): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }
}
