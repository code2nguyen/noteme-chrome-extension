import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, formatDate, formatTime, parseSettings } from './settings';

describe('parseSettings', () => {
  it('gives the defaults for nothing stored', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('garbage')).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values and drops bad or unknown ones', () => {
    const parsed = parseSettings({ theme: 'dark', clock: '13h', quote: false, shortcuts: 'yes', extra: 1 });
    expect(parsed).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark', quote: false });
    expect(parsed).not.toHaveProperty('extra');
  });
});

describe('formatTime', () => {
  const evening = new Date(2026, 9, 3, 21, 5);

  it('uses a 24-hour clock', () => {
    expect(formatTime(evening, '24h', 'en-GB')).toBe('21:05');
    expect(formatTime(new Date(2026, 9, 3, 0, 7), '24h', 'en-US')).toBe('00:07');
  });

  it('uses a 12-hour clock', () => {
    expect(formatTime(evening, '12h', 'en-US')).toMatch(/^9:05\sPM$/);
  });
});

describe('formatDate', () => {
  const day = new Date(2026, 9, 3);

  it('formats each style', () => {
    expect(formatDate(day, 'long', 'en-GB')).toBe('Saturday, 3 October 2026');
    expect(formatDate(day, 'short', 'en-GB')).toBe('Sat 3 Oct');
    expect(formatDate(day, 'numeric', 'en-GB')).toBe('03/10/2026');
  });
});
