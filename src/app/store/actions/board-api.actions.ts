import { createAction, props } from '@ngrx/store';
import { Board } from '../models';

export const loadBoardsSuccess = createAction('[Board] Retrieve all Boards Success', props<{ boards: Board[] }>());
export const loadBoardsFailure = createAction('[Board] Retrieve all Boards Failure', props<{ error: any }>());

export const getBoardSuccess = createAction('[Board] Retrieve a Board by ID Success', props<{ board: Board }>());
export const getBoardFailure = createAction('[Board] Retrieve a Board by ID Failure', props<{ error: any }>());

export const createBoardSuccess = createAction('[Board] Create a Board Success', props<{ board: Board }>());
export const createBoardFailure = createAction('[Board] Create a Board Failure', props<{ error: any }>());

export const updateBoardSuccess = createAction('Board] Update Board Success', props<{ board: Board }>());
export const updateBoardFailure = createAction('Board] Update Board Failure', props<{ error: any }>());

export const deleteBoardSuccess = createAction('Board] Delete Board Success', props<{ boardId: string }>());
export const deleteBoardFailure = createAction('Board] Delete Board Failure', props<{ error: any }>());
