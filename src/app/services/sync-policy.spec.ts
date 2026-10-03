import { describe, expect, it } from 'vitest';
import { ExtensionId } from '../extension-id';
import { DataType } from '../store/models/data-type';
import { syncsWithChromeProfile } from './sync-policy';

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
    expect(syncsWithChromeProfile('ITEM_DATA__a', { dataType: DataType.NA, empty: true })).toBe(false);
    expect(syncsWithChromeProfile('_ART_BOARD_ITEM__IDS', ['a', 'p'])).toBe(true);
    expect(syncsWithChromeProfile('NOTEME_SETTINGS', '{}')).toBe(true);
  });
});
