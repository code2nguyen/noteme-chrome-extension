import { Injectable, Inject } from '@angular/core';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { of } from 'rxjs';

import { UserActions, UserApiActions } from '../actions';
import { StorageApi, STORAGE_API, userKey } from '../../services/storage.api';
import { catchError, map, mergeMap, mapTo } from 'rxjs/operators';
import { User, initialUser } from '../models';

@Injectable()
export class UserEffects {
  init$ = createEffect(() => this.actions$.pipe(ofType(ROOT_EFFECTS_INIT), mapTo(UserActions.getUser())));

  getUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.getUser),
      mergeMap(() => {
        return this.storageApi.get<User>(userKey()).pipe(
          map((user) => {
            if (user) {
              return UserApiActions.getUserSuccess({ user });
            }
            return UserApiActions.getUserSuccess({ user: initialUser });
          }),
          catchError((error) => of(UserApiActions.getUserFailure({ error })))
        );
      })
    )
  );

  updateUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.updateUser),
      mergeMap(({ user }) => {
        return this.storageApi.set(userKey(), user).pipe(
          map(() => {
            return UserApiActions.updateUserSuccess({ user });
          }),
          catchError((error) => of(UserApiActions.updateUserFailure({ error })))
        );
      })
    )
  );
  constructor(private actions$: Actions, @Inject(STORAGE_API) private storageApi: StorageApi) {}
}
