import { Routes } from '@angular/router';
import { Home } from './home/home';

export const routes: Routes = [
  { path: '', component: Home, pathMatch: 'full' },
  { path: 'main-board', loadComponent: () => import('./board/board').then((m) => m.Board) },
  // 3.0 opened on #/welcome; a bookmark or a restored tab still lands on Home.
  { path: '**', redirectTo: '' },
];
