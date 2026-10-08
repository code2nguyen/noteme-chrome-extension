/**
 * Read-time migration of data written by Noteme 2.x.
 *
 * Nothing is rewritten in storage here: a note keeps its stored form until the user edits it, at which point the
 * migrated value is saved. That keeps a migration bug from destroying data that was never touched.
 */
import { ExtensionId } from '../extension-id';
import { NBR_COLORS } from '../note-config';
import { ArtBoardItem, ItemData } from '../store/models';
import { DataType } from '../store/models/data-type';

interface DeltaOp {
  insert?: unknown;
  attributes?: Record<string, unknown>;
}

interface Delta {
  ops: DeltaOp[];
}

function isDelta(value: unknown): value is Delta {
  return !!value && typeof value === 'object' && Array.isArray((value as Delta).ops);
}

/** Escape the characters the c2-notepad dialect would read as markup. */
function escapeMarkdown(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const pairable = ch === '=' || ch === '~';
    if (ch === '\\' || ch === '*' || (ch === '<' && /[a-zA-Z/]/.test(text[i + 1] ?? ''))) {
      out += '\\' + ch;
    } else if (pairable && (text[i - 1] === ch || text[i + 1] === ch)) {
      out += '\\' + ch;
    } else {
      out += ch;
    }
  }
  return out;
}

function formatInline(text: string, attributes: Record<string, unknown> = {}): string {
  // Delimiters must hug the text, so surrounding whitespace stays outside them.
  const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
  const [, lead, core, trail] = match ?? ['', '', text, ''];
  if (!core) {
    return text;
  }
  let body = escapeMarkdown(core);
  if (typeof attributes['link'] === 'string' && attributes['link'] !== core) {
    body += ` (${attributes['link']})`;
  }
  if (attributes['code']) {
    body = '`' + body + '`';
  }
  if (attributes['strike']) {
    body = `~~${body}~~`;
  }
  if (attributes['underline']) {
    body = `<u>${body}</u>`;
  }
  if (attributes['italic']) {
    body = `*${body}*`;
  }
  if (attributes['bold']) {
    body = `**${body}**`;
  }
  return lead + body + trail;
}

function lineprefix(attributes: Record<string, unknown>, orderedIndex: number): string {
  switch (attributes['list']) {
    case 'checked':
      return '- [x] ';
    case 'unchecked':
      return '- [ ] ';
    case 'bullet':
      return '• ';
    case 'ordered':
      return `${orderedIndex}. `;
  }
  if (attributes['blockquote']) {
    return '│ ';
  }
  return '';
}

/**
 * Convert a Quill Delta to the line-based markdown dialect c2-notepad reads. Bold, italic, underline, strike and
 * checklists survive; headings become bold lines, other lists keep a textual bullet, links keep their URL in
 * parentheses, and colours, fonts, sizes and embeds (images) are dropped.
 */
export function deltaToMarkdown(delta: Delta): string {
  const lines: string[] = [];
  let current = '';
  let orderedIndex = 0;
  for (const op of delta.ops) {
    if (typeof op.insert !== 'string') {
      continue; // embeds have no text form
    }
    const parts = op.insert.split('\n');
    parts.forEach((part, index) => {
      if (part) {
        current += formatInline(part, op.attributes);
      }
      if (index < parts.length - 1) {
        // The newline closing a line carries the line's block attributes.
        const attributes = op.attributes ?? {};
        orderedIndex = attributes['list'] === 'ordered' ? orderedIndex + 1 : 0;
        const line = attributes['header'] && current && !current.startsWith('**') ? `**${current}**` : current;
        lines.push(lineprefix(attributes, orderedIndex) + line);
        current = '';
      }
    });
  }
  if (current) {
    lines.push(current);
  }
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines.join('\n');
}

/** Bring a stored item data to the form the editors read: 2.x Quill notes become notepad markdown. */
export function normalizeItemData(itemData: ItemData): ItemData {
  const raw: unknown = itemData.data;
  if (itemData.dataType === DataType.DELTA) {
    return { ...itemData, data: isDelta(raw) ? deltaToMarkdown(raw) : '', dataType: DataType.MARKDOWN };
  }
  return itemData;
}

/** Notes, pages, flows and to-do lists; 2.x code and vocabulary notes are not carried over and stay out of the app. */
export function isSupportedNote(artBoardItem: ArtBoardItem): boolean {
  return (
    artBoardItem.extensionId === ExtensionId.TextNote ||
    artBoardItem.extensionId === ExtensionId.Page ||
    artBoardItem.extensionId === ExtensionId.Flow ||
    artBoardItem.extensionId === ExtensionId.TodoList
  );
}

const DEFAULT_POSITION = {
  order: 0,
  rows: 10,
  screenColumns: { Large: 3, Medium: 3, Small: 3, XSmall: 1 },
};

/** Fill in what older board items lack: a grid position, a note type and a colour. */
export function normalizeArtBoardItem(artBoardItem: ArtBoardItem): ArtBoardItem {
  if (!artBoardItem) {
    return artBoardItem;
  }
  const legacy = artBoardItem as ArtBoardItem & { element?: string };
  const gridPosition = { ...DEFAULT_POSITION, ...artBoardItem.gridPosition };
  // 1.x items name their kind in `element`; anything without a kind is a text note.
  const extensionId = (artBoardItem.extensionId ?? legacy.element ?? ExtensionId.TextNote) as ExtensionId;
  const colorIndex =
    extensionId === ExtensionId.TextNote
      ? (artBoardItem.colorIndex ?? Math.floor(Math.random() * NBR_COLORS))
      : (artBoardItem.colorIndex ?? 0);
  return { ...artBoardItem, gridPosition, extensionId, colorIndex };
}
