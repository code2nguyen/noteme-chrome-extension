import { EntityState, createEntityAdapter, EntityAdapter, Update } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';

import { Board } from '../models';
import { BoardApiActions } from '../actions';

export const boardsFeatureKey = 'boards';

export interface State extends EntityState<Board> {}

export const adapter: EntityAdapter<Board> = createEntityAdapter<Board>({
  selectId: (item: Board) => item.id,
  sortComparer: false,
});

export const initialState: State = adapter.getInitialState();

export const reducer = createReducer(
  initialState,
  on(BoardApiActions.loadBoardsSuccess, (state, { boards }) => {
    return adapter.upsertMany(boards, state);
  }),
  on(BoardApiActions.createBoardSuccess, (state, { board }) => {
    return adapter.addOne(board, state);
  }),
  on(BoardApiActions.updateBoardSuccess, (state, { board }) => {
    return adapter.upsertOne(board, state);
  }),
  on(BoardApiActions.deleteBoardSuccess, (state, { boardId }) => {
    return adapter.removeOne(boardId, state);
  })
);
