import { ItemLayout } from './item-layout';

export interface ArtBoardItem {
  id: string;
  boardId?: string;
  layout: ItemLayout;
  element: string;
  starred?: boolean;
  properties: Partial<{
    category: string;
    color: number;
    language: string;
    zIndex: number;
  }>;
  modifiedDate: string;
  dataModifiedDate?: string;
}
