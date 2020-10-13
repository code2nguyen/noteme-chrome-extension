import { EntityState, createEntityAdapter, EntityAdapter, Update } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';

import { ItemData } from '../models';
import { ItemDataApiActions } from '../actions';

export const dataItemsFeatureKey = 'itemDatas';

export interface State extends EntityState<ItemData> {
  isAllLoaded: boolean;
}

export const adapter: EntityAdapter<ItemData> = createEntityAdapter<ItemData>({
  selectId: (item: ItemData) => item.id,
  sortComparer: false,
});

export const initialState: State = adapter.getInitialState({
  isAllLoaded: false,
});

export const reducer = createReducer(
  initialState,
  on(ItemDataApiActions.getAllItemDataSuccess, (state, { itemDatas }) => {
    const newItems = itemDatas.filter((item) => item && !state.entities[item.id]);
    return {
      ...adapter.addMany(newItems, state),
      ...{ isAllLoaded: true },
    };
  }),
  on(ItemDataApiActions.getItemDataSuccess, (state, { itemData }) => {
    return adapter.upsertOne(itemData, state);
  }),
  on(ItemDataApiActions.createItemDataSuccess, (state, { itemData }) => {
    return adapter.addOne(itemData, state);
  }),
  on(ItemDataApiActions.updateItemDataSuccess, (state, { itemData }) => {
    return adapter.upsertOne(itemData, state);
  }),
  on(ItemDataApiActions.deleteItemDataSuccess, (state, { itemDataId }) => {
    return adapter.removeOne(itemDataId, state);
  })
);
