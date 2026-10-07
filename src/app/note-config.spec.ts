import { describe, expect, it } from 'vitest';
import { ExtensionId } from './extension-id';
import { latestNotePaper, noteDefaultProperties } from './note-config';
import { ArtBoardItem } from './store/models';

const note = (id: string, colorIndex: number, properties: ArtBoardItem['properties'], kind = ExtensionId.TextNote) => ({
  ...structuredClone(noteDefaultProperties[kind]),
  id,
  colorIndex,
  properties,
  // Every layout change moves a note's own date: it must not count.
  modifiedDate: '2030-01-01T00:00:00.000Z',
});

describe('latestNotePaper', () => {
  it('copies the paper of the note whose paper was changed last', () => {
    const notes = [
      note('a', 1, { pad: 'sticky', paper: 'lined', paperModifiedDate: '2026-10-01T10:00:00.000Z' }),
      note('b', 3, { pad: 'legal', paper: 'grid', paperModifiedDate: '2026-10-05T10:00:00.000Z' }),
      note('c', 4, {}),
    ];
    expect(latestNotePaper(notes)).toEqual({ colorIndex: 3, properties: { pad: 'legal', paper: 'grid' } });
  });

  it('ignores pages and flows, and has nothing until a note has had its paper changed', () => {
    expect(latestNotePaper([note('a', 2, {})])).toBeUndefined();
    const page = note('p', 5, { paperModifiedDate: '2026-10-06T10:00:00.000Z' }, ExtensionId.Page);
    expect(latestNotePaper([page])).toBeUndefined();
  });
});
