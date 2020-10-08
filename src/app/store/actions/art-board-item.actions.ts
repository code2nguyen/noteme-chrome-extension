import { createAction, props } from '@ngrx/store';
import { ArtBoardItem } from '../models';
import { DataType } from '../models/data-type';
import { ArtBoardItemPosition } from '../models/art-board-item-position';

export const loadArtBoardItems = createAction(
  '[Art Board Item] Retrieve all Art Board Items',
  props<{ boardId: string }>()
);

export const createArtBoardItem = createAction(
  '[Art Board Item] create Art Board Item',
  props<{ artBoardItem: ArtBoardItem }>()
);

export const updateArtBoardItem = createAction(
  '[Art Board Item] update Art Board Item',
  props<{ artBoardItem: ArtBoardItem }>()
);

export const changeArtBoardItemType = createAction(
  '[Art Board Item] change Art Board Item type',
  props<{ artBoardItem: ArtBoardItem; changedDataType: DataType }>()
);

export const deleteArtBoardItem = createAction(
  '[Art Board Item] delete Art Board Item',
  props<{ boardId?: string; artBoardItemId: string }>()
);

export const hideArtBoardItem = createAction(
  '[Art Board Item] hide Art Board Item',
  props<{ boardId: string; artBoardItemId: string }>()
);

export const showArtBoardItem = createAction(
  '[Art Board Item] Show Art Board Item',
  props<{ boardId: string; artBoardItemId: string; order: number }>()
);

export const searchArtBoardItems = createAction(
  '[Art Board Item] Search for Art Board Items',
  props<{ query: string }>()
);

export const getAllArtBoardItems = createAction('[Art Board Item] get all Art Board Items');

export const updateAllArtBoardItemLayout = createAction(
  '[Art Board Item] Update layout of all board items',
  props<{ itemLayouts: Array<ArtBoardItemPosition> }>()
);
