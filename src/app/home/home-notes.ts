import { Dictionary } from '@ngrx/entity';

import { kindOf, lastEdited, NoteKind, untitled } from '../board/older-notes';
import { PaperColor, paperColorFor } from '../note-config';
import { getText, plainLine } from '../services/utils';
import { ArtBoardItem, ItemData } from '../store/models';
import type { HomeNotesSetting } from '../settings/settings';

/** How many lines of a note a slide shows under its first one; the card clamps them to its height anyway. */
const PREVIEW_LINES = 8;

/** A note as a slide of the carousel on Home: its first line, a few more, and its paper. */
export interface HomeNote {
  id: string;
  kind: NoteKind;
  title: string;
  lines: string[];
  pinned: boolean;
  /** When it was last edited (ISO date). */
  edited: string;
  /** The paper of a quick note; every other kind sits on the plain one. */
  paper: PaperColor;
}

/**
 * The notes Home shows, in order, for a setting: the board's notes (`items`, archived ones are not among them) with
 * something written in them. Auto puts the pinned ones first, most recently pinned first, then the others by last edit;
 * Pinned keeps the pinned ones only; Edited orders them all by last edit. A note pinned before its pin date was recorded
 * counts as pinned when it was last edited.
 */
export function homeNotes(
  items: readonly ArtBoardItem[],
  data: Dictionary<ItemData>,
  setting: HomeNotesSetting,
): HomeNote[] {
  if (setting === 'off') {
    return [];
  }
  const notes = items.map((item) => toHomeNote(item, data)).filter((note): note is Shown => note !== null);
  const byEdit = (a: Shown, b: Shown) => b.edited.localeCompare(a.edited);
  const byPin = (a: Shown, b: Shown) => b.pinnedOn.localeCompare(a.pinnedOn) || byEdit(a, b);
  const pinned = notes.filter((note) => note.pinned).sort(byPin);
  const ordered =
    setting === 'pinned'
      ? pinned
      : setting === 'edited'
        ? [...notes].sort(byEdit)
        : [...pinned, ...notes.filter((note) => !note.pinned).sort(byEdit)];
  return ordered.map(({ pinnedOn: _pinnedOn, ...note }) => note);
}

type Shown = HomeNote & { pinnedOn: string };

function toHomeNote(item: ArtBoardItem, data: Dictionary<ItemData>): Shown | null {
  const itemData = data[item.id];
  if (!itemData || itemData.empty) {
    return null;
  }
  const lines = getText(itemData.data, itemData.dataType, itemData.properties)
    .split('\n')
    .map(plainLine)
    .filter(Boolean);
  if (lines.length === 0) {
    return null;
  }
  const kind = kindOf(item);
  const edited = lastEdited(item, data);
  return {
    id: item.id,
    kind,
    title: lines[0] || untitled(kind),
    lines: lines.slice(1, PREVIEW_LINES + 1),
    pinned: !!item.starred,
    edited,
    paper: kind === 'Note' ? paperColorFor(item.colorIndex) : 'default',
    pinnedOn: item.starredDate ?? edited,
  };
}
