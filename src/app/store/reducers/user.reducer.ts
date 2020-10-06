import { createReducer, on } from '@ngrx/store';

import { User, initialUser } from '../models';
import { UserApiActions } from '../actions';

export const userFeatureKey = 'user';

export type State = User;
export const initialState: State = initialUser;

export const reducer = createReducer(
  initialState,
  on(UserApiActions.getUserSuccess, UserApiActions.updateUserSuccess, (state, { user }) => {
    return user;
  })
);
