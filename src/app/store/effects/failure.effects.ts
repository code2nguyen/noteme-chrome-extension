import { inject, Injectable } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { filter, tap } from 'rxjs/operators';

/** Every effect turns its errors into a `… Failure` action; without this they would vanish silently. */
@Injectable()
export class FailureEffects {
  private readonly actions$ = inject(Actions);

  logFailures$ = createEffect(
    () =>
      this.actions$.pipe(
        filter((action) => / Failure$/.test(action.type)),
        tap((action) => console.error(action.type, (action as { error?: unknown }).error)),
      ),
    { dispatch: false },
  );
}
