import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { StorageApi, STORAGE_API } from './storage.api';

@Injectable({ providedIn: 'root' })
export class DeviceSyncService {
  synState$ = new BehaviorSubject<number>(0);

  constructor(@Inject(STORAGE_API) private storageApi: StorageApi) {}

  sync(): void {
    this.synState$.next(0);
    this.storageApi.syncRemoveToLocal().then(() => {
      this.synState$.next(1);
      setTimeout(() => {
        this.synState$.next(2);
      }, 1000);
    });
  }
}
