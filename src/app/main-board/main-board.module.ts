import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainBoardComponent } from './main-board.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [MainBoardComponent],
  imports: [CommonModule, RouterModule.forChild([{ path: '', pathMatch: 'full', component: MainBoardComponent }])],
})
export class MainBoardModule {}
