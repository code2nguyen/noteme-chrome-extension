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
import { getObjectPropertyValue } from '../services/utils';
import { DataChangeEvent } from '../store/models/data-change-event';
import { DataService } from '../services/data.service';
import { MainBoardComponent } from './main-board.component';
import { Subscription } from 'rxjs';

@Directive({ selector: '[ntmExtensionInject]' })
export class ExtensionInjectDirective implements OnChanges, OnDestroy, AfterViewInit {
  @Input('ntmExtensionInject') extensiontId?: ExtensionId;

  @Input() itemDataId: string;
  @Input() componentView = false;

  @Output() dataChange = new EventEmitter<DataChangeEvent>();
  @Output() activate = new EventEmitter<void>();

  private firstBindingData = true;
  private extensionConfig?: ExtensionConfig;
  private customElements?: HTMLElement[] = [];
  private highlightSubscription = Subscription.EMPTY;
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
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.extensiontId) {
      if (!changes.extensiontId.isFirstChange()) {
        this.viewContainerRef.clear();
        if (this.customElements.length > 0) {
          this.customElements[0].removeEventListener(
            this.extensionConfig.dataChangeEvent.event,
            this.onDataChangeHandler
          );
        }
        this.customElements.forEach((child) => child.remove());
        this.customElements = [];
      }
      this.extensionConfig = this.componentView
        ? { ...extensionConfigs[this.extensiontId], ...extensionConfigs[this.extensiontId].viewComponent }
        : extensionConfigs[this.extensiontId];

      if (this.extensionConfig.element) {
        this.injectCustomElement();
      }
    }
  }

  ngOnDestroy(): void {
    this.highlightSubscription.unsubscribe();
    if (this.customElements.length > 0) {
      this.customElements[0].removeEventListener(this.extensionConfig.dataChangeEvent.event, this.onDataChangeHandler);
    }
    this.customElements.forEach((child) => child.remove());
    this.customElements = [];
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
        for (const property of this.extensionConfig.properties) {
          customElement[property.name] = property.value;
        }
        if (!this.componentView) {
          customElement.addEventListener(this.extensionConfig.dataChangeEvent.event, this.onDataChangeHandler);
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

  onDataChangeHandler = (event: any): void => {
    this.ngZone.runOutsideAngular(() => {
      const data = getObjectPropertyValue(event, this.extensionConfig.dataChangeEvent.propertyName);
      this.dataChange.emit({ data, dataType: this.extensionConfig.dataType });
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
            this.customElements[0][this.extensionConfig.dataInputProperty] = itemData.data;
          }
        });
    }
  }
}
