import { Injectable } from '@angular/core';
import { User, initialUser } from '../store/models';
import { AppState, selectUser } from '../store/reducers';
import { Store, select } from '@ngrx/store';
import { UserActions } from '../store/actions';

@Injectable({ providedIn: 'root' })
export class UserService {
  user: User = initialUser;
  constructor(private store: Store<AppState>) {
    this.store.pipe(select(selectUser)).subscribe((user) => {
      this.user = user;
    });
  }

  updateUser(user: Partial<User>): void {
    this.store.dispatch(UserActions.updateUser({ user: { ...this.user, ...user } }));
  }
}
