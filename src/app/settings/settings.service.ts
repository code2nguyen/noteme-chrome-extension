import { DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { parseSettings, Settings } from './settings';

const MIRROR_KEY = 'noteme-settings';
const SYNC_KEY = 'NOTEME_SETTINGS';

const hasChromeStorage = () => typeof chrome !== 'undefined' && !!chrome.storage?.sync;

/** The settings mirrored in localStorage, read synchronously so the first paint already has the right theme. */
export function readMirroredSettings(): Settings {
  try {
    return parseSettings(JSON.parse(localStorage.getItem(MIRROR_KEY) ?? 'null'));
  } catch {
    return parseSettings(null);
  }
}

export function resolveTheme(theme: Settings['theme']): 'light' | 'dark' {
  if (theme !== 'auto') {
    return theme;
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Settings live in chrome.storage.sync (a few hundred bytes, so they follow the Chrome profile to every device) and
 * are mirrored in localStorage for a synchronous read at start-up.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly state = signal<Settings>(readMirroredSettings());
  private readonly systemDark = signal(matchMedia('(prefers-color-scheme: dark)').matches);
  readonly settings = this.state.asReadonly();

  constructor() {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = (event: MediaQueryListEvent) => this.systemDark.set(event.matches);
    media.addEventListener('change', onSystemChange);
    inject(DestroyRef).onDestroy(() => media.removeEventListener('change', onSystemChange));

    effect(() => {
      const theme = this.state().theme;
      document.documentElement.dataset['theme'] = theme === 'auto' ? (this.systemDark() ? 'dark' : 'light') : theme;
    });

    if (hasChromeStorage()) {
      chrome.storage.sync.get(SYNC_KEY).then((stored) => this.adopt(stored[SYNC_KEY]));
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes[SYNC_KEY]) {
          this.adopt(changes[SYNC_KEY].newValue);
        }
      });
    }
  }

  update(patch: Partial<Settings>): void {
    const next = parseSettings({ ...this.state(), ...patch });
    this.state.set(next);
    const serialized = JSON.stringify(next);
    localStorage.setItem(MIRROR_KEY, serialized);
    if (hasChromeStorage()) {
      chrome.storage.sync.set({ [SYNC_KEY]: serialized }).catch((error: unknown) => console.error(error));
    }
  }

  private adopt(value: unknown): void {
    if (typeof value !== 'string') {
      return;
    }
    try {
      const next = parseSettings(JSON.parse(value));
      this.state.set(next);
      localStorage.setItem(MIRROR_KEY, JSON.stringify(next));
    } catch {
      // A corrupt record keeps the current settings.
    }
  }
}
