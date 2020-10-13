import { createAction, props } from '@ngrx/store';
import { Board } from '../models';

export const loadBoardsSuccess = createAction('[Board Api] Retrieve all Boards Success', props<{ boards: Board[] }>());
export const loadBoardsFailure = createAction('[Board Api] Retrieve all Boards Failure', props<{ error: any }>());

export const getBoardSuccess = createAction('[Board Api] Retrieve a Board by ID Success', props<{ board: Board }>());
export const getBoardFailure = createAction('[Board Api] Retrieve a Board by ID Failure', props<{ error: any }>());

export const createBoardSuccess = createAction('[Board Api] Create a Board Success', props<{ board: Board }>());
export const createBoardFailure = createAction('[Board Api] Create a Board Failure', props<{ error: any }>());

export const updateBoardSuccess = createAction('[Board Api] Update Board Success', props<{ board: Board }>());
export const updateBoardFailure = createAction('[Board Api] Update Board Failure', props<{ error: any }>());

export const deleteBoardSuccess = createAction('[Board Api] Delete Board Success', props<{ boardId: string }>());
export const deleteBoardFailure = createAction('[Board Api] Delete Board Failure', props<{ error: any }>());
