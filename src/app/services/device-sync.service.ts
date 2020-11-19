import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageApi, STORAGE_API } from './storage.api';

@Injectable({ providedIn: 'root' })
export class DeviceSyncService {
  synState$ = new BehaviorSubject<number>(0);

  syncCompleteTimer: any;
  constructor(@Inject(STORAGE_API) private storageApi: StorageApi) {
    this.storageApi.getRemoteSyncStatus().subscribe((status) => {
      console.log(status);
      if (status) {
        this.setSyncCompleted();
      } else {
        this.startSync();
      }
    });
  }

  startSync(): void {
    this.synState$.next(0);
  }

  setSyncCompleted(): void {
    console.log('setSyncCompleted');
    if (this.syncCompleteTimer) {
      clearTimeout(this.syncCompleteTimer);
      this.syncCompleteTimer = null;
    }
    this.synState$.next(1);
    this.syncCompleteTimer = setTimeout(() => {
      this.synState$.next(2);
    }, 2000);
  }

  sync(): void {
    this.startSync();
    this.storageApi.syncRemoveToLocal().then(() => {
      this.setSyncCompleted();
    });
  }
}
