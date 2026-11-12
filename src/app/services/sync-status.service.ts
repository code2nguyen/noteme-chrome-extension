import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { skip } from 'rxjs/operators';

import { STORAGE_API } from './storage.api';
import { parseSyncStatus, SYNC_STATUS_KEY, SyncStatus } from './sync-status';

/**
 * How the sync with the Chrome profile is going, for Settings › Sync: the status every tab shares (sync-status.ts),
 * whether this tab is exchanging notes right now, and "Sync now". Only in the extension: `ng serve` has no remote.
 */
@Injectable({ providedIn: 'root' })
export class SyncStatusService {
  private readonly storage = inject(STORAGE_API);
  readonly supported = typeof chrome !== 'undefined' && !!chrome.storage?.sync && !!chrome.storage?.local;
  readonly status = signal<SyncStatus>({});
  /** Notes are going to, or coming from, the Chrome profile. */
  readonly syncing = signal(false);
  /** "Sync now" is running. */
  private asked = 0;
  private sending = false;

  constructor() {
    if (!this.supported) {
      return;
    }
    chrome.storage.local.get(SYNC_STATUS_KEY).then(
      (stored) => this.status.set(parseSyncStatus(stored[SYNC_STATUS_KEY])),
      (error: unknown) => console.error('Could not read the sync status', error),
    );
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      const change = changes[SYNC_STATUS_KEY];
      if (area === 'local' && change) {
        this.status.set(parseSyncStatus(change.newValue));
      }
    };
    chrome.storage.onChanged.addListener(listener);
    // The storage says false when it starts sending, true once everything is sent; its first word is not news, so
    // whether it is sending right now is asked.
    this.sending = this.storage.isSending();
    this.update();
    const sent = this.storage
      .getRemoteSyncStatus()
      .pipe(skip(1))
      .subscribe((done) => {
        this.sending = !done;
        this.update();
      });
    inject(DestroyRef).onDestroy(() => {
      chrome.storage.onChanged.removeListener(listener);
      sent.unsubscribe();
    });
  }

  /** Take in what the profile has, and send again what it refused. What goes wrong is in the status. */
  async syncNow(): Promise<void> {
    this.asked++;
    this.update();
    try {
      await this.storage.syncNow();
    } finally {
      this.asked--;
      this.update();
    }
  }

  private update(): void {
    this.syncing.set(this.asked > 0 || this.sending);
  }
}
