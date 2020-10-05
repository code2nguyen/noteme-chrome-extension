import { Component, OnInit, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';

@Component({
  templateUrl: './main-board.component.html',
  styleUrls: ['./main-board.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainBoardComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
