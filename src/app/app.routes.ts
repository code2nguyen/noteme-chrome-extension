import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { Home } from './home/home';
import { hasFeature } from './settings/settings';
import { SettingsService } from './settings/settings.service';

/**
 * An optional feature switched off in Settings: its link or bookmark leads Home. Off in the local mirror is only
 * believed once the synced settings are read: a new profile has no mirror yet, and Plan may be on in the sync.
 */
const planOn = async () => {
  const settings = inject(SettingsService);
  const home = inject(Router).createUrlTree(['/']);
  if (hasFeature(settings.settings(), 'plan')) {
    return true;
  }
  await settings.loaded;
  return hasFeature(settings.settings(), 'plan') || home;
};

export const routes: Routes = [
  { path: '', component: Home, pathMatch: 'full' },
  { path: 'main-board', loadComponent: () => import('./board/board').then((m) => m.Board) },
  { path: 'page/:id', loadComponent: () => import('./page/page-view').then((m) => m.PageView) },
  {
    path: 'plan',
    canMatch: [planOn],
    loadComponent: () => import('./plan/plan-view').then((m) => m.PlanViewComponent),
  },
  { path: 'flow/:id', loadComponent: () => import('./flow/flow-view').then((m) => m.FlowView) },
  // 3.0 opened on #/welcome; a bookmark or a restored tab still lands on Home.
  { path: '**', redirectTo: '' },
];
