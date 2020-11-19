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
import { ExtensionInjectDirective } from './extension-inject.directive';
import { ToolbarActionsModule } from '../components/toolbar-actions/toolbar-actions.module';
import { IntersectionObserverModule } from '../components/intersection-observer/intersection-observer.module';
import '@material/mwc-circular-progress-four-color';

@NgModule({
  declarations: [MainBoardComponent, ExtensionInjectDirective],
  imports: [
    CommonModule,
    RouterModule.forChild([{ path: '', pathMatch: 'full', component: MainBoardComponent }]),
    ToolbarActionsModule,
    IntersectionObserverModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MainBoardModule {}
