import { Dictionary } from '@ngrx/entity';

import { ExtensionId } from '../extension-id';
import { getText, plainLine } from '../services/utils';
import { ArtBoardItem, ItemData } from '../store/models';

/** The board keeps this many unpinned notes on it, the most recently edited; the rest wait in the Older notes sheet. */
export const RECENT_COUNT = 10;

export type NoteKind = 'Note' | 'Page' | 'Flow' | 'List';

export const NOTE_KINDS: readonly NoteKind[] = ['Note', 'Page', 'Flow', 'List'];

export function isNoteKind(value: unknown): value is NoteKind {
  return NOTE_KINDS.includes(value as NoteKind);
}

/** How many notes there are of each kind, for the filters. */
export function countKinds(notes: readonly { kind: NoteKind }[]): Record<NoteKind, number> {
  const counts: Record<NoteKind, number> = { Note: 0, Page: 0, Flow: 0, List: 0 };
  for (const note of notes) {
    counts[note.kind]++;
  }
  return counts;
}

/** What the Older notes sheet (and the search) says about a note: its kind, first line and the rest of its text. */
export interface NoteSummary {
  id: string;
  kind: NoteKind;
  label: string;
  /** The text after the first line, on one line. */
  excerpt: string;
  /** When it was last edited (ISO date). */
  edited: string;
}

export interface BoardSplit {
  /** On the board: the pinned notes, then the recent ones, each in the board's order. */
  shown: ArtBoardItem[];
  /** In the sheet: everything else, most recently edited first. */
  older: ArtBoardItem[];
}

const KINDS: Record<ExtensionId, NoteKind> = {
  [ExtensionId.TextNote]: 'Note',
  [ExtensionId.Page]: 'Page',
  [ExtensionId.Flow]: 'Flow',
  [ExtensionId.TodoList]: 'List',
};

export function kindOf(item: ArtBoardItem): NoteKind {
  return KINDS[item.extensionId] ?? 'Note';
}

/** What a note with nothing written in it is called. */
export function untitled(kind: NoteKind): string {
  return kind === 'Note' ? 'Empty note' : `Untitled ${kind.toLowerCase()}`;
}

/**
 * When a note was last written in: its stored text's date, else (never written) when the note itself changed. Coming
 * back from the Archive counts too, so a restored note is a recent one.
 */
export function lastEdited(item: ArtBoardItem, data: Dictionary<ItemData>): string {
  const itemData = data[item.id];
  const written =
    (itemData && !itemData.empty ? itemData.modifiedDate : undefined) ?? item.dataModifiedDate ?? item.modifiedDate;
  return item.restoredDate && item.restoredDate > written ? item.restoredDate : written;
}

/** When a note was archived; one archived before that was recorded, by its last edit. */
export function archivedOn(item: ArtBoardItem, data: Dictionary<ItemData>): string {
  return item.archivedDate ?? lastEdited(item, data);
}

/**
 * Which notes the board shows: every pinned note, first, then the `count` most recently edited of the others, and
 * any note shown on purpose this session (`revealed`: picked in the search, just unpinned). `items` is in the board's
 * order, which both groups keep.
 */
export function splitBoard(
  items: ArtBoardItem[],
  data: Dictionary<ItemData>,
  revealed: ReadonlySet<string> = new Set(),
  count = RECENT_COUNT,
): BoardSplit {
  const newestFirst = (a: ArtBoardItem, b: ArtBoardItem) => lastEdited(b, data).localeCompare(lastEdited(a, data));
  const unpinned = items.filter((item) => !item.starred);
  const recent = new Set(
    [...unpinned]
      .sort(newestFirst)
      .slice(0, count)
      .map((item) => item.id),
  );
  const onBoard = (item: ArtBoardItem) => recent.has(item.id) || revealed.has(item.id);
  return {
    shown: [...items.filter((item) => item.starred), ...unpinned.filter(onBoard)],
    older: unpinned.filter((item) => !onBoard(item)).sort(newestFirst),
  };
}

export function summarize(item: ArtBoardItem, data: Dictionary<ItemData>): NoteSummary {
  const itemData = data[item.id];
  const kind = kindOf(item);
  const lines = (itemData ? getText(itemData.data, itemData.dataType, itemData.properties) : '')
    .split('\n')
    .map(plainLine)
    .filter(Boolean);
  return {
    id: item.id,
    kind,
    label: lines[0] || untitled(kind),
    excerpt: lines.slice(1).join(' · '),
    edited: lastEdited(item, data),
  };
}

export { plainLine };

export interface MonthGroup<T> {
  /** "October" this year, "October 2025" before. */
  label: string;
  items: T[];
}

/** Notes newest first, grouped by the month of a date of theirs: by default, when they were last edited. */
export function groupByMonth<T extends { edited: string }>(
  notes: T[],
  now = new Date(),
  dateOf: (note: T) => string = (note) => note.edited,
): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  for (const note of notes) {
    const date = new Date(dateOf(note));
    const label = date.toLocaleDateString(undefined, {
      month: 'long',
      ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
    });
    const last = groups.at(-1);
    if (last?.label === label) {
      last.items.push(note);
    } else {
      groups.push({ label, items: [note] });
    }
  }
  return groups;
}

/**
 * The board's order once its shown cards were rearranged (`arranged`, as the masonry reports them): pinned ones
 * stay first, and the cards take the order values they already held between them, so the notes that are not shown
 * keep their place in the order.
 */
export function rearrange(arranged: ArtBoardItem[]): { item: ArtBoardItem; order: number }[] {
  const slots = arranged.map((item) => item.gridPosition.order ?? 0).sort((a, b) => a - b);
  const pinnedFirst = [...arranged.filter((item) => item.starred), ...arranged.filter((item) => !item.starred)];
  return pinnedFirst.map((item, index) => ({ item, order: slots[index] }));
}
