import { ExtensionId } from '../../extension-id';
import { GridPosition } from './grid-position';
import { ItemLayout } from './item-layout';

export interface ArtBoardItem {
  id: string;
  extensionId: ExtensionId;
  boardId?: string;
  layout?: ItemLayout;
  gridPosition: GridPosition;
  starred?: boolean;
  colorIndex: number;
  properties: Partial<{
    category: string;
    color: string;
    language: string;
  }>;
  modifiedDate: string;
  dataModifiedDate?: string;
  sourceId?: string;
  // On changing layout we set silient is true, to batch the modifications.
  silent?: boolean;
}
