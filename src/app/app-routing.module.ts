import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LocationStrategy, HashLocationStrategy, PathLocationStrategy } from '@angular/common';
import { WelcomePageComponent } from './welcome-page/welcome-page.component';
import { concat, forkJoin, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

const appRoutes: Routes = [
  {
    path: 'main-board',
    loadChildren: () => {
      return forkJoin([
        from(import('@cff/webcomponents/components/search-input/search-input.component.js')),
        from(import('@cff/webcomponents/components/dashboard-layout/dashboard-layout.component.js')),
        from(import('@cff/webcomponents/components/dashboard-item/dashboard-item.component.js')),
      ]).pipe(
        mergeMap((_) => {
          return from(import('./main-board/main-board.module').then((m) => m.MainBoardModule));
        })
      );
    },
    data: {
      animation: 'MainBoard',
    },
  },
  { path: 'welcome', component: WelcomePageComponent },
  { path: '', redirectTo: 'welcome', pathMatch: 'full' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(appRoutes, {
      useHash: true,
      initialNavigation: 'enabled',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
