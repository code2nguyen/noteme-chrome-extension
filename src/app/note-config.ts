import { ExtensionId } from './extension-id';
import { ArtBoardItem } from './store/models';

/** Paper colours of c2-notepad, in the order a note's `colorIndex` selects them. */
export const PAPER_COLORS = ['default', 'yellow', 'green', 'blue', 'pink', 'night'] as const;
export type PaperColor = (typeof PAPER_COLORS)[number];
export const NBR_COLORS = PAPER_COLORS.length;
export const DEFAULT_EXTENSION_ID = ExtensionId.TextNote;

/** 2.x notes stored an index into a 13 colour palette; any index still picks a paper colour. */
export function paperColorFor(colorIndex: number | undefined): PaperColor {
  const index = Number.isInteger(colorIndex) ? Math.abs(colorIndex as number) : 0;
  return PAPER_COLORS[index % NBR_COLORS];
}

export function colorIndexFor(color: string): number {
  const index = PAPER_COLORS.indexOf(color as PaperColor);
  return index === -1 ? 0 : index;
}

type DefaultNoteProperties = Pick<ArtBoardItem, 'extensionId' | 'colorIndex' | 'gridPosition' | 'properties'>;

export const noteDefaultProperties: Record<ExtensionId, DefaultNoteProperties> = {
  [ExtensionId.TextNote]: {
    extensionId: ExtensionId.TextNote,
    gridPosition: {
      order: -1,
      rows: 10,
      screenColumns: { Large: 3, Medium: 3, Small: 3, XSmall: 1 },
    },
    colorIndex: 0,
    // A new note is a sticky note, until a paper is picked for one (latestNotePaper). Notes stored without a pad keep
    // the notebook they were shown as.
    properties: { pad: 'sticky' },
  },
  [ExtensionId.Flow]: {
    extensionId: ExtensionId.Flow,
    gridPosition: {
      order: -1,
      // Room for the flow itself, drawn small under its title.
      rows: 8,
      screenColumns: { Large: 3, Medium: 3, Small: 3, XSmall: 1 },
    },
    colorIndex: 0,
    properties: {},
  },
  // A page shows as a small card on the board (title and first lines) and opens full screen.
  [ExtensionId.Page]: {
    extensionId: ExtensionId.Page,
    gridPosition: {
      order: -1,
      // As tall as its excerpt until it is resized (board/card-rows.ts): a span no resize gives.
      rows: 0,
      screenColumns: { Large: 3, Medium: 3, Small: 3, XSmall: 1 },
    },
    colorIndex: 0,
    properties: {},
  },
  // A to-do list is worked through right on its card, like a note: its tasks scroll inside the card.
  [ExtensionId.TodoList]: {
    extensionId: ExtensionId.TodoList,
    gridPosition: {
      order: -1,
      rows: 10,
      screenColumns: { Large: 3, Medium: 3, Small: 3, XSmall: 1 },
    },
    colorIndex: 0,
    properties: {},
  },
};

/** What a note's paper is made of: its colour, and the pad and ruling picked in the paper picker. */
export type NotePaper = Pick<ArtBoardItem, 'colorIndex'> & { properties: { pad?: unknown; paper?: unknown } };

/**
 * The paper of the note whose paper was changed last (pad, ruling or colour, in the paper picker), for a new note to
 * start on. Writing in a note does not count, and neither does a note's own date, which every layout change moves.
 * Undefined until a text note has had its paper changed.
 */
export function latestNotePaper(notes: readonly ArtBoardItem[]): NotePaper | undefined {
  let latest: { date: string; note: ArtBoardItem } | undefined;
  for (const note of notes) {
    const date = note.properties['paperModifiedDate'];
    if (note.extensionId === ExtensionId.TextNote && typeof date === 'string' && (!latest || date > latest.date)) {
      latest = { date, note };
    }
  }
  if (!latest) {
    return undefined;
  }
  const { colorIndex, properties } = latest.note;
  return { colorIndex, properties: { pad: properties['pad'], paper: properties['paper'] } };
}
