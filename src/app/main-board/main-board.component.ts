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
  @ViewChild('mainContainer') mainContainer!: ElementRef;

  mainContainerOverlap = false;

  private mousePressTime = 0;
  private intersectionObserver?: IntersectionObserver;

  constructor(private ngZone: NgZone, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(this.mainContainer.nativeElement);
      this.intersectionObserver.disconnect();
    }
  }

  ngAfterViewInit(): void {
    this.addMenu.nativeElement.anchor = this.addButton.nativeElement;
    // this.observeIntersectionNavbar();
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

  observeIntersectionNavbar(): void {
    this.intersectionObserver = new IntersectionObserver((entries) => {
      this.checkForIntersection(entries);
    }, {});
    this.ngZone.runOutsideAngular(() => {
      this.intersectionObserver.observe(this.mainContainer.nativeElement);
    });
  }

  private checkForIntersection = (entries: Array<IntersectionObserverEntry>) => {
    let overlaped: boolean;
    if ((entries[0] as any).isIntersecting) {
      overlaped = false;
    } else {
      overlaped = true;
    }
    if (overlaped !== this.mainContainerOverlap) {
      this.ngZone.run(() => {
        this.mainContainerOverlap = overlaped;
        this.cd.markForCheck();
      });
    }
  };
}
