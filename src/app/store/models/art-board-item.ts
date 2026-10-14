import { ExtensionId } from '../../extension-id';
import { GridPosition } from './grid-position';

export interface ArtBoardItem {
  id: string;
  extensionId: ExtensionId;
  boardId?: string;
  gridPosition: GridPosition;
  starred?: boolean;
  /** When it was last pinned (ISO date), for the order of Home's notes; unset on notes pinned before it was recorded. */
  starredDate?: string;
  colorIndex: number;
  properties: {
    [key: string]: unknown;
  };
  modifiedDate: string;
  dataModifiedDate?: string;
  /** When it was archived (ISO date); unset on the board, and on notes archived before it was recorded. */
  archivedDate?: string;
  /** When it last came back from the Archive: that counts as recent, so a restored note stays on the board. */
  restoredDate?: string;
  sourceId?: string;
  // On changing layout we set silent to true, to batch the modifications.
  silent?: boolean;
}
