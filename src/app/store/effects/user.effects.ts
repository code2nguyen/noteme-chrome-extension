import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';

import { UserActions, UserApiActions } from '../actions';
import { STORAGE_API, userKey } from '../../services/storage.api';
import { initialUser, User } from '../models';

@Injectable()
export class UserEffects {
  private readonly actions$ = inject(Actions);
  private readonly storageApi = inject(STORAGE_API);

  init$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      map(() => UserActions.getUser()),
    ),
  );

  getUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.getUser),
      mergeMap(() =>
        this.storageApi.get<User>(userKey()).pipe(
          map((user) => UserApiActions.getUserSuccess({ user: user ?? initialUser })),
          catchError((error) => of(UserApiActions.getUserFailure({ error }))),
        ),
      ),
    ),
  );

  updateUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.updateUser),
      mergeMap(({ user }) =>
        this.storageApi.set(userKey(), user).pipe(
          map(() => UserApiActions.updateUserSuccess({ user })),
          catchError((error) => of(UserApiActions.updateUserFailure({ error }))),
        ),
      ),
    ),
  );
}
