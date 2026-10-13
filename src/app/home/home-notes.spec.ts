import { describe, expect, it } from 'vitest';
import { ExtensionId } from '../extension-id';
import { noteDefaultProperties } from '../note-config';
import { DataType } from '../store/models/data-type';
import { ArtBoardItem, ItemData } from '../store/models';
import { homeNotes } from './home-notes';

const day = (n: number) => `2026-09-${String(n).padStart(2, '0')}T10:00:00.000Z`;

const note = (id: string, extra: Partial<ArtBoardItem> = {}, kind = ExtensionId.TextNote): ArtBoardItem => ({
  ...structuredClone(noteDefaultProperties[kind]),
  id,
  modifiedDate: '2030-01-01T00:00:00.000Z',
  ...extra,
});

const written = (id: string, edited: number, data = `${id} title\n- first\n- [x] second`): ItemData =>
  ({ id, data, dataType: DataType.MARKDOWN, modifiedDate: day(edited), empty: false }) as ItemData;

// a was written first, e last; b and d are pinned, d before b.
const items = [
  note('a'),
  note('b', { starred: true, starredDate: day(20) }),
  note('c'),
  note('d', { starred: true, starredDate: day(10) }),
  note('e'),
];
const data = Object.fromEntries(items.map((item, index) => [item.id, written(item.id, index + 1)]));
const ids = (setting: Parameters<typeof homeNotes>[2], list = items, notes = data) =>
  homeNotes(list, notes, setting).map((shown) => shown.id);

describe('homeNotes', () => {
  it('shows the pinned notes first, newest pin first, then the others by last edit (Auto)', () => {
    expect(ids('auto')).toEqual(['b', 'd', 'e', 'c', 'a']);
  });

  it('shows the pinned notes only (Pinned), and none when nothing is pinned', () => {
    expect(ids('pinned')).toEqual(['b', 'd']);
    expect(
      ids(
        'pinned',
        items.map((item) => ({ ...item, starred: false })),
      ),
    ).toEqual([]);
  });

  it('orders every note by last edit, pins ignored (Edited)', () => {
    expect(ids('edited')).toEqual(['e', 'd', 'c', 'b', 'a']);
  });

  it('shows nothing when switched off', () => {
    expect(ids('off')).toEqual([]);
  });

  it('orders a note pinned before pin dates were recorded by its last edit', () => {
    const legacy = [...items, note('f', { starred: true })];
    expect(ids('pinned', legacy, { ...data, f: written('f', 15) })).toEqual(['b', 'f', 'd']);
  });

  it('leaves out notes with nothing written in them', () => {
    const blank = { ...written('c', 3, ''), empty: true };
    const spaces = written('e', 5, '   \n  ');
    expect(ids('edited', items, { ...data, c: blank, e: spaces })).toEqual(['d', 'b', 'a']);
    expect(ids('edited', [...items, note('unread')])).toEqual(['e', 'd', 'c', 'b', 'a']);
  });

  it('reads the first line as the title, the next ones as plain lines, and the paper of a quick note', () => {
    const [shown] = homeNotes([note('a', { colorIndex: 3 })], data, 'auto');
    expect(shown).toMatchObject({
      title: 'a title',
      lines: ['first', 'second'],
      paper: 'blue',
      pinned: false,
      kind: 'Note',
    });
    const [list] = homeNotes([note('a', { colorIndex: 3 }, ExtensionId.TodoList)], data, 'auto');
    expect(list.paper).toBe('default');
  });
});
