import { ExtensionId } from '../extension-id';
import { DataType } from '../store/models/data-type';

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
