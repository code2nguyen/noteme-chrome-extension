import { Action, ActionReducerMap, createFeatureSelector, createSelector } from '@ngrx/store';
import { InjectionToken } from '@angular/core';

import { isSupportedNote } from '../../services/migration';
import * as fromBoard from './board.reducer';
import * as fromArtBoardItem from './art-board-item.reducer';
import * as fromItemData from './item-data.reducer';
import * as fromArtBoardItemSearch from './art-board-item-search.reducer';
import * as fromUser from './user.reducer';
import { ArtBoardItem } from '../models';

export interface AppState {
  [fromBoard.boardsFeatureKey]: fromBoard.State;
  [fromArtBoardItem.boardItemsFeatureKey]: fromArtBoardItem.State;
  [fromItemData.dataItemsFeatureKey]: fromItemData.State;
  [fromArtBoardItemSearch.artBoardItemSearchsFeatureKey]: fromArtBoardItemSearch.State;
  [fromUser.userFeatureKey]: fromUser.State;
}

export const ROOT_REDUCERS = new InjectionToken<ActionReducerMap<AppState, Action>>('Root reducers token', {
  factory: () => ({
    [fromBoard.boardsFeatureKey]: fromBoard.reducer,
    [fromArtBoardItem.boardItemsFeatureKey]: fromArtBoardItem.reducer,
    [fromItemData.dataItemsFeatureKey]: fromItemData.reducer,
    [fromArtBoardItemSearch.artBoardItemSearchsFeatureKey]: fromArtBoardItemSearch.reducer,
    [fromUser.userFeatureKey]: fromUser.reducer,
  }),
});

export const selectBoardsState = createFeatureSelector<fromBoard.State>(fromBoard.boardsFeatureKey);
export const selectArtBoardItemsState = createFeatureSelector<fromArtBoardItem.State>(
  fromArtBoardItem.boardItemsFeatureKey,
);
export const selectItemDatasState = createFeatureSelector<fromItemData.State>(fromItemData.dataItemsFeatureKey);
export const selectArtBoardItemsSearchState = createFeatureSelector<fromArtBoardItemSearch.State>(
  fromArtBoardItemSearch.artBoardItemSearchsFeatureKey,
);
export const selectUser = createFeatureSelector<fromUser.State>(fromUser.userFeatureKey);

export const initialState = {
  boards: fromBoard.adapter.getInitialState({
    ids: ['defaultArtBoard'],
    entities: {
      defaultArtBoard: {
        id: 'defaultArtBoard',
        name: 'Default',
        type: 'ArtBoard' as const,
      },
    },
  }),
};
// -------------------
// Board selectors
// -------------------
export const {
  selectIds: selectBoardIds,
  selectEntities: selectBoardEntities,
  selectAll: selectAllBoards,
  selectTotal: selectTotalBoards,
} = fromBoard.adapter.getSelectors(selectBoardsState);

export const selectBoardById = (boardId: string) =>
  createSelector(selectBoardEntities, (boardEntities) => boardEntities[boardId]);

// -------------------
// Art Board Item selectors
// -------------------

export const {
  selectIds: selectArtBoardItemIds,
  selectEntities: selectArtBoardItemEntities,
  selectAll: selectAllArtBoardItems,
  selectTotal: selectTotalArtBoardItems,
} = fromArtBoardItem.adapter.getSelectors(selectArtBoardItemsState);

export const selectArtBoardItemById = (artBoardItemId: string) =>
  createSelector(selectArtBoardItemEntities, (entities) => entities[artBoardItemId]);

/** Notes and pages: kinds of note Noteme no longer has (2.x code and vocabulary notes) are left out everywhere. */
const selectNotes = createSelector(selectAllArtBoardItems, (artBoardItems) => artBoardItems.filter(isSupportedNote));

export const selectArtBoardItemsByBoardId = (boardId: string) =>
  createSelector(selectNotes, (artBoardItems) => artBoardItems.filter((item) => item.boardId === boardId));

export const selectArchivedArtBoardItems = createSelector(selectNotes, (artBoardItems) =>
  artBoardItems.filter((item) => !item.boardId),
);

export const selectIsAllLoadedArtBoardItems = createSelector(selectArtBoardItemsState, (state) => state.isAllLoaded);
// -------------------
// Item Data selectors
// -------------------
export const {
  selectIds: selectItemDataIds,
  selectEntities: selectItemDataEntities,
  selectAll: selectAllItemDatas,
  selectTotal: selectTotalItemDatas,
} = fromItemData.adapter.getSelectors(selectItemDatasState);

export const selectItemDataById = (itemDataId: string) =>
  createSelector(selectItemDataEntities, (entities) => entities[itemDataId]);

export const selectIsAllLoadedItemDatas = createSelector(selectItemDatasState, (state) => state.isAllLoaded);

// -------------------
// ArtBoardItemSearch selectors
// -------------------
export const selectArtBoardItemSearchIds = createSelector(
  selectArtBoardItemsSearchState,
  fromArtBoardItemSearch.getIds,
);
export const selectArtBoardItemSearchQuery = createSelector(
  selectArtBoardItemsSearchState,
  fromArtBoardItemSearch.getQuery,
);
export const selectArtBoardItemSearchLoading = createSelector(
  selectArtBoardItemsSearchState,
  fromArtBoardItemSearch.getLoading,
);
export const selectArtBoardItemSearchError = createSelector(
  selectArtBoardItemsSearchState,
  fromArtBoardItemSearch.getError,
);

export const selectArtBoardItemSearchResults = createSelector(
  selectArtBoardItemEntities,
  selectArtBoardItemSearchIds,
  (artBoardItems, searchIds) =>
    searchIds
      .map((id) => artBoardItems[id])
      .filter((artBoardItem): artBoardItem is ArtBoardItem => artBoardItem != null && isSupportedNote(artBoardItem)),
);
