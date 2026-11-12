import { BehaviorSubject, from, interval, Observable, Subscription } from 'rxjs';
import { map, takeWhile } from 'rxjs/operators';
import { inject, Injectable } from '@angular/core';
import { StorageApi } from './storage.api';
import { StoreSyncService } from './store-sync.service';
import { INSTANCE_ID } from './instance-id';
import { fitsChromeSyncItem, SYNC_ENABLED, syncsWithChromeProfile } from './sync-policy';
import { ART_BOARD_ITEM_PREFIX, ITEM_DATA_PREFIX } from './storage-keys';
import { parseSyncStatus, SYNC_STATUS_KEY, syncError, SyncStatus } from './sync-status';
import { getTime } from './utils';

type StoredRecord = Record<string, unknown> & { sourceId?: string; trust?: string; modifiedDate?: string };

/**
 * Marks a key whose last write chrome.storage.sync refused: `SYNC__RETRY__<key>` in chrome.storage.local, so a restart
 * still retries it. One marker per key, set or removed whole, so tabs open at once never overwrite each other's (a
 * shared list read and written back by two tabs would lose one). Only the key: a retry sends the record as it is then,
 * so a note deleted or replaced meanwhile is never sent stale.
 */
export const SYNC_RETRY_PREFIX = 'SYNC__RETRY__';

/** A note's card or its text: what "last synced" counts, not the settings or the board's lists. */
const isNote = (key: string) => key.startsWith(ITEM_DATA_PREFIX) || key.startsWith(ART_BOARD_ITEM_PREFIX);

@Injectable()
export class ChromeStorageApi implements StorageApi {
  private readonly id = inject(INSTANCE_ID);
  private readonly storeSync = inject(StoreSyncService);
  readonly localStorageApi: chrome.storage.StorageArea = chrome.storage.local;
  readonly chromeSyncApi: chrome.storage.StorageArea = chrome.storage.sync;
  remoteDataQueue: Array<{ key: string | string[]; value?: string; action: 'remove' | 'set' }> = [];
  writingToRemoteSubscription: Subscription | null = null;
  remoteSync$ = new BehaviorSubject(false);
  /** A removal was refused: unlike a refused write, nothing marks it for a retry. */
  private removeFailed = false;
  /** A note went to chrome.storage.sync, or was removed from it, since the queue last emptied. */
  private sentNotes = false;
  /** The writes handed to chrome.storage.sync that have not answered yet: the queue is sent once they all have. */
  private writes: Promise<unknown>[] = [];
  /** One report of the sync status at a time, so two never read the same record and overwrite each other. */
  private reporting: Promise<void> = Promise.resolve();
  /** One pass taking in the profile's notes at a time: two at once would both add the same note to the board. */
  private pulling: Promise<void> = Promise.resolve();
  /** Set while a retry waits for chrome.storage.sync to take writes again. */
  private retryTimer?: ReturnType<typeof setTimeout>;
  /** Off: chrome.storage.sync is neither written nor read, and its changes are ignored. */
  private syncEnabled = inject(SYNC_ENABLED);

