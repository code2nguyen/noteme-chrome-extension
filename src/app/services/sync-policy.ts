import { InjectionToken } from '@angular/core';
import { ExtensionId } from '../extension-id';
import { readMirroredSettings } from '../settings/settings.service';
import { DataType } from '../store/models/data-type';

/**
 * Whether this device syncs through the Chrome profile when storage starts: off until switched on in Settings (Sync),
 * then whatever the device chose. Read from the settings mirror, which is there before anything is written.
 */
export const SYNC_ENABLED = new InjectionToken<boolean>('Sync with the Chrome profile', {
  providedIn: 'root',
  factory: () => readMirroredSettings().sync,
});

/** The kinds of note that sync through the Chrome profile, and the data they store. */
const CHROME_PROFILE_KINDS: ReadonlySet<ExtensionId> = new Set([ExtensionId.TextNote, ExtensionId.TodoList]);
const CHROME_PROFILE_DATA: ReadonlySet<DataType> = new Set([DataType.MARKDOWN, DataType.DELTA, DataType.TODO]);

/**
 * What syncs through the Chrome profile (chrome.storage.sync): quick notes and to-do lists. Its quota is small (8 KB an
 * item, about 100 KB in all), which suits short notes and lists; pages and flows stay on the device until Google Drive
 * sync is turned on. Index lists (which notes are on the board) and other small records sync as before.
 */
export function syncsWithChromeProfile(key: string, value: unknown): boolean {
  const record = (value ?? {}) as { extensionId?: string; dataType?: string; empty?: boolean };
  if (key.startsWith('ART_BOARD_ITEM__')) {
    return CHROME_PROFILE_KINDS.has((record.extensionId ?? ExtensionId.TextNote) as ExtensionId);
  }
  if (key.startsWith('ITEM_DATA__')) {
    // A note's text is notepad markdown (Quill delta before 3.0); a list's, its tasks. An empty record has nothing to
    // carry yet: it syncs with the first word typed.
    return !record.empty && CHROME_PROFILE_DATA.has(record.dataType as DataType);
  }
  // Plans stay on the device for now, with pages and flows; Google Drive sync will carry them.
  if (key.startsWith('PLAN__')) {
    return false;
  }
  return true;
}

/** chrome.storage.sync's QUOTA_BYTES_PER_ITEM. */
export const CHROME_SYNC_ITEM_BYTES = 8192;

/**
 * Whether a write fits one chrome.storage.sync item, which Chrome measures as the key plus the JSON of the value it is
 * given. The records are stored as JSON strings, so that value is serialized a second time (quotes and escapes count).
 * A longer note stays on the device: the write could never succeed, and the remote keeps the last copy that fitted.
 * Fitting one item does not make room in the whole area (QUOTA_BYTES): a write refused for that is held and sent again
 * once chrome.storage.sync takes a write again or loses a record (ChromeStorageApi.retryRefusedWrites).
 */
export function fitsChromeSyncItem(key: string, serialized: string): boolean {
  return new TextEncoder().encode(key + JSON.stringify(serialized)).length <= CHROME_SYNC_ITEM_BYTES;
}
