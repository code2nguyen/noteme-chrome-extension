import { createAction, props } from '@ngrx/store';
import { ItemData } from '../models';

export const getAllItemDataSuccess = createAction(
  '[Item Data Api] Retrieve all item data Success ',
  props<{ itemDatas: ItemData[] }>()
);

export const getAllItemDataFailure = createAction(
  '[Item Data Api] Retrieve all item data Failure',
  props<{ error: any }>()
);

export const getItemDataSuccess = createAction(
  '[Item Data Api] Retrieve item data by Id Success',
  props<{ itemData: ItemData }>()
);
export const getItemDataFailure = createAction(
  '[Item Data Api] Retrieve item data by Id Failure',
  props<{ error: any }>()
);

export const updateItemDataSuccess = createAction(
  '[Item Data Api] Update item data Success',
  props<{ itemData: ItemData }>()
);
export const updateItemDataFailure = createAction('Item Data] Update item data Failure', props<{ error: any }>());

export const createItemDataSuccess = createAction(
  'Item Data] Create item data Success',
  props<{ itemData: ItemData }>()
);
export const createItemDataFailure = createAction('Item Data] Create item data Failure', props<{ error: any }>());

export const deleteItemDataSuccess = createAction(
  '[Item Data Api] Delete item data Success',
  props<{ itemDataId: string }>()
);
export const deleteItemDataFailure = createAction('[Item Data Api] Delete item data Failure', props<{ error: any }>());
