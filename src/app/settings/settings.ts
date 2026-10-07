import { PHOTO_THEME_IDS, PhotoChange, PhotoTheme } from '../home/background';

/** What a person can set up. Stored as one small record, so it fits chrome.storage.sync and follows the profile. */
export type ThemeSetting = 'auto' | 'light' | 'dark';
export type ClockSetting = '24h' | '12h';
export type DateFormat = 'long' | 'short' | 'numeric';
export type WeekStart = 'monday' | 'sunday';

/** Optional parts of Noteme, switched on or off in Settings. Plan is the first; more will join it. */
export type Feature = 'plan';

export const FEATURES: readonly { id: Feature; label: string; description: string }[] = [
  { id: 'plan', label: 'Plan', description: 'A week and month calendar for what you plan to do' },
];

export function hasFeature(settings: Settings, feature: Feature): boolean {
  return settings.features.includes(feature);
}

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
  /** The optional features switched on; may be none. */
  features: Feature[];
}

export const DEFAULT_SETTINGS: Settings = {
  // Dark until the user picks another theme, whatever the system's.
  theme: 'dark',
  clock: '24h',
  dateFormat: 'long',
  photos: true,
  photoThemes: ['nature', 'mountains', 'sea'],
  photoChange: 'day',
  quote: true,
  shortcuts: true,
  weekStart: 'monday',
  // Every feature is opt-in: switched on in Settings.
  features: [],
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
    if (key === 'photoThemes' || key === 'features') {
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
  // Known features only, in their own order; none at all is a choice, nothing stored is the default.
  const features = stored['features'];
  result.features = Array.isArray(features)
    ? FEATURES.map((feature) => feature.id).filter((id) => features.includes(id))
    : [...DEFAULT_SETTINGS.features];
  return result;
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
