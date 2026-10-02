import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { STORAGE_API } from './storage.api';

export enum SyncState {
  Syncing = 0,
  Synced = 1,
  Idle = 2,
}

@Injectable({ providedIn: 'root' })
export class DeviceSyncService {
  private readonly storageApi = inject(STORAGE_API);
  readonly syncState$ = new BehaviorSubject<SyncState>(SyncState.Syncing);
  private syncCompleteTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.storageApi.getRemoteSyncStatus().subscribe((status) => {
      if (status) {
        this.setSyncCompleted();
      } else {
        this.startSync();
      }
    });
  }

  startSync(): void {
    this.syncState$.next(SyncState.Syncing);
  }

  setSyncCompleted(): void {
    clearTimeout(this.syncCompleteTimer);
    this.syncState$.next(SyncState.Synced);
    this.syncCompleteTimer = setTimeout(() => this.syncState$.next(SyncState.Idle), 2000);
  }

  sync(): void {
    this.startSync();
    this.storageApi.syncRemoteToLocal().then(() => this.setSyncCompleted());
  }
}
