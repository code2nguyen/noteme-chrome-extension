import { describe, expect, it } from 'vitest';
import { ExtensionId, LEGACY_CODE_NOTE_EXTENSION_ID, LEGACY_VOCABULARY_EXTENSION_ID } from '../extension-id';
import { ArtBoardItem, ItemData } from '../store/models';
import { DataType } from '../store/models/data-type';
import { codeBlock, deltaToMarkdown, normalizeArtBoardItem, normalizeItemData } from './migration';
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

  it('turns a 2.x vocabulary value into a page with a JSON code block', () => {
    const result = normalizeItemData(itemData([{ word: 'chat', meaning: 'cat' }], DataType.JSON));
    expect(result.dataType).toBe(DataType.PAGE);
    const [, json] = /^```json\n([\s\S]*)\n```$/.exec(result.data!)!;
    expect(JSON.parse(json)).toEqual([{ word: 'chat', meaning: 'cat' }]);
  });

  it('turns a code note into a page holding its code', () => {
    const code = { ...itemData('const a = 1\n', DataType.TEXT), properties: { language: 'typescript' } };
    const result = normalizeItemData(code);
    expect(result).toMatchObject({ dataType: DataType.PAGE, data: '```typescript\nconst a = 1\n```' });
    expect(result.properties).toEqual({ language: 'typescript', title: '' });
    expect(normalizeItemData(itemData('plain', DataType.TEXT)).data).toBe('```\nplain\n```');
    expect(normalizeItemData(itemData('  ', DataType.TEXT)).data).toBe('');
  });

  it('fences code that itself contains backticks with a longer fence', () => {
    expect(codeBlock('a ```b``` c', 'md')).toBe('````md\na ```b``` c\n````');
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
    expect(normalizeArtBoardItem({ ...base, element: 'ntm-code-note-element' } as ArtBoardItem).extensionId).toBe(
      ExtensionId.Page,
    );
    expect(normalizeArtBoardItem(base).extensionId).toBe(ExtensionId.TextNote);
  });

  it('opens code notes and removed vocabulary notes as pages', () => {
    for (const extensionId of [LEGACY_CODE_NOTE_EXTENSION_ID, LEGACY_VOCABULARY_EXTENSION_ID, ExtensionId.Page]) {
      const item = { ...base, extensionId } as unknown as ArtBoardItem;
      expect(normalizeArtBoardItem(item)).toMatchObject({ extensionId: ExtensionId.Page, colorIndex: 0 });
    }
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
