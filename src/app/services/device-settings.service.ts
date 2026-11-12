import { computed, effect, inject, Injectable, signal } from '@angular/core';

import { hasFeature } from '../settings/settings';
import { SettingsService } from '../settings/settings.service';
import {
  DEFAULT_DEVICE_SETTINGS,
  DEVICE_SETTINGS_KEY,
  DeviceSettings,
  parseDeviceSettings,
  ReminderLead,
} from './device-settings';

type Reminders = Pick<DeviceSettings, 'reminders' | 'reminderLead'>;

const NOTIFICATIONS: chrome.permissions.Permissions = { permissions: ['notifications'] };

/**
 * Keeps the record the background worker reads (device-settings.ts) in step with the settings: the language, the
 * clock and whether Plan is on are copied into it as they change; the reminders are set here, since they are this
 * device's (their permission is granted on it) and are not part of the synced settings. Only in the extension:
 * `ng serve` has no worker.
 */
@Injectable({ providedIn: 'root' })
export class DeviceSettingsService {
  private readonly settings = inject(SettingsService).settings;
  /** Reminders exist: the extension, with its worker and chrome.alarms. */
  readonly supported =
    typeof chrome !== 'undefined' && !!chrome.storage?.local && !!chrome.alarms && !!chrome.permissions;
  /** Unset until the stored record is read: nothing is written before, or the reminders would be switched off. */
  private readonly stored = signal<Reminders | null>(null);
  private written = '';

  readonly reminders = computed(() => this.stored()?.reminders ?? false);
  readonly reminderLead = computed(() => this.stored()?.reminderLead ?? DEFAULT_DEVICE_SETTINGS.reminderLead);

  constructor() {
    if (!this.supported) {
      return;
    }
    void this.read();
    // Another tab's change.
    chrome.storage.onChanged.addListener((changes, area) => {
      const change = changes[DEVICE_SETTINGS_KEY];
      if (area === 'local' && change && typeof change.newValue === 'string' && change.newValue !== this.written) {
        this.written = change.newValue;
        this.adopt(parseDeviceSettings(change.newValue));
      }
    });
    effect(() => {
      const reminders = this.stored();
      if (!reminders) {
        return;
      }
      const settings = this.settings();
      const record: DeviceSettings = {
        language: settings.language,
        clock: settings.clock,
        plan: hasFeature(settings, 'plan'),
        ...reminders,
      };
      const serialized = JSON.stringify(record);
      if (serialized !== this.written) {
        this.written = serialized;
        chrome.storage.local
          .set({ [DEVICE_SETTINGS_KEY]: serialized })
          .catch((error: unknown) => console.error('Could not save the reminders', error));
      }
    });
  }

  /** Switching reminders on asks Chrome for the notifications permission; a refusal leaves them off. */
  async setReminders(on: boolean): Promise<boolean> {
    const granted = on && (await chrome.permissions.request(NOTIFICATIONS).catch(() => false));
    this.stored.update((current) => ({ reminderLead: this.reminderLead(), ...current, reminders: granted }));
    return granted;
  }

  setReminderLead(reminderLead: ReminderLead): void {
    this.stored.update((current) => ({ reminders: this.reminders(), ...current, reminderLead }));
  }

  private async read(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(DEVICE_SETTINGS_KEY);
      const raw = stored[DEVICE_SETTINGS_KEY];
      const parsed = parseDeviceSettings(raw);
      // The permission taken back in Chrome's own settings: reminders are off, and say so.
      const granted = parsed.reminders && (await chrome.permissions.contains(NOTIFICATIONS));
      // A change made here while this was read wins.
      if (!this.stored()) {
        this.written = typeof raw === 'string' ? raw : '';
        this.adopt({ ...parsed, reminders: granted });
      }
    } catch (error) {
      // Not read: nothing is written, so what is stored stays as it is.
      console.error('Could not read the reminders', error);
    }
  }

  private adopt({ reminders, reminderLead }: Reminders): void {
    this.stored.set({ reminders, reminderLead });
  }
}
