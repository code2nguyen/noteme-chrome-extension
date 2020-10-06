import { createReducer, on } from '@ngrx/store';
import { ArtBoardItemActions, ArtBoardItemApiActions } from '../actions';

export const artBoardItemSearchsFeatureKey = 'artBoardItemsSearch';

export interface State {
  ids: string[];
  loading: boolean;
  error: string;
  query: string;
}

const initialState: State = {
  ids: [],
  loading: false,
  error: '',
  query: '',
};

export const reducer = createReducer(
  initialState,
  on(ArtBoardItemActions.searchArtBoardItems, (state, { query }) => {
    return query === ''
      ? {
          ids: [],
          loading: false,
          error: '',
          query,
        }
      : {
          ...state,
          loading: true,
          error: '',
          query,
        };
  }),
  on(ArtBoardItemApiActions.searchArtBoardItemsSuccess, (state, { artBoardItems }) => ({
    ids: artBoardItems.map((item) => item.id),
    loading: false,
    error: '',
    query: state.query,
  })),
  on(ArtBoardItemApiActions.searchArtBoardItemsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }))
);

export const getIds = (state: State) => state.ids;

export const getQuery = (state: State) => state.query;

export const getLoading = (state: State) => state.loading;

export const getError = (state: State) => state.error;
