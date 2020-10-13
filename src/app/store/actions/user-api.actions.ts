import { createAction, props } from '@ngrx/store';
import { User } from '../models';

export const getUserSuccess = createAction('[User Api] Get user Success', props<{ user: User }>());
export const getUserFailure = createAction('[User Api] Get User Failure', props<{ error: any }>());

export const updateUserSuccess = createAction('[User Api] Update User Success', props<{ user: User }>());
export const updateUserFailure = createAction('[User Api] Update User Failure', props<{ error: any }>());
