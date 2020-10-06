import { createAction, props } from '@ngrx/store';
import { Board } from '../models';

export const loadBoards = createAction('[Board] Retrieve all Boards');
export const getBoard = createAction('[Board] Retrieve a Board by ID', props<{ boardId: string }>());
export const updateBoard = createAction('Board] Update Board', props<{ board: Board }>());
export const createBoard = createAction('Board] Create Board', props<{ board: Board }>());
export const deleteBoard = createAction('[Board] Delete a Board', props<{ boardId: string }>());
