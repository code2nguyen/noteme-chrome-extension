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

/**
 * What syncs through the Chrome profile (chrome.storage.sync): the quick notes only. Its quota is small (8 KB an item,
 * about 100 KB in all), which suits short notes; pages, and flows later, are long and stay on the device until Google
 * Drive sync is turned on. Index lists (which notes are on the board) and other small records sync as before.
 */
export function syncsWithChromeProfile(key: string, value: unknown): boolean {
  const record = (value ?? {}) as { extensionId?: string; dataType?: string; empty?: boolean };
  if (key.startsWith('ART_BOARD_ITEM__')) {
    return (record.extensionId ?? ExtensionId.TextNote) === ExtensionId.TextNote;
  }
  if (key.startsWith('ITEM_DATA__')) {
    // A note's text is notepad markdown (Quill delta before 3.0). An empty record has nothing to carry yet: it syncs
    // with the first word typed.
    return !record.empty && (record.dataType === DataType.MARKDOWN || record.dataType === DataType.DELTA);
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
