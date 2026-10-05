import { describe, expect, it } from 'vitest';
import { ExtensionId } from '../extension-id';
import { DataType } from '../store/models/data-type';
import { CHROME_SYNC_ITEM_BYTES, fitsChromeSyncItem, syncsWithChromeProfile } from './sync-policy';

describe('syncsWithChromeProfile', () => {
  it('syncs notes', () => {
    expect(syncsWithChromeProfile('ART_BOARD_ITEM__a', { extensionId: ExtensionId.TextNote })).toBe(true);
    expect(syncsWithChromeProfile('ART_BOARD_ITEM__a', {})).toBe(true); // a 1.x note, no kind recorded
    expect(syncsWithChromeProfile('ITEM_DATA__a', { dataType: DataType.MARKDOWN, empty: false })).toBe(true);
    expect(syncsWithChromeProfile('ITEM_DATA__a', { dataType: DataType.DELTA, empty: false })).toBe(true);
  });

  it('keeps pages and flows on the device', () => {
    expect(syncsWithChromeProfile('ART_BOARD_ITEM__f', { extensionId: ExtensionId.Flow })).toBe(false);
    expect(syncsWithChromeProfile('ITEM_DATA__f', { dataType: DataType.FLOW, empty: false })).toBe(false);
    expect(syncsWithChromeProfile('ART_BOARD_ITEM__p', { extensionId: ExtensionId.Page })).toBe(false);
    expect(syncsWithChromeProfile('PLAN__ITEMS', { items: [] })).toBe(false);
    expect(syncsWithChromeProfile('ITEM_DATA__p', { dataType: DataType.PAGE, empty: false })).toBe(false);
  });

  it('does not sync an empty record, and syncs index lists and other records', () => {
    expect(syncsWithChromeProfile('ITEM_DATA__a', { dataType: DataType.MARKDOWN, empty: true })).toBe(false);
    expect(syncsWithChromeProfile('_ART_BOARD_ITEM__IDS', ['a', 'p'])).toBe(true);
    expect(syncsWithChromeProfile('NOTEME_SETTINGS', '{}')).toBe(true);
  });
});

describe('fitsChromeSyncItem', () => {
  const key = 'ITEM_DATA__a';
  // What the queue hands chrome.storage.sync: the record's JSON, which Chrome serializes again to measure it.
  const sent = (data: string) => JSON.stringify({ id: 'a', data });
  const size = (data: string) => new TextEncoder().encode(key + JSON.stringify(sent(data))).length;

  it('measures the key and the value as Chrome receives it, up to the item quota', () => {
    const exact = 'x'.repeat(CHROME_SYNC_ITEM_BYTES - size(''));
    expect(size(exact)).toBe(CHROME_SYNC_ITEM_BYTES);
    expect(fitsChromeSyncItem(key, sent(exact))).toBe(true);
    expect(fitsChromeSyncItem(key, sent(exact + 'x'))).toBe(false);
  });

  it('counts the escapes added by the second serialization and multi-byte characters', () => {
    // Each quote is escaped twice over (\\\" = 4 bytes once sent); each é is 2 bytes of UTF-8.
    expect(fitsChromeSyncItem(key, sent('"'.repeat(2100)))).toBe(false);
    expect(fitsChromeSyncItem(key, sent('é'.repeat(4100)))).toBe(false);
    expect(fitsChromeSyncItem(key, sent('e'.repeat(4100)))).toBe(true);
  });
});
