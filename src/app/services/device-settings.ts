import { LANGUAGES, LanguageSetting } from '../i18n/language';
import type { ClockSetting } from '../settings/settings';

/**
 * What the background worker needs to know and cannot read itself: the settings live in localStorage, which a service
 * worker has no access to. The app keeps this record in chrome.storage.local, as a JSON string like every other. It is
 * this device's (the reminders need a permission granted on it) and never syncs: no `DEVICE__` key does.
 */
export const DEVICE_SETTINGS_KEY = 'DEVICE__SETTINGS';

/** How long before a plan starts its reminder comes, in minutes: the choices in Settings. */
export const REMINDER_LEADS = [0, 5, 10, 15, 30, 60] as const;
export type ReminderLead = (typeof REMINDER_LEADS)[number];

export interface DeviceSettings {
  /** Noteme's language, as set (Auto follows the browser). */
  language: LanguageSetting;
  clock: ClockSetting;
  /** The Plan feature is switched on. */
  plan: boolean;
  /** Notifications for plans, switched on in Settings › Plan. */
  reminders: boolean;
  reminderLead: ReminderLead;
}

export const DEFAULT_DEVICE_SETTINGS: DeviceSettings = {
  language: 'auto',
  clock: '24h',
  plan: false,
  reminders: false,
  reminderLead: 10,
};

/** Read the stored record defensively (a JSON string, or nothing yet): bad values fall back to the default. */
export function parseDeviceSettings(raw: unknown): DeviceSettings {
  let stored: Record<string, unknown> = {};
  try {
    const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : null;
    stored = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  } catch {
    // A corrupt record reads as the defaults.
  }
  const language = stored['language'];
  const lead = stored['reminderLead'];
  return {
    language:
      language === 'auto' || LANGUAGES.includes(language as (typeof LANGUAGES)[number])
        ? (language as LanguageSetting)
        : DEFAULT_DEVICE_SETTINGS.language,
    clock: stored['clock'] === '12h' ? '12h' : '24h',
    plan: stored['plan'] === true,
    reminders: stored['reminders'] === true,
    reminderLead: REMINDER_LEADS.includes(lead as ReminderLead)
      ? (lead as ReminderLead)
      : DEFAULT_DEVICE_SETTINGS.reminderLead,
  };
}
