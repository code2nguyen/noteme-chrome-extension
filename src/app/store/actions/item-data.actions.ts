import { createAction, props } from '@ngrx/store';
import { ItemData } from '../models';

export const getAllItemData = createAction('[Item Data] Retrieve all item data ');
export const getItemData = createAction('[Item Data] Retrieve item data by Id', props<{ itemDataId: string }>());
export const updateItemData = createAction('Item Data] Update item data', props<{ itemData: Partial<ItemData> }>());
export const createItemData = createAction('Item Data] Create item data', props<{ itemData: ItemData }>());
export const deleteItemData = createAction('[Item Data] Delete item data', props<{ itemDataId: string }>());
