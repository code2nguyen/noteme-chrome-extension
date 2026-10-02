import { Routes } from '@angular/router';
import { Welcome } from './welcome/welcome';

export const routes: Routes = [
  { path: 'main-board', loadComponent: () => import('./board/board').then((m) => m.Board) },
  { path: 'welcome', component: Welcome },
  { path: '', redirectTo: 'welcome', pathMatch: 'full' },
  { path: '**', redirectTo: 'welcome' },
];
