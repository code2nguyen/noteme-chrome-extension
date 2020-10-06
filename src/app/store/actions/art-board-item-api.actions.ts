import { createAction, props } from '@ngrx/store';
import { ArtBoardItem } from '../models';

export const loadArtBoardItemsSuccess = createAction(
  '[Art Board Item] Retrieve all Art Board Items of a board Success',
  props<{ artBoardItems: ArtBoardItem[] }>()
);
export const loadArtBoardItemsFailure = createAction(
  '[Art Board Item] Retrieve all Art Board Items of a board Failure',
  props<{ error: any }>()
);

export const createArtBoardItemSuccess = createAction(
  '[Art Board Item] create Art Board Item Success',
  props<{ artBoardItem: ArtBoardItem }>()
);

export const createArtBoardItemFailure = createAction(
  '[Art Board Item] create Art Board Item Failure',
  props<{ error: any }>()
);

export const updateArtBoardItemSuccess = createAction(
  '[Art Board Item] update Art Board Item Success',
  props<{ artBoardItem: ArtBoardItem }>()
);

export const changeArtBoardItemTypeSuccess = createAction(
  '[Art Board Item] change Art Board Item type Success',
  props<{ artBoardItem: ArtBoardItem }>()
);

export const changeArtBoardItemTypeFailure = createAction(
  '[Art Board Item] change Art Board Item type Failure',
  props<{ error: any }>()
);

export const updateArtBoardItemFailure = createAction(
  '[Art Board Item] update Art Board Item Failure',
  props<{ error: any }>()
);

export const deleteArtBoardItemSuccess = createAction(
  '[Art Board Item] delete Art Board Item Success',
  props<{ artBoardItemId: string }>()
);

export const deleteArtBoardItemFailure = createAction(
  '[Art Board Item] delete Art Board Item Failure',
  props<{ error: any }>()
);

export const searchArtBoardItemsSuccess = createAction(
  '[Art Board Item] search for Art Board Items Success',
  props<{ artBoardItems: ArtBoardItem[] }>()
);
export const searchArtBoardItemsFailure = createAction(
  '[Art Board Item] Search for Art Board Items Failure',
  props<{ error: any }>()
);

export const hideArtBoardItemSuccess = createAction(
  '[Art Board Item] Hide for Art Board Items Success',
  props<{ artBoardItem: ArtBoardItem }>()
);

export const hideArtBoardItemFailure = createAction(
  '[Art Board Item] Hide for Art Board Items Failure',
  props<{ error: any }>()
);

export const showArtBoardItemSuccess = createAction(
  '[Art Board Item] Show for Art Board Items Success',
  props<{ artBoardItem: ArtBoardItem }>()
);

export const showArtBoardItemFailure = createAction(
  '[Art Board Item] Show for Art Board Items Failure',
  props<{ error: any }>()
);

export const getAllArtBoardItemsSuccess = createAction(
  '[Art Board Item] get all Art Board Items Success',
  props<{ artBoardItems: ArtBoardItem[] }>()
);
export const getAllArtBoardItemsFailure = createAction(
  '[Art Board Item] get all Art Board Items Failure',
  props<{ error: any }>()
);
