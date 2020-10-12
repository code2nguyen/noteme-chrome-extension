import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainBoardComponent } from './main-board.component';
import { RouterModule } from '@angular/router';

import './highlight.pack.js';
import '@material/mwc-menu';
import '@material/mwc-list/mwc-list-item';
import '@cff/webcomponents/components/search-input/search-input.component';
import '@cff/webcomponents/components/dashboard-layout/dashboard-layout.component';
import '@cff/webcomponents/components/dashboard-item/dashboard-item.component';
import '@cff/webcomponents/components/delete-confirmation/delete-confirmation.component';
import { StickySidenavDirective } from './sticky-sidenav.directive';
import { ExtensionInjectDirective } from './extension-inject.directive';

@NgModule({
  declarations: [MainBoardComponent, StickySidenavDirective, ExtensionInjectDirective],
  imports: [CommonModule, RouterModule.forChild([{ path: '', pathMatch: 'full', component: MainBoardComponent }])],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MainBoardModule {}
