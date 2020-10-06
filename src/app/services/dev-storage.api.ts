import { StorageApi } from './storage.api';
import { Observable, of } from 'rxjs';

export class DevStorageApi implements StorageApi {
  private data: any = {};

  set(key: string, value: any): Observable<any> {
    this.data[key] = value;
    console.log(this.data);
    return of(null);
  }

  get(key: string | string[]): Observable<any> {
    console.log(this.data);
    if (Array.isArray(key)) {
      return of(key.map((itemKey) => this.data[itemKey]));
    }
    return of(this.data[key]);
  }

  remove(key: string): Observable<any> {
    delete this.data[key];
    console.log(this.data);
    return of(null);
  }
}
