import { Routes } from '@angular/router';
import { Home } from './home/home';

export const routes: Routes = [
  { path: '', component: Home, pathMatch: 'full' },
  { path: 'main-board', loadComponent: () => import('./board/board').then((m) => m.Board) },
  { path: 'page/:id', loadComponent: () => import('./page/page-view').then((m) => m.PageView) },
  { path: 'plan', loadComponent: () => import('./plan/plan-view').then((m) => m.PlanViewComponent) },
  { path: 'flow/:id', loadComponent: () => import('./flow/flow-view').then((m) => m.FlowView) },
  // 3.0 opened on #/welcome; a bookmark or a restored tab still lands on Home.
  { path: '**', redirectTo: '' },
];
