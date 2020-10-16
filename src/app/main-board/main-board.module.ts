import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainBoardComponent } from './main-board.component';
import { RouterModule } from '@angular/router';

import './highlight.pack.js';
import '@material/mwc-menu';
import '@material/mwc-list/mwc-list-item';
import '@c2n/webcomponents/components/search-input/search-input.component';
import '@c2n/webcomponents/components/dashboard-layout/dashboard-layout.component';
import '@c2n/webcomponents/components/dashboard-item/dashboard-item.component';
import '@c2n/webcomponents/components/delete-confirmation/delete-confirmation.component';
import '@c2n/webcomponents/components/tab-menu/tab-menu.component';
import { StickySidenavDirective } from './sticky-sidenav.directive';
import { ExtensionInjectDirective } from './extension-inject.directive';

@NgModule({
  declarations: [MainBoardComponent, StickySidenavDirective, ExtensionInjectDirective],
  imports: [CommonModule, RouterModule.forChild([{ path: '', pathMatch: 'full', component: MainBoardComponent }])],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MainBoardModule {}
