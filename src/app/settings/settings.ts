/** What a person can set up. Stored as one small record, so it fits chrome.storage.sync and follows the profile. */
export type ThemeSetting = 'auto' | 'light' | 'dark';
export type ClockSetting = '24h' | '12h';
export type DateFormat = 'long' | 'short' | 'numeric';
export type PhotoSource = 'wikimedia' | 'nasa' | 'noteme' | 'none';
export type WeekStart = 'monday' | 'sunday';

export interface Settings {
  theme: ThemeSetting;
  clock: ClockSetting;
  dateFormat: DateFormat;
  photoSource: PhotoSource;
  quote: boolean;
  shortcuts: boolean;
  weekStart: WeekStart;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  clock: '24h',
  dateFormat: 'long',
  photoSource: 'wikimedia',
  quote: true,
  shortcuts: true,
  weekStart: 'monday',
};

const CHOICES: { [K in keyof Settings]?: readonly Settings[K][] } = {
  theme: ['auto', 'light', 'dark'],
  clock: ['24h', '12h'],
  dateFormat: ['long', 'short', 'numeric'],
  photoSource: ['wikimedia', 'nasa', 'noteme', 'none'],
  weekStart: ['monday', 'sunday'],
};

/** Read a stored record defensively: unknown keys are dropped, bad values fall back to the default. */
export function parseSettings(raw: unknown): Settings {
  const stored = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const result: Settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const value = stored[key];
    const choices = CHOICES[key] as readonly unknown[] | undefined;
    if (choices ? choices.includes(value) : typeof value === typeof DEFAULT_SETTINGS[key]) {
      (result as unknown as Record<string, unknown>)[key] = value;
    }
  }
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
