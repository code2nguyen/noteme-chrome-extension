import { createAction, props } from '@ngrx/store';
import { ItemData } from '../models';

export const getItemDataSuccess = createAction(
  '[Item Data] Retrieve item data by Id Success',
  props<{ itemData: ItemData }>()
);
export const getItemDataFailure = createAction('[Item Data] Retrieve item data by Id Failure', props<{ error: any }>());

export const updateItemDataSuccess = createAction(
  'Item Data] Update item data Success',
  props<{ itemData: ItemData }>()
);
export const updateItemDataFailure = createAction('Item Data] Update item data Failure', props<{ error: any }>());

export const createItemDataSuccess = createAction(
  'Item Data] Create item data Success',
  props<{ itemData: ItemData }>()
);
export const createItemDataFailure = createAction('Item Data] Create item data Failure', props<{ error: any }>());

export const deleteItemDataSuccess = createAction(
  '[Item Data] Delete item data Success',
  props<{ itemDataId: string }>()
);
export const deleteItemDataFailure = createAction('[Item Data] Delete item data Failure', props<{ error: any }>());
