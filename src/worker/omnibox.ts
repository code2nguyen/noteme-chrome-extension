/**
 * The address bar: "nm", a space, then words searches the notes (manifest `omnibox`). Pure functions, run by the
 * worker: the notes as chrome.storage.local holds them, read the way the app reads them, and each match as a row.
 */
import Fuse from 'fuse.js';

import { kindOf, shortKindKey } from '../app/board/older-notes';
import { FULL_SCREEN } from '../app/extension-id';
import { untitledKey } from '../app/i18n/kinds';
import type { Language } from '../app/i18n/language';
import { message } from '../app/i18n/messages';
import { isSupportedNote, normalizeArtBoardItem, normalizeItemData } from '../app/services/migration';
import { SEARCH_OPTIONS, SearchDocument, toSearchDocument } from '../app/services/search-index';
import { IndexableItemTypes, plainLine } from '../app/services/utils';
import type { ArtBoardItem, ItemData } from '../app/store/models';

/** Chrome shows a handful of rows under the address bar. */
export const MAX_SUGGESTIONS = 6;
const LABEL_LENGTH = 80;
// The keys of a note's text and of its card (storage.api.ts).
const ITEM_DATA_PREFIX = 'ITEM_DATA__';
const ART_BOARD_ITEM_PREFIX = 'ART_BOARD_ITEM__';

export interface OmniboxNote extends SearchDocument {
  kind: ReturnType<typeof kindOf>;
  /** Its first line; empty when nothing is written on it. */
  label: string;
  archived: boolean;
  /** Where it opens, after `index.html`: a page or a flow full screen, a note on the board, lit up. */
  path: string;
}

function parse(value: unknown): unknown {
  try {
    return typeof value === 'string' && value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

/** Where a note opens. An archived note, list or sheet has no place on the board: the Archive holds it. */
export function notePath(item: ArtBoardItem): string {
  const route = FULL_SCREEN[item.extensionId];
  const id = encodeURIComponent(item.id);
  if (route) {
    return `#${route}/${id}${item.boardId ? '' : '?from=archive'}`;
  }
  return item.boardId ? `#/main-board?show=${id}` : '#/main-board?view=archive';
}

/**
 * Every note with words in it, from the records of chrome.storage.local (each a JSON string): 2.x notes are read as
 * the app reads them, and a malformed record or a kind Noteme no longer has is left out.
 */
export function omniboxNotes(stored: Record<string, unknown>): OmniboxNote[] {
  const notes: OmniboxNote[] = [];
  for (const [key, value] of Object.entries(stored)) {
    if (!key.startsWith(ITEM_DATA_PREFIX)) {
      continue;
    }
    const data = parse(value) as ItemData | null;
    const item = parse(stored[ART_BOARD_ITEM_PREFIX + key.slice(ITEM_DATA_PREFIX.length)]) as ArtBoardItem | null;
    if (!data || typeof data.id !== 'string' || !item || typeof item.id !== 'string') {
      continue;
    }
    const note = normalizeArtBoardItem(item);
    const itemData = normalizeItemData(data);
    if (!isSupportedNote(note) || !IndexableItemTypes.includes(itemData.dataType)) {
      continue;
    }
    const { text } = toSearchDocument(itemData);
    if (!text.trim()) {
      continue;
    }
    const firstLine = text.split('\n').map(plainLine).find(Boolean) ?? '';
    notes.push({
      id: note.id,
      text,
      kind: kindOf(note),
      label: firstLine.length > LABEL_LENGTH ? firstLine.slice(0, LABEL_LENGTH) + '…' : firstLine,
      archived: !note.boardId,
      path: notePath(note),
    });
  }
  return notes;
}

export function omniboxIndex(notes: OmniboxNote[]): Fuse<OmniboxNote> {
  return new Fuse(notes, SEARCH_OPTIONS as ConstructorParameters<typeof Fuse<OmniboxNote>>[1]);
}

/** A row's description is XML to Chrome (`<dim>`, `<match>`): a note's own text must not read as markup. */
export function escapeXml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char] ?? char,
  );
}

/** The notes matching the words typed, as rows: each holds the address it opens (`base` is the extension's root). */
export function omniboxSuggestions(
  index: Fuse<OmniboxNote>,
  query: string,
  base: string,
  language: Language,
): { content: string; description: string }[] {
  const text = query.trim();
  if (!text) {
    return [];
  }
  return index.search(text, { limit: MAX_SUGGESTIONS }).map(({ item }) => {
    const label = item.label || message(language, untitledKey(item.kind));
    const kind = message(language, shortKindKey(item.kind));
    const where = item.archived ? ` · ${message(language, 'common.archive')}` : '';
    return {
      content: base + item.path,
      description: `${escapeXml(label)} <dim>${escapeXml(kind + where)}</dim>`,
    };
  });
}

/**
 * The address Enter opens: a row picked holds its own (only ever one of this extension's pages); words typed and
 * entered as they are open the board with its search on them.
 */
export function omniboxTarget(text: string, base: string): string {
  if (text.startsWith(base + '#/')) {
    return text;
  }
  const query = text.trim();
  return query ? `${base}#/main-board?search=1&q=${encodeURIComponent(query)}` : `${base}#/main-board?search=1`;
}
