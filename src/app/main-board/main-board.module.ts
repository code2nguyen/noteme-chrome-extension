import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainBoardComponent } from './main-board.component';
import { RouterModule } from '@angular/router';

import '@material/mwc-menu';
import '@material/mwc-list/mwc-list-item';
import '@cff/webcomponents/components/search-input/search-input.component';
import '@cff/webcomponents/components/dashboard-layout/dashboard-layout.component';
import '@cff/webcomponents/components/dashboard-item/dashboard-item.component';

@NgModule({
  declarations: [MainBoardComponent],
  imports: [CommonModule, RouterModule.forChild([{ path: '', pathMatch: 'full', component: MainBoardComponent }])],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MainBoardModule {}