  constructor() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && !this.syncEnabled) {
        return;
      }
      // Room freed in chrome.storage.sync, by another device too: send what it refused again.
      if (areaName === 'sync' && Object.values(changes).some((change) => change.newValue === undefined)) {
        void this.retryRefusedWrites();
      }
      let received = false;
      const removed: string[] = [];
      for (const key of Object.keys(changes)) {
        const change = changes[key];
        const newValue = this.jsonParse(change.newValue);
        const oldValue = this.jsonParse(change.oldValue);
        if (!newValue || newValue.sourceId !== this.id) {
          this.storeSync.sync(key, newValue, oldValue);
        }
        if (areaName === 'sync' && isNote(key)) {
          // A note written elsewhere (another computer, another tab) arriving through the profile.
          received ||= !!newValue && newValue.sourceId !== this.id;
          if (change.newValue === undefined) {
            removed.push(key);
          }
        }
      }
      if (received) {
        void this.report({ at: Date.now() });
      } else if (removed.length > 0) {
        void this.reportRemovedElsewhere(removed);
      }
    });
    // What was refused before a restart.
    if (this.syncEnabled) {
      void this.retryRefusedWrites();
    }
  }

  setSyncEnabled(enabled: boolean): void {
    if (enabled === this.syncEnabled) {
      return;
    }
    this.syncEnabled = enabled;
    if (enabled) {
      void this.retryRefusedWrites();
    } else {
      // What is queued stays on the device; the remote keeps what it has.
      this.remoteDataQueue = [];
    }
  }

  /**
   * Queue every record that syncs, as chrome.storage.local holds it: run when sync is switched on, after the remote has
   * been pulled in, so what was written while sync was off reaches the profile. A record that came from the remote is
   * there already.
   */
  async pushLocalToRemote(): Promise<void> {
    if (!this.syncEnabled) {
      return;
    }
    const stored = (await this.localStorageApi.get(null)) as Record<string, unknown>;
    const before = this.remoteDataQueue.length;
    for (const [key, valueStr] of Object.entries(stored)) {
      if (!key.startsWith(SYNC_RETRY_PREFIX) && this.sendable(key, valueStr)) {
        this.remoteDataQueue.push({ key, value: valueStr as string, action: 'set' });
      }
    }
    if (this.remoteDataQueue.length > before) {
      this.syncToRemote();
    }
  }

  getRemoteSyncStatus(): Observable<boolean> {
    return this.remoteSync$.asObservable();
  }

  isSending(): boolean {
    return this.writingToRemoteSubscription !== null;
  }

  syncToRemote(): void {
    if (this.writingToRemoteSubscription) {
      return;
    }
    this.remoteSync$.next(false);
    // chrome.storage.sync allows 120 writes a minute; one every 700ms stays under it.
    this.writingToRemoteSubscription = interval(700)
      .pipe(
        takeWhile(() => this.remoteDataQueue.length > 0),
        map(() => this.remoteDataQueue.shift()),
      )
      .subscribe({
        next: (item) => {
          if (!item) {
            return;
          }
          const write =
            item.action === 'remove'
              ? this.chromeSyncApi.remove(item.key)
              : this.chromeSyncApi.set({ [item.key as string]: item.value });
          // A refused write is retried once chrome.storage.sync takes a write again (room freed, a passing error over).
          this.writes.push(
            write.then(
              () => {
                this.sentNotes ||= (Array.isArray(item.key) ? item.key : [item.key]).some(isNote);
                void this.retryRefusedWrites();
              },
              (error: unknown) => {
                console.error(error);
                const failure = syncError(error);
                void this.report({ error: failure });
                this.removeFailed ||= item.action === 'remove';
                if (failure.kind === 'busy') {
                  this.retryLater();
                }
                // Awaited before the queue is said to be sent: the marker is how that knows something still waits.
                return item.action === 'set'
                  ? this.localStorageApi.set({ [SYNC_RETRY_PREFIX + item.key]: '1' }).catch(() => undefined)
                  : undefined;
              },
            ),
          );
        },
        complete: () => {
          this.writingToRemoteSubscription = null;
          this.remoteSync$.next(true);
          // The last write may still be on its way (the queue empties when it is handed over, not when it answers).
          const writes = this.writes;
          this.writes = [];
          void Promise.allSettled(writes).then(() => this.reportSent());
        },
      });
  }

  set(key: string, value: unknown): Observable<void> {
    return from(this.setPromise(key, value));
  }

  async setPromise(key: string, value: unknown, trust = 'local', sourceId?: string): Promise<void> {
    if (!Array.isArray(value)) {
      value = { ...(value as object), sourceId: sourceId || this.id, trust };
    }
    const valueStr = JSON.stringify(value);
    await this.localStorageApi.set({ [key]: valueStr });
    if (
      this.syncEnabled &&
      trust === 'local' &&
      syncsWithChromeProfile(key, value) &&
      fitsChromeSyncItem(key, valueStr)
    ) {
      const oldActionIndex = this.remoteDataQueue.findIndex((item) => item.key === key);
      if (oldActionIndex > -1) {
        this.remoteDataQueue.splice(oldActionIndex, 1);
      }
      this.remoteDataQueue.push({ key, value: valueStr, action: 'set' });
      this.syncToRemote();
      // Queued again: no retry needed (and its refusal, if it comes, marks it again).
      void this.localStorageApi.remove(SYNC_RETRY_PREFIX + key);
    }
  }

  get<T = unknown>(key: string): Observable<T | undefined>;
  get<T = unknown>(key: string[]): Observable<T[]>;
  get(key: string | string[]): Observable<unknown> {
    return from(this.getPromise(key));
  }

  getPromise(key: string | string[] | null): Promise<unknown> {
    return this.read(this.localStorageApi, key);
  }

  getRemote(key: string | string[] | null): Promise<unknown> {
    return this.read(this.chromeSyncApi, key);
  }

  remove(key: string | string[]): Observable<void> {
    return from(this.removePromise(key));
  }

  async removePromise(key: string | string[]): Promise<void> {
    // Only what the policy syncs can be in chrome.storage.sync, whatever its size (an older copy that fitted may be
    // there). Read the records before the local copies are gone.
    const keys = Array.isArray(key) ? key : [key];
    const records = (await this.read(this.localStorageApi, keys)) as unknown[];
    const remoteKeys = keys.filter((itemKey, index) => syncsWithChromeProfile(itemKey, records[index]));
    await this.localStorageApi.remove(key);
    if (this.syncEnabled && remoteKeys.length > 0) {
      this.remoteDataQueue.push({ key: remoteKeys, action: 'remove' });
      this.syncToRemote();
    }
  }

  /**
   * "Sync now" (Settings › Sync): take in what the profile has, then send again what it refused. A failure is said in
   * the sync status, not thrown.
   */
  async syncNow(): Promise<void> {
    if (!this.syncEnabled) {
      return;
    }
    try {
      await this.syncRemoteToLocal();
      await this.retryRefusedWrites();
      // Nothing to send: said here, since no queue will empty to say it (a refusal that no longer stands is cleared).
      if (!this.isSending()) {
        await this.reportSent();
      }
    } catch (error) {
      console.error(error);
      await this.report({ error: syncError(error) });
    }
  }

  /**
   * The queue is empty. "Last synced" moves when a note was sent: it is the last time notes were exchanged, not the
   * last time Noteme looked. What was refused before no longer stands when nothing waits to be sent again: a refused
   * write leaves its marker (SYNC_RETRY_PREFIX) until it goes through or its note is deleted.
   */
  private async reportSent(): Promise<void> {
    const removeFailed = this.removeFailed;
    const sentNotes = this.sentNotes;
    this.removeFailed = false;
    this.sentNotes = false;
    if (!this.syncEnabled) {
      return;
    }
    try {
      const waiting =
        removeFailed || (await this.localStorageApi.getKeys()).some((key) => key.startsWith(SYNC_RETRY_PREFIX));
      const change: Partial<SyncStatus> = {
        ...(sentNotes ? { at: Date.now() } : {}),
        ...(waiting ? {} : { error: undefined }),
      };
      if (Object.keys(change).length > 0) {
        await this.report(change);
      }
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Note how the sync is going (sync-status.ts), for Settings and every other tab. Read and written whole, one report
   * after the other in this tab; two tabs writing at the same moment keep the later one's word.
   */
  private report(change: Partial<SyncStatus>): Promise<void> {
    this.reporting = this.reporting.then(async () => {
      try {
        const stored: Record<string, unknown> = await this.localStorageApi.get(SYNC_STATUS_KEY);
        const status: SyncStatus = { ...parseSyncStatus(stored[SYNC_STATUS_KEY]), ...change };
        await this.localStorageApi.set({ [SYNC_STATUS_KEY]: JSON.stringify(status) });
      } catch (error) {
        console.error(error);
      }
    });
    return this.reporting;
  }

  /**
   * Notes removed from chrome.storage.sync. By this device, its own copy went first (removePromise); one it still
   * holds was deleted on another computer, which counts as notes exchanged.
   */
  private async reportRemovedElsewhere(keys: string[]): Promise<void> {
    try {
      const held: Record<string, unknown> = await this.localStorageApi.get(keys);
      if (Object.keys(held).length > 0) {
        await this.report({ at: Date.now() });
      }
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * chrome.storage.sync takes no more writes for now (120 a minute, 1,800 an hour): what it refused is sent again in a
   * minute, without waiting for the next edit.
   */
  private retryLater(): void {
    this.retryTimer ??= setTimeout(() => {
      this.retryTimer = undefined;
      void this.retryRefusedWrites();
    }, 60_000);
  }

  /**
   * Send again the records chrome.storage.sync refused (SYNC_RETRY_PREFIX), as they are now in chrome.storage.local:
   * one deleted since is dropped, and so is one last written from the remote (its copy there is the newer one). Runs at
   * start, after every write chrome.storage.sync takes, and when something is removed from it. Two tabs retrying at
   * once may both send a record, which writes the same value twice.
   */
  async retryRefusedWrites(): Promise<void> {
    if (!this.syncEnabled) {
      return;
    }
    // Keys only, never the values: getKeys is Chrome 130+, and the build targets the last two versions (.browserslistrc).
    const markers = (await this.localStorageApi.getKeys()).filter((key) => key.startsWith(SYNC_RETRY_PREFIX));
    if (markers.length === 0) {
      return;
    }
    await this.localStorageApi.remove(markers);
    const keys = markers.map((marker) => marker.slice(SYNC_RETRY_PREFIX.length));
    const stored: Record<string, unknown> = await this.localStorageApi.get(keys);
    const before = this.remoteDataQueue.length;
    for (const key of keys) {
      const valueStr = stored[key];
      if (this.sendable(key, valueStr)) {
        this.remoteDataQueue.push({ key, value: valueStr as string, action: 'set' });
      }
    }
    if (this.remoteDataQueue.length > before) {
      this.syncToRemote();
    }
  }

  /** A record this device wrote, that syncs, fits one item and is not queued already. */
  private sendable(key: string, valueStr: unknown): boolean {
    const record = this.jsonParse(valueStr) as StoredRecord | unknown[] | null;
    return (
      typeof valueStr === 'string' &&
      !!record &&
      // Id lists carry no trust: only this device writes them.
      (Array.isArray(record) || record.trust === 'local') &&
      syncsWithChromeProfile(key, record) &&
      fitsChromeSyncItem(key, valueStr) &&
      !this.queued(key)
    );
  }

  private queued(key: string): boolean {
    return this.remoteDataQueue.some((item) => item.key === key);
  }

  private async read(area: chrome.storage.StorageArea, key: string | string[] | null): Promise<unknown> {
    const value: Record<string, unknown> = await area.get(key);
    if (Array.isArray(key)) {
      return key.map((itemKey) => this.jsonParse(value[itemKey]));
    }
    return key ? this.jsonParse(value[key]) : value;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private jsonParse(value: unknown): any {
    if (typeof value === 'string' && value) {
      try {
        return JSON.parse(value);
      } catch {
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
   */
  syncRemoteToLocal(): Promise<void> {
    // After the pass under way, if any: it then finds the notes that one took in, and adds nothing twice.
    const pass = this.pulling.catch(() => undefined).then(() => this.takeInRemote());
    this.pulling = pass;
    return pass;
  }

  private async takeInRemote(): Promise<void> {
    if (!this.syncEnabled) {
      return;
    }
    const remoteItems = ((await this.getRemote(null)) as Record<string, unknown>) || {};
    const localItems = ((await this.getPromise(null)) as Record<string, unknown>) || {};
    const remoteKeys = Object.keys(remoteItems);
    const localKeys = Object.keys(localItems);
    // Notes taken in from the profile: updated, added or removed here.
    let received = 0;
    for (const remoteKey of remoteKeys) {
      if (!remoteKey.startsWith('ITEM_DATA__') && !remoteKey.startsWith('ART_BOARD_ITEM__')) {
        continue;
      }
      const remoteData: StoredRecord | null = this.jsonParse(remoteItems[remoteKey]);
      if (!remoteData) {
        continue;
      }
      if (localKeys.includes(remoteKey)) {
        // update
        const localData: StoredRecord | null = this.jsonParse(localItems[remoteKey]);
        if (
          remoteData.modifiedDate &&
          localData?.modifiedDate &&
          getTime(remoteData.modifiedDate) > getTime(localData.modifiedDate)
        ) {
          remoteData['silent'] = false;
          await this.setPromise(remoteKey, remoteData, 'remote', remoteData.sourceId);
          this.storeSync.sync(remoteKey, remoteData, localData);
          received++;
        }
      } else {
        // add
        if (remoteKey.startsWith('ART_BOARD_ITEM__')) {
          const boardId = remoteData['boardId'] as string | undefined;
          if (boardId) {
            const boardKey = `_ART_BOARD__ART_BOARD_ITEM_IDS__${boardId}`;
            const boardItemIds = ((await this.getPromise(boardKey)) as string[] | null) || [];
            await this.setPromise(boardKey, [...boardItemIds, remoteData['id']]);
          }
          const artBoardItemIds = ((await this.getPromise('_ART_BOARD_ITEM__IDS')) as string[] | null) || [];
          await this.setPromise('_ART_BOARD_ITEM__IDS', [...artBoardItemIds, remoteData['id']]);
        }
        remoteData['silent'] = false;
        await this.setPromise(remoteKey, remoteData, 'remote', remoteData.sourceId);
        this.storeSync.sync(remoteKey, remoteData, null);
        received++;
      }
    }

    for (const localKey of localKeys) {
      if (!remoteKeys.includes(localKey)) {
        if (localKey.startsWith('ITEM_DATA__') || localKey.startsWith('ART_BOARD_ITEM__')) {
          const localData: StoredRecord | null = this.jsonParse(localItems[localKey]);
          if (localData?.trust === 'remote') {
            await this.removePromise(localKey);
            this.storeSync.sync(localKey, null, localData);
            received++;
          }
        }
      }
    }
    // "Last synced" moves when notes came in; a refusal of what this device sent stands until that goes through.
    if (received > 0) {
      await this.report({ at: Date.now() });
    }
  }
}
