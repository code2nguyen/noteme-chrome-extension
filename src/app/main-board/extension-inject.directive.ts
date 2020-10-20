import {
  AfterViewInit,
  APP_ID,
  Directive,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewContainerRef,
} from '@angular/core';
import { ExtensionConfig } from '../store/models/extension-model';
import { ExtensionId } from '../extension-id';
import { extensionConfigs, extensionLoader } from '../extension-config';
import { filter, take } from 'rxjs/operators';
import { getObjectPropertyValue, getOutletObjectValue } from '../services/utils';
import { DataService } from '../services/data.service';
import { MainBoardComponent } from './main-board.component';
import { Subscription } from 'rxjs';
import { ItemData } from '../store/models';

@Directive({ selector: '[ntmExtensionInject]' })
export class ExtensionInjectDirective implements OnChanges, OnDestroy, AfterViewInit {
  @Input('ntmExtensionInject') extensiontId?: ExtensionId;

  @Input() itemDataId: string;
  @Input() componentView = false;

  @Output() dataChange = new EventEmitter<Partial<ItemData>>();
  @Output() activate = new EventEmitter<void>();

  private firstBindingData = true;
  private extensionConfig?: ExtensionConfig;
  private customElements?: HTMLElement[] = [];
  private highlightSubscription = Subscription.EMPTY;
  private focusSubscription = Subscription.EMPTY;
  constructor(
    @Inject(APP_ID) private ID: string,
    private parent: MainBoardComponent,
    private ngZone: NgZone,
    private element: ElementRef,
    private viewContainerRef: ViewContainerRef,
    private dataService: DataService
  ) {}

  ngAfterViewInit(): void {
    this.highlightSubscription = this.parent.highlightItem$.subscribe((highlightItemId) => {
      this.highlight(highlightItemId);
    });
    this.focusSubscription = this.parent.focusItem$.subscribe((focusItemid) => {
      this.focus(focusItemid);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.extensiontId) {
      if (!changes.extensiontId.isFirstChange()) {
        this.viewContainerRef.clear();
        if (this.customElements.length > 0) {
          if (this.customElements.length > 0) {
            this.removeEventListener(this.customElements[0]);
          }
        }
        this.customElements.forEach((child) => child.remove());
        this.customElements = [];
      }
      this.extensionConfig = this.componentView
        ? {
            ...extensionConfigs[this.extensiontId],
            ...extensionConfigs[this.extensiontId].viewComponent,
            ...{ events: [] },
          }
        : extensionConfigs[this.extensiontId];

      if (this.extensionConfig.element) {
        this.injectCustomElement();
      }
    }
  }

  ngOnDestroy(): void {
    this.highlightSubscription.unsubscribe();
    this.focusSubscription.unsubscribe();
    if (this.customElements.length > 0) {
      this.removeEventListener(this.customElements[0]);
    }
    this.customElements.forEach((child) => child.remove());
    this.customElements = [];
  }

  focus(focusItemId: string): void {
    if (focusItemId !== this.itemDataId) {
      return;
    }
    if (this.customElements.length > 0 && typeof this.customElements[0].focus === 'function') {
      this.customElements[0].focus();
    }
  }

  highlight(highlightItemId: string): void {
    if (highlightItemId !== this.itemDataId) {
      return;
    }
    setTimeout(() => {
      this.element.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    }, 1);
    this.element.nativeElement.classList.add('blink');
    this.element.nativeElement.addEventListener('animationend', this.removeBlinkClass);
  }

  removeBlinkClass = () => {
    this.element.nativeElement.classList.remove('blink');
  };

  injectCustomElement(): void {
    const loader = extensionLoader[this.extensiontId];
    loader
      .load()
      .pipe(take(1))
      .subscribe(() => {
        this.activate.emit();
        this.customElements = [];
        const customElement = document.createElement(this.extensionConfig.element);
        for (const property of this.extensionConfig.staticProperties) {
          customElement[property.name] = property.value;
        }

        if (!this.componentView) {
          this.bindEventListener(customElement);
        }

        this.customElements.push(customElement);
        if (!this.componentView && this.extensionConfig.toolbarComponent) {
          const toolbarCustomElement = document.createElement(this.extensionConfig.toolbarComponent.element);
          toolbarCustomElement.slot = 'toolbar';
          this.customElements.push(toolbarCustomElement);
        }
        this.customElements.forEach((item) => {
          this.element.nativeElement.appendChild(item);
        });
        this.firstBindingData = true;
        this.bindingData();
      });
  }

  bindEventListener(targetElement: HTMLElement): void {
    for (const event of this.extensionConfig.events) {
      targetElement.addEventListener(event.event, this.onEventHandler);
    }
  }

  removeEventListener(targetElement: HTMLElement): void {
    for (const event of this.extensionConfig.events) {
      targetElement.removeEventListener(event.event, this.onEventHandler);
    }
  }

  onEventHandler = (event: Event): void => {
    this.ngZone.runOutsideAngular(() => {
      const eventConfig = this.extensionConfig.events.find((evt) => evt.event === event.type);
      if (eventConfig) {
        const data = getOutletObjectValue(
          getObjectPropertyValue(event, eventConfig.propertyName),
          eventConfig.dataItemPropertyName
        );
        data.id = this.itemDataId;
        data.dataType = this.extensionConfig.dataType;
        this.dataChange.emit(data);
      }
    });
  };

  private bindingData(): void {
    if (this.itemDataId) {
      this.dataService
        .getItemData(this.itemDataId)
        .pipe(filter((itemData) => this.firstBindingData || itemData.sourceId !== this.ID))
        .subscribe((itemData) => {
          if (this.customElements.length > 0 && this.extensionConfig) {
            this.firstBindingData = false;
            for (const properyBinding of this.extensionConfig.dataBindings) {
              const value = getObjectPropertyValue(itemData, properyBinding.dataItemPropertyName);
              if (value) {
                this.customElements[0][properyBinding.propertyName] = value;
              }
            }

            if (
              !this.componentView &&
              this.extensionConfig.toolbarComponent &&
              this.extensionConfig.toolbarComponent.dataBindings
            ) {
              for (const properyBinding of this.extensionConfig.toolbarComponent.dataBindings) {
                const value = getObjectPropertyValue(itemData, properyBinding.dataItemPropertyName);
                if (value) {
                  this.customElements[1][properyBinding.propertyName] = value;
                }
              }
            }
          }
        });
    }
  }
}
