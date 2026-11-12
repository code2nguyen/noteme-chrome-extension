import { describe, expect, it } from 'vitest';
import '../app/i18n/messages/all';
import { escapeXml, omniboxIndex, omniboxNotes, omniboxSuggestions, omniboxTarget } from './omnibox';

const BASE = 'chrome-extension://abc/index.html';
const dates = { createdDate: '2026-03-01T10:00:00.000Z', modifiedDate: '2026-03-01T10:00:00.000Z' };
const record = (value: unknown) => JSON.stringify(value);
const card = (id: string, extensionId: string, onBoard = true) =>
  record({ id, extensionId, ...(onBoard ? { boardId: 'defaultArtBoard' } : {}), properties: {}, ...dates });

const stored: Record<string, unknown> = {
  ART_BOARD_ITEM__note: card('note', 'ntm-text-note-element'),
  ITEM_DATA__note: record({
    id: 'note',
    dataType: 'markdown',
    empty: false,
    data: '- [ ] oat **milk**\neggs',
    ...dates,
  }),
  ART_BOARD_ITEM__page: card('page', 'ntm-page', false),
  ITEM_DATA__page: record({
    id: 'page',
    dataType: 'page',
    empty: false,
    data: '# Itinerary\nLisbon <then> Porto',
    properties: { title: 'Trip & plans' },
    ...dates,
  }),
  ART_BOARD_ITEM__list: card('list', 'ntm-todo-list', false),
  ITEM_DATA__list: record({
    id: 'list',
    dataType: 'todo',
    empty: false,
    data: '[]',
    properties: { title: 'Chores' },
    ...dates,
  }),
  // 2.x: a Quill note, and a code note Noteme no longer has.
  ART_BOARD_ITEM__quill: card('quill', 'ntm-text-note-element'),
  ITEM_DATA__quill: {
    id: 'quill',
    dataType: 'delta',
    empty: false,
    data: { ops: [{ insert: 'Old milk note\n' }] },
    ...dates,
  },
  ART_BOARD_ITEM__code: card('code', 'ntm-code-note-element'),
  ITEM_DATA__code: record({ id: 'code', dataType: 'text', empty: false, data: 'milk()', ...dates }),
  // Nothing written, no card, and a record that is not JSON.
  ART_BOARD_ITEM__empty: card('empty', 'ntm-text-note-element'),
  ITEM_DATA__empty: record({ id: 'empty', dataType: 'NA', empty: true, data: null, ...dates }),
  ITEM_DATA__orphan: record({ id: 'orphan', dataType: 'markdown', empty: false, data: 'milk', ...dates }),
  ART_BOARD_ITEM__broken: card('broken', 'ntm-text-note-element'),
  ITEM_DATA__broken: '{not json',
  PLAN__ITEMS: record({ items: [] }),
};

describe('omniboxNotes', () => {
  const notes = omniboxNotes(stored);
  const byId = Object.fromEntries(notes.map((note) => [note.id, note]));

  it('reads the notes with words in them, and leaves the rest out', () => {
    expect(Object.keys(byId).sort()).toEqual(['list', 'note', 'page']);
  });

  it('labels a note by its first line, as text', () => {
    expect(byId['note']).toMatchObject({ kind: 'Note', label: 'oat milk', archived: false });
    expect(byId['page']).toMatchObject({ kind: 'Page', label: 'Trip & plans', archived: true });
  });

  it('opens a page full screen, a note on the board and an archived list in the Archive', () => {
    expect(byId['note'].path).toBe('#/main-board?show=note');
    expect(byId['page'].path).toBe('#/page/page?from=archive');
    expect(byId['list'].path).toBe('#/main-board?view=archive');
  });

  it('reads a 2.x Quill note stored as an object, as the app does', () => {
    const legacy = { ...stored, ITEM_DATA__quill: record(stored['ITEM_DATA__quill']) };
    expect(omniboxNotes(legacy).find((note) => note.id === 'quill')).toMatchObject({ label: 'Old milk note' });
  });
});

describe('omniboxSuggestions', () => {
  const index = omniboxIndex(omniboxNotes(stored));

  it('finds a word anywhere in a note and holds the address it opens', () => {
    expect(omniboxSuggestions(index, 'porto', BASE, 'en')).toEqual([
      { content: `${BASE}#/page/page?from=archive`, description: 'Trip &amp; plans <dim>Paper · Archive</dim>' },
    ]);
  });

  it('says the kind in the language', () => {
    expect(omniboxSuggestions(index, 'milk', BASE, 'fr')[0].description).toBe('oat milk <dim>Note</dim>');
  });

  it('has nothing for no words, or words no note holds', () => {
    expect(omniboxSuggestions(index, '  ', BASE, 'en')).toEqual([]);
    expect(omniboxSuggestions(index, 'zeppelin', BASE, 'en')).toEqual([]);
  });
});

describe('escapeXml', () => {
  it('keeps a note from writing markup in its row', () => {
    expect(escapeXml(`<match>a</match> & "b" 'c'`)).toBe(
      '&lt;match&gt;a&lt;/match&gt; &amp; &quot;b&quot; &apos;c&apos;',
    );
  });
});

describe('omniboxTarget', () => {
  it('opens the address of a row picked', () => {
    expect(omniboxTarget(`${BASE}#/page/p1`, BASE)).toBe(`${BASE}#/page/p1`);
  });

  it('searches the board for words entered as they are', () => {
    expect(omniboxTarget(' oat milk & eggs ', BASE)).toBe(`${BASE}#/main-board?search=1&q=oat%20milk%20%26%20eggs`);
    expect(omniboxTarget('  ', BASE)).toBe(`${BASE}#/main-board?search=1`);
  });

  it('never opens another address, typed or pasted', () => {
    expect(omniboxTarget('https://example.com/#/', BASE)).toBe(
      `${BASE}#/main-board?search=1&q=https%3A%2F%2Fexample.com%2F%23%2F`,
    );
    expect(omniboxTarget('javascript:alert(1)', BASE)).toContain(`${BASE}#/main-board?search=1&q=`);
  });
});
