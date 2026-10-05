import { describe, expect, it } from 'vitest';

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
    expect(cardRows(page, 0)).toBe(3);
    expect(cardRows(page, 100)).toBe(5);
    expect(cardRows(page, 5000)).toBe(6);
  });

  it('a page resized to any height keeps it, the tallest excerpt height included', () => {
    const page = newItem(ExtensionId.Page);
    for (const rows of [2, 4, 6, 9]) {
      const stored = storedRows(page, rows, 0);
      expect(cardRows({ ...page, gridPosition: { ...page.gridPosition, rows: stored } }, 0)).toBe(rows);
    }
  });

  it('a page card left at its excerpt height keeps following it', () => {
    const page = newItem(ExtensionId.Page);
    expect(storedRows(page, cardRows(page, 100), 100)).toBe(page.gridPosition.rows);
  });

  it('notes and flows keep their stored height', () => {
    expect(cardRows(newItem(ExtensionId.TextNote), 0)).toBe(10);
    expect(storedRows(newItem(ExtensionId.Flow), 7, 0)).toBe(7);
  });
});
