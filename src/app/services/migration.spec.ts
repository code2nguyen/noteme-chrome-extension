import { describe, expect, it } from 'vitest';
import { ExtensionId } from '../extension-id';
import { ArtBoardItem, ItemData } from '../store/models';
import { DataType } from '../store/models/data-type';
import { deltaToMarkdown, isSupportedNote, normalizeArtBoardItem, normalizeItemData } from './migration';
import { getText } from './utils';

const itemData = (data: unknown, dataType: DataType): ItemData => ({
  id: 'a',
  data: data as string,
  dataType,
  empty: false,
  createdDate: '2020-01-01T00:00:00.000Z',
  modifiedDate: '2020-01-01T00:00:00.000Z',
});

describe('deltaToMarkdown', () => {
  it('keeps plain lines, one per line', () => {
    expect(deltaToMarkdown({ ops: [{ insert: 'first\nsecond\n' }] })).toBe('first\nsecond');
  });

  it('keeps blank lines between paragraphs', () => {
    expect(deltaToMarkdown({ ops: [{ insert: 'a\n\nb\n' }] })).toBe('a\n\nb');
  });

  it('converts inline formats to the notepad delimiters', () => {
    const delta = {
      ops: [
        { insert: 'plain ' },
        { insert: 'bold', attributes: { bold: true } },
        { insert: ' ' },
        { insert: 'it', attributes: { italic: true } },
        { insert: ' ' },
        { insert: 'u', attributes: { underline: true } },
        { insert: ' ' },
        { insert: 'gone', attributes: { strike: true } },
        { insert: '\n' },
      ],
    };
    expect(deltaToMarkdown(delta)).toBe('plain **bold** *it* <u>u</u> ~~gone~~');
  });

  it('keeps whitespace outside the delimiters', () => {
    expect(deltaToMarkdown({ ops: [{ insert: ' word ', attributes: { bold: true } }, { insert: '\n' }] })).toBe(
      ' **word** ',
    );
  });

  it('turns Quill checklists into notepad tasks and numbers ordered lists', () => {
    const delta = {
      ops: [
        { insert: 'done' },
        { insert: '\n', attributes: { list: 'checked' } },
        { insert: 'todo' },
        { insert: '\n', attributes: { list: 'unchecked' } },
        { insert: 'one' },
        { insert: '\n', attributes: { list: 'ordered' } },
        { insert: 'two' },
        { insert: '\n', attributes: { list: 'ordered' } },
        { insert: 'dot' },
        { insert: '\n', attributes: { list: 'bullet' } },
      ],
    };
    expect(deltaToMarkdown(delta)).toBe('- [x] done\n- [ ] todo\n1. one\n2. two\n• dot');
  });

  it('applies one block attribute to every line a newline run closes', () => {
    expect(deltaToMarkdown({ ops: [{ insert: 'a' }, { insert: '\n', attributes: { header: 1 } }] })).toBe('**a**');
  });

  it('keeps link targets and drops embeds', () => {
    const delta = {
      ops: [
        { insert: 'site', attributes: { link: 'https://example.com' } },
        { insert: { image: 'data:image/png;base64,xx' } },
        { insert: '\n' },
      ],
    };
    expect(deltaToMarkdown(delta)).toBe('site (https://example.com)');
  });

  it('escapes characters the notepad would read as markup', () => {
    expect(deltaToMarkdown({ ops: [{ insert: 'a*b == c <div> \\\n' }] })).toBe('a\\*b \\=\\= c \\<div> \\\\');
  });
});

describe('normalizeItemData', () => {
  it('converts a 2.x Quill note to markdown', () => {
    const result = normalizeItemData(
      itemData({ ops: [{ insert: 'hello', attributes: { bold: true } }, { insert: '\n' }] }, DataType.DELTA),
    );
    expect(result.dataType).toBe(DataType.MARKDOWN);
    expect(result.data).toBe('**hello**');
  });

  it('leaves notes and pages untouched', () => {
    const note = itemData('**hi**', DataType.MARKDOWN);
    const page = itemData('# Hi', DataType.PAGE);
    expect(normalizeItemData(note)).toBe(note);
    expect(normalizeItemData(page)).toBe(page);
  });
});

describe('normalizeArtBoardItem', () => {
  const base = { id: 'a', colorIndex: 4, properties: {}, modifiedDate: '' } as unknown as ArtBoardItem;

  it('fills in a default grid position', () => {
    expect(normalizeArtBoardItem(base).gridPosition).toEqual({
      order: 0,
      rows: 10,
      screenColumns: { Large: 3, Medium: 3, Small: 3, XSmall: 1 },
    });
  });

  it('derives the note type of 1.x items from their element', () => {
    expect(normalizeArtBoardItem({ ...base, element: 'ntm-text-note-element' } as ArtBoardItem).extensionId).toBe(
      ExtensionId.TextNote,
    );
    expect(normalizeArtBoardItem(base).extensionId).toBe(ExtensionId.TextNote);
  });

  it('keeps notes and pages, and leaves out the code and vocabulary notes of older versions', () => {
    const kind = (extensionId: string) => normalizeArtBoardItem({ ...base, extensionId } as unknown as ArtBoardItem);
    expect(isSupportedNote(kind(ExtensionId.TextNote))).toBe(true);
    expect(isSupportedNote(kind(ExtensionId.Page))).toBe(true);
    expect(isSupportedNote(kind(ExtensionId.Flow))).toBe(true);
    expect(isSupportedNote(kind(ExtensionId.TodoList))).toBe(true);
    expect(isSupportedNote(kind('ntm-code-note-element'))).toBe(false);
    expect(isSupportedNote(kind('vocabulary-extension'))).toBe(false);
  });

  it('does not mutate the stored item', () => {
    const item = { ...base };
    normalizeArtBoardItem(item);
    expect(item.gridPosition).toBeUndefined();
  });
});

describe('getText', () => {
  it('strips the notepad markup for the search index', () => {
    expect(getText('- [x] **buy** <u>milk</u> \\*now', DataType.MARKDOWN)).toBe('buy milk *now');
  });

  it('indexes a page with its title and its words', () => {
    const page = '## Install\n- [ ] brew `node`\n> **Note** [docs](https://x)\n```sh\nnpm i\n```\n---';
    expect(getText(page, DataType.PAGE, { title: 'Laptop' })).toBe('Laptop\nInstall\nbrew node\nNote docs\nnpm i');
  });
});
