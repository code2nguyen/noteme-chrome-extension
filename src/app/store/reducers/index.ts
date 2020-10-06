import { ActionReducer, ActionReducerMap, createFeatureSelector, createSelector, Action } from '@ngrx/store';

import * as fromBoard from './board.reducer';
import * as fromArtBoardItem from './art-board-item.reducer';
import * as fromItemData from './item-data.reducer';
import * as fromArtBoardItemSearch from './art-board-item-search.reducer';
import * as fromUser from './user.reducer';

import { InjectionToken } from '@angular/core';
import { Dictionary } from '@ngrx/entity';
import { Board, ArtBoardItem, ItemData } from '../models';

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

export const selectBoardsState = createFeatureSelector<AppState, fromBoard.State>(fromBoard.boardsFeatureKey);
export const selectArtBoardItemsState = createFeatureSelector<AppState, fromArtBoardItem.State>(
  fromArtBoardItem.boardItemsFeatureKey
);
export const selectItemDatasState = createFeatureSelector<AppState, fromItemData.State>(
  fromItemData.dataItemsFeatureKey
);
export const selectArtBoardItemsSearchState = createFeatureSelector<AppState, fromArtBoardItemSearch.State>(
  fromArtBoardItemSearch.artBoardItemSearchsFeatureKey
);
export const selectUser = createFeatureSelector<AppState, fromUser.State>(fromUser.userFeatureKey);

export const initialState = {
  boards: fromBoard.adapter.getInitialState({
    ids: ['defaultArtBoard'],
    entities: {
      defaultArtBoard: {
        id: 'defaultArtBoard',
        name: 'Default',
        type: 'ArtBoard',
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

export const selectBoardById = createSelector(
  selectBoardEntities,
  (boardEntities: Dictionary<Board>, props: { boardId: string }) => {
    return boardEntities[props.boardId];
  }
);

// -------------------
// Art Board Item selectors
// -------------------

export const {
  selectIds: selectArtBoardItemIds,
  selectEntities: selectArtBoardItemEntities,
  selectAll: selectAllArtBoardItems,
  selectTotal: selectTotalArtBoardItems,
} = fromArtBoardItem.adapter.getSelectors(selectArtBoardItemsState);

export const selectArtBoardItemById = createSelector(
  selectArtBoardItemEntities,
  (artBoardItemEntities: Dictionary<ArtBoardItem>, props: { artBoardItemId: string }) => {
    return artBoardItemEntities[props.artBoardItemId];
  }
);

export const selectArtBoardItemsByBoardId = createSelector(
  selectAllArtBoardItems,
  (artBoardItems: ArtBoardItem[], props: { boardId: string }) => {
    return artBoardItems.filter((item) => item.boardId === props.boardId);
  }
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

export const selectItemDataById = createSelector(
  selectItemDataEntities,
  (itemDataEntities: Dictionary<ItemData>, props: { itemDataId: string }) => {
    return itemDataEntities[props.itemDataId];
  }
);

// -------------------
// ArtBoardItemSearch selectors
// -------------------
export const selectArtBoardItemSearchIds = createSelector(
  selectArtBoardItemsSearchState,
  fromArtBoardItemSearch.getIds
);
export const selectArtBoardItemSearchQuery = createSelector(
  selectArtBoardItemsSearchState,
  fromArtBoardItemSearch.getQuery
);
export const selectArtBoardItemSearchLoading = createSelector(
  selectArtBoardItemsSearchState,
  fromArtBoardItemSearch.getLoading
);
export const selectArtBoardItemSearchError = createSelector(
  selectArtBoardItemsSearchState,
  fromArtBoardItemSearch.getError
);

export const selectArtBoardItemSearchResults = createSelector(
  selectArtBoardItemEntities,
  selectArtBoardItemSearchIds,
  (artBoardItems, searchIds) => {
    return searchIds
      .map((id) => artBoardItems[id])
      .filter((artBoardItem): artBoardItem is ArtBoardItem => artBoardItem != null);
  }
);
