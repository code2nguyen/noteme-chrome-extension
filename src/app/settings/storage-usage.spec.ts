import { describe, expect, it } from 'vitest';
import { formatBytes, waitingNotes } from './storage-usage';

describe('formatBytes', () => {
  it('starts at kilobytes, with one decimal while the number is short', () => {
    expect(formatBytes(0, 'en')).toBe('0 kB');
    expect(formatBytes(329, 'en')).toBe('0.3 kB');
    expect(formatBytes(5_000, 'en')).toBe('4.9 kB');
    expect(formatBytes(12_800, 'en')).toBe('13 kB');
    expect(formatBytes(102_400, 'en')).toBe('100 kB');
  });

  it('moves on to megabytes and gigabytes', () => {
    expect(formatBytes(1.44 * 1024 ** 2, 'en')).toBe('1.4 MB');
    expect(formatBytes(340 * 1024 ** 2, 'en')).toBe('340 MB');
    expect(formatBytes(2.5 * 1024 ** 3, 'en')).toBe('2.5 GB');
  });

  it('writes the unit and the decimals as the language does', () => {
    expect(formatBytes(1.44 * 1024 ** 2, 'fr')).toMatch(/^1,4\sMo$/);
  });

  it('reads a negative size as nothing', () => {
    expect(formatBytes(-5, 'en')).toBe('0 kB');
  });
});

describe('waitingNotes', () => {
  it('counts a note once, whether its card, its text or both wait', () => {
    expect(
      waitingNotes([
        'SYNC__RETRY__ITEM_DATA__a',
        'SYNC__RETRY__ART_BOARD_ITEM__a',
        'SYNC__RETRY__ITEM_DATA__b',
        'SYNC__RETRY___ART_BOARD_ITEM__IDS',
        'ITEM_DATA__c',
      ]),
    ).toBe(2);
    expect(waitingNotes([])).toBe(0);
  });
});
