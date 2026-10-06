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
    properties: {},
  },
  [ExtensionId.Flow]: {
    extensionId: ExtensionId.Flow,
    gridPosition: {
      order: -1,
      rows: 4,
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
};
