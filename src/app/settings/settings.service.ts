import { DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { STORAGE_API } from '../services/storage.api';
import { parseSettings, Settings } from './settings';

const MIRROR_KEY = 'noteme-settings';
/** Set while the mirror holds a change chrome.storage.sync has not accepted yet. */
const UNSYNCED_KEY = 'noteme-settings-unsynced';
const SYNC_KEY = 'NOTEME_SETTINGS';

const hasChromeStorage = () => typeof chrome !== 'undefined' && !!chrome.storage?.sync;

/** The settings mirrored in localStorage, read synchronously so the first paint already has the right theme. */
export function readMirroredSettings(): Settings {
  try {
    return parseSettings(JSON.parse(readLocal(MIRROR_KEY) ?? 'null'));
  } catch {
    return parseSettings(null);
  }
}

/**
 * What a new tab does with the synced settings it reads at start-up. The mirror wins while it holds a change the sync
 * never accepted (offline, quota): adopting the synced copy would throw that change away.
 */
export function startupSettingsAction(synced: unknown, mirrorUnsynced: boolean): 'adopt' | 'push' | 'keep' {
  if (mirrorUnsynced) {
    return 'push';
  }
  return typeof synced === 'string' ? 'adopt' : 'keep';
}

/** localStorage can throw (storage disabled, quota); the settings then live for this tab only. */
function writeLocal(key: string, value: string | null): void {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // Nothing to fall back on.
  }
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function resolveTheme(theme: Settings['theme']): 'light' | 'dark' {
  if (theme !== 'auto') {
    return theme;
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Settings are mirrored in localStorage, read synchronously at start-up and shared by the tabs open at once. Once sync
 * is switched on they also live in chrome.storage.sync (a few hundred bytes), so they follow the Chrome profile to
 * every device that syncs too.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly storage = inject(STORAGE_API);
  private readonly state = signal<Settings>(readMirroredSettings());
  private readonly systemDark = signal(matchMedia('(prefers-color-scheme: dark)').matches);
  readonly settings = this.state.asReadonly();
  /**
   * Resolves once the synced settings have been read at start-up (at once without chrome.storage or with sync off,
   * and also when the read fails): until then `settings` is the local mirror, which a fresh profile does not have yet.
   */
  readonly loaded: Promise<void>;

  constructor() {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = (event: MediaQueryListEvent) => this.systemDark.set(event.matches);
    media.addEventListener('change', onSystemChange);
    // Another tab's change: it writes the mirror, and localStorage tells every other tab.
    const onMirrorChange = (event: StorageEvent) => {
      if (event.key === MIRROR_KEY && event.newValue) {
        this.adoptMirror(event.newValue);
      }
    };
    window.addEventListener('storage', onMirrorChange);
    inject(DestroyRef).onDestroy(() => {
      media.removeEventListener('change', onSystemChange);
      window.removeEventListener('storage', onMirrorChange);
    });

    effect(() => {
      const theme = this.state().theme;
      document.documentElement.dataset['theme'] = theme === 'auto' ? (this.systemDark() ? 'dark' : 'light') : theme;
    });
    // Notes follow the switch too, also when another tab flips it.
    effect(() => this.storage.setSyncEnabled(this.state().sync));

    if (hasChromeStorage()) {
      this.loaded = this.state().sync ? this.readSynced() : Promise.resolve();
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes[SYNC_KEY] && this.state().sync) {
          this.adopt(changes[SYNC_KEY].newValue);
        }
      });
    } else {
      this.loaded = Promise.resolve();
    }
  }

  update(patch: Partial<Settings>): void {
    const syncWas = this.state().sync;
    const next = parseSettings({ ...this.state(), ...patch });
    this.state.set(next);
    const serialized = JSON.stringify(next);
    writeLocal(MIRROR_KEY, serialized);
    if (next.sync !== syncWas) {
      this.storage.setSyncEnabled(next.sync);
      if (next.sync) {
        this.startSync();
      } else {
        // Nothing waits for chrome.storage.sync any more.
        writeLocal(UNSYNCED_KEY, null);
      }
    } else if (hasChromeStorage() && next.sync) {
      this.push(serialized);
    }
  }

  /**
   * Sync switched on: the profile's settings, when another device synced them, replace this device's; otherwise this
   * device's go up. Notes are pulled in first, then what this device wrote while sync was off is sent.
   */
  private startSync(): void {
    if (hasChromeStorage()) {
      chrome.storage.sync.get(SYNC_KEY).then(
        (stored) => {
          if (typeof stored[SYNC_KEY] === 'string') {
            this.adopt(stored[SYNC_KEY]);
          } else {
            this.push(JSON.stringify(this.state()));
          }
        },
        (error: unknown) => console.error(error),
      );
    }
    this.storage
      .syncRemoteToLocal()
      .then(() => this.storage.pushLocalToRemote())
      .catch((error: unknown) => console.error(error));
  }

  private readSynced(): Promise<void> {
    return chrome.storage.sync.get(SYNC_KEY).then(
      (stored) => {
        const action = startupSettingsAction(stored[SYNC_KEY], readLocal(UNSYNCED_KEY) !== null);
        if (action === 'push') {
          this.push(JSON.stringify(this.state()));
        } else if (action === 'adopt') {
          this.adopt(stored[SYNC_KEY]);
        }
      },
      (error: unknown) => console.error(error),
    );
  }

  /** Write to chrome.storage.sync, marking the mirror as ahead of it until the write is accepted. */
  private push(serialized: string): void {
    writeLocal(UNSYNCED_KEY, '1');
    chrome.storage.sync
      .set({ [SYNC_KEY]: serialized })
      .then(() => writeLocal(UNSYNCED_KEY, null))
      .catch((error: unknown) => console.error(error));
  }

  /** The synced copy, all but the switch: whether this device syncs stays its own choice. */
  private adopt(value: unknown): void {
    if (typeof value !== 'string') {
      return;
    }
    try {
      const next = { ...parseSettings(JSON.parse(value)), sync: this.state().sync };
      this.state.set(next);
      writeLocal(MIRROR_KEY, JSON.stringify(next));
      // The mirror now matches the sync, which is newer than any change that failed to reach it.
      writeLocal(UNSYNCED_KEY, null);
    } catch {
      // A corrupt record keeps the current settings.
    }
  }

  /** Another tab's settings, the switch included: it is this device's. Already in the mirror. */
  private adoptMirror(value: string): void {
    try {
      this.state.set(parseSettings(JSON.parse(value)));
    } catch {
      // A corrupt record keeps the current settings.
    }
  }
}
