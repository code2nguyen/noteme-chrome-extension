import { PHOTO_THEME_IDS, PhotoChange, PhotoTheme } from '../home/background';

/** What a person can set up. Stored as one small record, so it fits chrome.storage.sync and follows the profile. */
export type ThemeSetting = 'auto' | 'light' | 'dark';
export type ClockSetting = '24h' | '12h';
export type DateFormat = 'long' | 'short' | 'numeric';
export type WeekStart = 'monday' | 'sunday';

export interface Settings {
  theme: ThemeSetting;
  clock: ClockSetting;
  dateFormat: DateFormat;
  /** A photo behind Home. */
  photos: boolean;
  /** What the photos show; never empty. */
  photoThemes: PhotoTheme[];
  /** When the photo changes. */
  photoChange: PhotoChange;
  quote: boolean;
  shortcuts: boolean;
  weekStart: WeekStart;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  clock: '24h',
  dateFormat: 'long',
  photos: true,
  photoThemes: ['nature', 'mountains', 'sea'],
  photoChange: 'day',
  quote: true,
  shortcuts: true,
  weekStart: 'monday',
};

const CHOICES: { [K in keyof Settings]?: readonly Settings[K][] } = {
  theme: ['auto', 'light', 'dark'],
  clock: ['24h', '12h'],
  dateFormat: ['long', 'short', 'numeric'],
  photoChange: ['day', 'hour'],
  weekStart: ['monday', 'sunday'],
};

/** Read a stored record defensively: unknown keys are dropped, bad values fall back to the default. */
export function parseSettings(raw: unknown): Settings {
  const stored = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const result: Settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (key === 'photoThemes') {
      continue;
    }
    const value = stored[key];
    const choices = CHOICES[key] as readonly unknown[] | undefined;
    if (choices ? choices.includes(value) : typeof value === typeof DEFAULT_SETTINGS[key]) {
      (result as unknown as Record<string, unknown>)[key] = value;
    }
  }
  const themes = Array.isArray(stored['photoThemes'])
    ? PHOTO_THEME_IDS.filter((id) => (stored['photoThemes'] as unknown[]).includes(id))
    : [];
  result.photoThemes = themes.length > 0 ? themes : [...DEFAULT_SETTINGS.photoThemes];
  migratePhotoSource(stored, result);
  return result;
}

/** 3.0's single "photo of the day" source, read once into the photo settings that replaced it. */
function migratePhotoSource(stored: Record<string, unknown>, result: Settings): void {
  const source = stored['photoSource'];
  if (source === undefined || 'photos' in stored || 'photoThemes' in stored) {
    return;
  }
  if (source === 'none') {
    result.photos = false;
  } else if (source === 'nasa') {
    result.photoThemes = ['space'];
  } else if (source === 'noteme') {
    result.photoThemes = ['noteme'];
  }
  // "Photo of the day" kept one photo a day.
  result.photoChange = 'day';
}

export function formatTime(date: Date, clock: ClockSetting, locale?: string): string {
  return date.toLocaleTimeString(
    locale,
    clock === '12h'
      ? { hour: 'numeric', minute: '2-digit', hour12: true }
      : { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
  );
}

export function formatDate(date: Date, format: DateFormat, locale?: string): string {
  switch (format) {
    case 'short':
      return date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
    case 'numeric':
      return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
    default:
      return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
}
