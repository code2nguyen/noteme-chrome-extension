import { ExtensionId } from '../../extension-id';
import { GridPosition } from './grid-position';

export interface ArtBoardItem {
  id: string;
  extensionId: ExtensionId;
  boardId?: string;
  gridPosition: GridPosition;
  starred?: boolean;
  colorIndex: number;
  properties: {
    [key: string]: unknown;
  };
  modifiedDate: string;
  dataModifiedDate?: string;
  sourceId?: string;
  // On changing layout we set silent to true, to batch the modifications.
  silent?: boolean;
}
