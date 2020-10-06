import { createAction, props } from '@ngrx/store';
import { User } from '../models';

export const getUserSuccess = createAction('[User] Get user Success', props<{ user: User }>());
export const getUserFailure = createAction('[User] Get User Failure', props<{ error: any }>());

export const updateUserSuccess = createAction('[User] Update User Success', props<{ user: User }>());
export const updateUserFailure = createAction('[User] Update User Failure', props<{ error: any }>());
