/** How much room Noteme takes, as Settings › Storage shows it; a part this browser cannot measure is left out. */
export interface StorageUsage {
  /** The notes, plans and settings in chrome.storage.local, in bytes. */
  notes?: number;
  /** Everything else kept on the device: pasted images (IndexedDB) and the photos downloaded for Home (Cache Storage). */
  files?: number;
  /** chrome.storage.sync, when sync is on. */
  sync?: {
    used: number;
    quota: number;
    /** Notes it refused for lack of room, sent again once there is some. */
    waiting: number;
  };
}

const UNITS = ['kilobyte', 'megabyte', 'gigabyte'] as const;

/** "0.3 kB", "12 kB", "1.4 MB": in the language's own words and separators (« 1,4 Mo »). Never in bytes. */
export function formatBytes(bytes: number, locale?: string): string {
  let value = Math.max(0, bytes) / 1024;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: UNITS[unit],
    unitDisplay: 'short',
    // One decimal while the number is short.
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value);
}

/**
 * The notes the retry markers stand for (`SYNC__RETRY__<key>`, chrome-storage.api.ts), among the keys of
 * chrome.storage.local: a note has two records (its card and its text), and may wait with both.
 */
export function waitingNotes(keys: readonly string[]): number {
  const ids = new Set<string>();
  for (const key of keys) {
    const match = /^SYNC__RETRY__(?:ITEM_DATA|ART_BOARD_ITEM)__(.+)$/.exec(key);
    if (match) {
      ids.add(match[1]);
    }
  }
  return ids.size;
}

/** Measure what can be measured; a part that fails is left out, never thrown. */
export async function readStorageUsage(syncOn: boolean): Promise<StorageUsage> {
  const usage: StorageUsage = {};
  const local = typeof chrome !== 'undefined' ? chrome.storage?.local : undefined;
  const sync = typeof chrome !== 'undefined' ? chrome.storage?.sync : undefined;
  const part = async (read: () => Promise<void>) => read().catch((error: unknown) => console.error(error));
  await Promise.all([
    part(async () => {
      if (local) {
        usage.notes = await local.getBytesInUse(null);
      }
    }),
    part(async () => {
      // The origin's IndexedDB and Cache Storage; chrome.storage is counted apart.
      const estimate = await navigator.storage?.estimate?.();
      if (estimate?.usage !== undefined) {
        usage.files = estimate.usage;
      }
    }),
    part(async () => {
      if (syncOn && sync && local) {
        // getKeys is Chrome 130+: without it the quota still shows, with no count of the notes waiting.
        const [used, keys] = await Promise.all([
          sync.getBytesInUse(null),
          typeof local.getKeys === 'function' ? local.getKeys().catch(() => []) : [],
        ]);
        usage.sync = { used, quota: chrome.storage.sync.QUOTA_BYTES, waiting: waitingNotes(keys) };
      }
    }),
  ]);
  return usage;
}
