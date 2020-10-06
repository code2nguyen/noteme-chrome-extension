import {
  Component,
  OnInit,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  ViewChild,
  AfterViewInit,
  ElementRef,
  OnDestroy,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';

@Component({
  selector: 'ntm-mainboard',
  templateUrl: './main-board.component.html',
  styleUrls: ['./main-board.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ntm-mainboard',
  },
})
export class MainBoardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('addButton') addButton!: ElementRef;
  @ViewChild('addMenu') addMenu!: ElementRef;

  mainContainerOverlap = false;

  private mousePressTime = 0;

  constructor(private ngZone: NgZone, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  ngAfterViewInit(): void {
    this.addMenu.nativeElement.anchor = this.addButton.nativeElement;
  }

  onAddButtonMouseDown(): void {
    this.mousePressTime = new Date().getTime();
  }

  onButtonMouseUp(): void {
    const currentTime = new Date().getTime();
    console.log(currentTime - this.mousePressTime);
    if (currentTime - this.mousePressTime > 400) {
      this.addMenu.nativeElement.show();
      return;
    } else {
      this.newNote();
    }
  }

  onSelectedNoteType(event: any): void {
    console.log(event);
  }

  newNote(): void {}

  navbarOverlappedHandler(overlapped: boolean): void {
    this.mainContainerOverlap = overlapped;
    this.cd.markForCheck();
  }
}
