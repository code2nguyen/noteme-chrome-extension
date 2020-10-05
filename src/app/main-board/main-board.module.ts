import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainBoardComponent } from './main-board.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [MainBoardComponent],
  imports: [CommonModule, RouterModule.forChild([{ path: '', pathMatch: 'full', component: MainBoardComponent }])],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MainBoardModule {}
