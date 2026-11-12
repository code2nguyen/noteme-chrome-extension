import { describe, expect, it } from 'vitest';
import { DEFAULT_DEVICE_SETTINGS, parseDeviceSettings } from './device-settings';

describe('parseDeviceSettings', () => {
  it('reads the stored record', () => {
    const record = { language: 'vi', clock: '12h', plan: true, reminders: true, reminderLead: 30 };
    expect(parseDeviceSettings(JSON.stringify(record))).toEqual(record);
  });

  it('falls back to the defaults for nothing stored, a corrupt record and bad values', () => {
    expect(parseDeviceSettings(undefined)).toEqual(DEFAULT_DEVICE_SETTINGS);
    expect(parseDeviceSettings('{not json')).toEqual(DEFAULT_DEVICE_SETTINGS);
    expect(parseDeviceSettings('null')).toEqual(DEFAULT_DEVICE_SETTINGS);
    expect(
      parseDeviceSettings(JSON.stringify({ language: 'xx', clock: 7, plan: 'yes', reminders: 1, reminderLead: 7 })),
    ).toEqual(DEFAULT_DEVICE_SETTINGS);
  });

  it('has reminders off until they are switched on', () => {
    expect(DEFAULT_DEVICE_SETTINGS.reminders).toBe(false);
  });
});
