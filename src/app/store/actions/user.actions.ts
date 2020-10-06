import { createAction, props } from '@ngrx/store';
import { User } from '../models';

export const getUser = createAction('[User] Get user');

export const updateUser = createAction('[User] Update User', props<{ user: User }>());
