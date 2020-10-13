import { EntityState, createEntityAdapter, EntityAdapter, Update } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';

import { ArtBoardItem } from '../models';
import { ArtBoardItemApiActions } from '../actions';

export const boardItemsFeatureKey = 'artBoardItems';

export interface State extends EntityState<ArtBoardItem> {
  isAllLoaded: boolean;
}

export const adapter: EntityAdapter<ArtBoardItem> = createEntityAdapter<ArtBoardItem>({
  selectId: (item: ArtBoardItem) => item.id,
  sortComparer: false,
});

export const initialState: State = adapter.getInitialState({
  isAllLoaded: false,
});

export const reducer = createReducer(
  initialState,
  on(ArtBoardItemApiActions.updateAllArtBoardItemLayoutSuccess, (state, { artBoardItems }) => {
    return adapter.upsertMany(artBoardItems, state);
  }),
  on(ArtBoardItemApiActions.getAllArtBoardItemsSuccess, (state, { artBoardItems }) => {
    const newItems = artBoardItems.filter((item) => item && !state.entities[item.id]);
    return {
      ...adapter.addMany(newItems, state),
      ...{ isAllLoaded: true },
    };
  }),
  on(ArtBoardItemApiActions.searchArtBoardItemsSuccess, (state, { artBoardItems }) => {
    const newItems = artBoardItems.filter((item) => item && !state.entities[item.id]);
    return adapter.addMany(newItems, state);
  }),
  on(ArtBoardItemApiActions.loadArtBoardItemsSuccess, (state, { artBoardItems }) => {
    return adapter.upsertMany(artBoardItems, state);
  }),
  on(ArtBoardItemApiActions.createArtBoardItemSuccess, (state, { artBoardItem }) => {
    return adapter.addOne(artBoardItem, state);
  }),
  on(ArtBoardItemApiActions.deleteArtBoardItemSuccess, (state, { artBoardItemId }) => {
    return adapter.removeOne(artBoardItemId, state);
  }),
  on(
    ArtBoardItemApiActions.updateArtBoardItemSuccess,
    ArtBoardItemApiActions.changeArtBoardItemTypeSuccess,
    ArtBoardItemApiActions.hideArtBoardItemSuccess,
    ArtBoardItemApiActions.showArtBoardItemSuccess,
    (state, { artBoardItem }) => {
      return adapter.upsertOne(artBoardItem, state);
    }
  )
);
