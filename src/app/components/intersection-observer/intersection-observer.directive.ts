import { Directive, ElementRef, AfterViewInit, Input, OnDestroy, Output, EventEmitter } from '@angular/core';

@Directive({ selector: '[ntmIntersectionObserver]' })
export class IntersectionObserverDirective implements AfterViewInit, OnDestroy {
  @Input('ntmIntersectionObserver') target?: string;

  @Output() overlapped = new EventEmitter<boolean>();
  private intersectionObserver?: IntersectionObserver;

  constructor(private element: ElementRef) {}

  ngAfterViewInit(): void {
    this.observeHost();
  }

  ngOnDestroy(): void {
    this.unObserveHost();
  }

  private observeHost(): void {
    if (!this.intersectionObserver) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          this.checkForIntersection(entries);
        },
        {
          root: this.target ? document.querySelector(this.target) : null,
        }
      );
    }

    this.intersectionObserver.observe(this.element.nativeElement);
  }

  private unObserveHost(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(this.element.nativeElement);
      this.intersectionObserver.disconnect();
    }
  }

  private checkForIntersection = (entries: Array<IntersectionObserverEntry>) => {
    if ((entries[0] as any).isIntersecting) {
      this.overlapped.emit(false);
    } else {
      this.overlapped.emit(true);
    }
  };
}
