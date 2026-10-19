import { describe, expect, it, vi } from 'vitest';

import { ExtensionId } from '../extension-id';
import { noteDefaultProperties } from '../note-config';
import { ArtBoardItem } from '../store/models';
import { cardRows, storedRows } from './card-rows';

const newItem = (kind: ExtensionId, rows?: number): ArtBoardItem => {
  const defaults = structuredClone(noteDefaultProperties[kind]);
  return {
    ...defaults,
    id: 'x',
    modifiedDate: '2026-01-01T00:00:00.000Z',
    gridPosition: { ...defaults.gridPosition, ...(rows === undefined ? {} : { rows }) },
  };
};

describe('card rows', () => {
  it('a new page card is as tall as its excerpt', () => {
    const page = newItem(ExtensionId.Page);
    expect(cardRows(page, () => 0)).toBe(3);
    expect(cardRows(page, () => 100)).toBe(5);
    expect(cardRows(page, () => 5000)).toBe(6);
  });

  it('a page resized to any height keeps it, the tallest excerpt height included', () => {
    const page = newItem(ExtensionId.Page);
    for (const rows of [2, 4, 6, 9]) {
      const stored = storedRows(page, rows, () => 0);
      expect(cardRows({ ...page, gridPosition: { ...page.gridPosition, rows: stored } }, () => 0)).toBe(rows);
    }
  });

  it('a page card left at its excerpt height keeps following it', () => {
    const page = newItem(ExtensionId.Page);
    expect(
      storedRows(
        page,
        cardRows(page, () => 100),
        () => 100,
      ),
    ).toBe(page.gridPosition.rows);
  });

  it('notes and flows keep their stored height', () => {
    expect(cardRows(newItem(ExtensionId.TextNote), () => 0)).toBe(10);
    expect(storedRows(newItem(ExtensionId.Flow), 7, () => 0)).toBe(7);
  });

  it('a new sheet card is as tall as its rows, up to twelve, until it is resized', () => {
    const sheet = newItem(ExtensionId.Sheet);
    expect(cardRows(sheet, () => 3)).toBe(8);
    expect(cardRows(sheet, () => 12)).toBe(16);
    expect(cardRows(sheet, () => 40)).toBe(16);
    expect(storedRows(sheet, 8, () => 3)).toBe(0);
    expect(storedRows(sheet, 11, () => 3)).toBe(11);
    expect(cardRows(newItem(ExtensionId.Sheet, 11), () => 3)).toBe(11);
  });

  it('reads a page text only for a card that follows its excerpt', () => {
    const length = vi.fn(() => 100);
    cardRows(newItem(ExtensionId.Page, 4), length);
    storedRows(newItem(ExtensionId.Page, 4), 5, length);
    cardRows(newItem(ExtensionId.TextNote), length);
    storedRows(newItem(ExtensionId.Flow), 7, length);
    expect(length).not.toHaveBeenCalled();
    cardRows(newItem(ExtensionId.Page), length);
    expect(length).toHaveBeenCalledTimes(1);
  });
});
