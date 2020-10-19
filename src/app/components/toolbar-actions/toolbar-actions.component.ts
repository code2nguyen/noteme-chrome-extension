import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ContentChildren,
  TemplateRef,
  ViewEncapsulation,
  ElementRef,
  OnDestroy,
  ViewChildren,
  QueryList,
  ChangeDetectorRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { ToolbarActionMenuItemDirective } from './toolbar-action-menu-item.directive';
import { ToolbarActionItemDirective } from './toolbar-action-item.directive';
import { resizeObserver } from '@c2n/webcomponents/shared/resize-observer';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { getPixel } from '@c2n/webcomponents/shared/utils';
@Component({
  selector: 'ntm-toolbar-actions',
  templateUrl: './toolbar-actions.component.html',
  styleUrls: ['./toolbar-actions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ntm-toolbar-actions',
  },
})
export class ToolbarActionsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ContentChildren(ToolbarActionItemDirective, { read: TemplateRef }) items: QueryList<
    TemplateRef<ToolbarActionItemDirective>
  >;

  @ContentChildren(ToolbarActionMenuItemDirective, { read: TemplateRef }) menuItems: QueryList<
    TemplateRef<ToolbarActionMenuItemDirective>
  >;

  @ViewChildren('toolbarActionItem') actionItems: QueryList<ElementRef>;
  @ViewChild('showMoreButton', { static: true }) showMoreButton: ElementRef;
  @ViewChild('menu', { static: true }) menu: ElementRef;

  startMenuItemIndex = 0;
  private destroyed$ = new Subject<void>();
  private element: HTMLElement;

  constructor(elementRef: ElementRef, private cd: ChangeDetectorRef) {
    this.element = elementRef.nativeElement;
  }

  ngOnInit(): void {
    resizeObserver(this.element)
      .pipe(takeUntil(this.destroyed$))
      .subscribe((_) => {
        this.invalidateView();
      });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
  ngAfterViewInit(): void {
    this.menu.nativeElement.anchor = this.showMoreButton.nativeElement;
  }

  invalidateView(): void {
    this.menu.nativeElement.open = false;
    const actionBarWith = this.element.offsetWidth - 36;
    let countingWith = 0;
    let hasHiddenItem = false;
    let currentMoreButtonPosistion = 0;
    let startHiddenItemIndex = -1;
    this.actionItems.forEach((action, index) => {
      countingWith += action.nativeElement.offsetWidth;
      if (countingWith > actionBarWith) {
        action.nativeElement.style.visibility = 'hidden';
        action.nativeElement.style.position = 'absolute';
        hasHiddenItem = true;
        if (startHiddenItemIndex === -1) {
          startHiddenItemIndex = index;
        }
      } else {
        action.nativeElement.style.visibility = 'visible';
        action.nativeElement.style.position = '';
        currentMoreButtonPosistion += action.nativeElement.offsetWidth;
      }
    });

    if (startHiddenItemIndex !== -1) {
      this.startMenuItemIndex = startHiddenItemIndex;
      this.cd.markForCheck();
    }
    this.showMoreButton.nativeElement.style.visibility = hasHiddenItem ? 'visible' : 'hidden';
    this.showMoreButton.nativeElement.style.left = getPixel(currentMoreButtonPosistion);
  }

  showMore(): void {
    this.menu.nativeElement.open = true;
  }
}
