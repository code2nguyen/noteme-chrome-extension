/**
 * How the sync with the Chrome profile is going, as Settings › Sync says it: when notes were last exchanged with
 * chrome.storage.sync (sent or taken in), and what went wrong if something did. Kept in chrome.storage.local as a JSON
 * string, so every tab shows the same; it is this device's and never syncs (no `DEVICE__` key does).
 */
export const SYNC_STATUS_KEY = 'DEVICE__SYNC_STATUS';

/**
 * Why chrome.storage.sync refused: it is full (its 100 KB, or 512 records), it takes no more writes for now (120 a
 * minute, 1,800 an hour), or anything else.
 */
export type SyncErrorKind = 'full' | 'busy' | 'other';

export interface SyncError {
  kind: SyncErrorKind;
  /** Chrome's own words, shown for a kind Noteme has no words for. Never a note's text. */
  detail: string;
  /** When it happened, in ms. */
  at: number;
}

export interface SyncStatus {
  /**
   * When notes were last exchanged with the profile, in ms: one sent, or one taken in. Looking and finding nothing new
   * does not count. Unset until notes have been exchanged.
   */
  at?: number;
  /** The refusal still standing: cleared by the next exchange that goes through whole. */
  error?: SyncError;
}

/** Chrome names the limit it enforced: "QUOTA_BYTES quota exceeded", "MAX_WRITE_OPERATIONS_PER_MINUTE quota exceeded". */
export function syncErrorKind(message: string): SyncErrorKind {
  if (/MAX_WRITE_OPERATIONS/.test(message)) {
    return 'busy';
  }
  return /QUOTA_BYTES|MAX_ITEMS/.test(message) ? 'full' : 'other';
}

export function syncError(error: unknown, now = Date.now()): SyncError {
  const detail = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error);
  return { kind: syncErrorKind(detail), detail: detail.slice(0, 200), at: now };
}

/** Read the stored record defensively (a JSON string, or nothing yet): anything malformed reads as never synced. */
export function parseSyncStatus(raw: unknown): SyncStatus {
  let stored: Record<string, unknown> = {};
  try {
    const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : null;
    stored = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
  const status: SyncStatus = {};
  if (typeof stored['at'] === 'number' && Number.isFinite(stored['at'])) {
    status.at = stored['at'];
  }
  const error = stored['error'] as Partial<SyncError> | null | undefined;
  if (error && typeof error === 'object' && typeof error.detail === 'string') {
    status.error = {
      kind: error.kind === 'full' || error.kind === 'busy' ? error.kind : 'other',
      detail: error.detail,
      at: typeof error.at === 'number' ? error.at : 0,
    };
  }
  return status;
}
