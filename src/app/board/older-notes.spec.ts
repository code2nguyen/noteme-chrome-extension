import { describe, expect, it } from 'vitest';
import { ExtensionId } from '../extension-id';
import { noteDefaultProperties } from '../note-config';
import { DataType } from '../store/models/data-type';
import { ArtBoardItem, ItemData } from '../store/models';
import { groupByMonth, plainLine, rearrange, splitBoard, summarize } from './older-notes';

const day = (n: number) => `2026-09-${String(n).padStart(2, '0')}T10:00:00.000Z`;

/** A note at `order` on the board, last written on September `edited`. */
const note = (id: string, order: number, starred = false, kind = ExtensionId.TextNote): ArtBoardItem => ({
  ...structuredClone(noteDefaultProperties[kind]),
  id,
  starred,
  gridPosition: { ...noteDefaultProperties[kind].gridPosition, order },
  // A layout change moves a note's own date: only its text's date counts.
  modifiedDate: '2030-01-01T00:00:00.000Z',
});

const written = (id: string, edited: number, data = id): ItemData =>
  ({ id, data, dataType: DataType.MARKDOWN, modifiedDate: day(edited), empty: false }) as ItemData;

describe('splitBoard', () => {
  // a..e in the board's order; e was written last, a first.
  const items = ['a', 'b', 'c', 'd', 'e'].map((id, index) => note(id, index));
  const data = Object.fromEntries(items.map((item, index) => [item.id, written(item.id, index + 1)]));

  it('keeps the most recently written notes on the board, in its order, and the rest newest first', () => {
    const { shown, older } = splitBoard(items, data, new Set(), 3);
    expect(shown.map((item) => item.id)).toEqual(['c', 'd', 'e']);
    expect(older.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('shows pinned notes first, whatever their age, and they do not count against the recent ones', () => {
    const withPin = items.map((item) => (item.id === 'a' ? { ...item, starred: true } : item));
    const { shown, older } = splitBoard(withPin, data, new Set(), 3);
    expect(shown.map((item) => item.id)).toEqual(['a', 'c', 'd', 'e']);
    expect(older.map((item) => item.id)).toEqual(['b']);
  });

  it('counts a note just restored from the Archive as recent', () => {
    const restored = items.map((item) => (item.id === 'a' ? { ...item, restoredDate: day(30) } : item));
    expect(splitBoard(restored, data, new Set(), 2).shown.map((item) => item.id)).toEqual(['a', 'e']);
  });

  it('shows a note revealed this session, and counts a never-written note by its own date', () => {
    const fresh = { ...note('f', -1), modifiedDate: day(30) };
    const { shown } = splitBoard([fresh, ...items], data, new Set(['a']), 2);
    expect(shown.map((item) => item.id)).toEqual(['f', 'a', 'e']);
  });
});

describe('summarize and groupByMonth', () => {
  it('reads a line without its list marker or checkbox', () => {
    expect(plainLine('- [ ] oat milk')).toBe('oat milk');
    expect(plainLine('1. [x] oat milk')).toBe('oat milk');
    // A numbered task whose number the page editor already dropped.
    expect(plainLine('[ ] oat milk')).toBe('oat milk');
    expect(plainLine('  2) rice ')).toBe('rice');
    expect(plainLine('[link](url) stays')).toBe('[link](url) stays');
  });

  it('takes the first line as the label and the rest as the excerpt', () => {
    const summary = summarize(note('a', 0), { a: written('a', 4, 'Groceries\n- [ ] oat milk\n- [ ] rice') });
    expect(summary).toMatchObject({ kind: 'Note', label: 'Groceries', edited: day(4) });
    expect(summary.excerpt).toBe('oat milk · rice');
    expect(summarize(note('p', 0, false, ExtensionId.Page), {}).label).toBe('Untitled page');
  });

  it('groups notes by the month they were last edited, naming the year only when it is not this one', () => {
    const groups = groupByMonth(
      [{ edited: day(20) }, { edited: day(2) }, { edited: '2025-12-24T10:00:00.000Z' }],
      new Date('2026-10-07T00:00:00.000Z'),
    );
    expect(groups.map((group) => group.items.length)).toEqual([2, 1]);
    expect(groups[1].label).toMatch(/2025/);
    expect(groups[0].label).not.toMatch(/2026/);
  });
});

describe('rearrange', () => {
  it('reuses the order values the shown cards held, keeping pinned ones first', () => {
    // Shown cards held orders 2, 5 and 9 (the hidden notes keep the others); the user put c first.
    const arranged = [note('c', 9), note('p', 5, true), note('b', 2)];
    expect(rearrange(arranged).map(({ item, order }) => [item.id, order])).toEqual([
      ['p', 2],
      ['c', 5],
      ['b', 9],
    ]);
  });
});
