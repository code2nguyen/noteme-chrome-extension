import {
  Compiler,
  Directive,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewContainerRef,
} from '@angular/core';
import { ExtensionConfig } from '../store/models/extension-model';
import { ExtensionId } from '../extension-id';
import { extensionConfigs, extensionLoader } from '../extension-config';
import { take } from 'rxjs/operators';
import { ItemData } from '../store/models';
import { convertItemData, getObjectPropertyValue } from '../services/utils';
import { DataChangeEvent } from '../store/models/data-change-event';
import { DataService } from '../services/data.service';

@Directive({ selector: '[ntmExtensionInject]' })
export class ExtensionInjectDirective implements OnChanges, OnDestroy {
  @Input('ntmExtensionInject') extensiontId?: ExtensionId;

  @Input() itemDataId: string;
  @Input() componentView = false;

  @Output() dataChange = new EventEmitter<DataChangeEvent>();
  @Output() activate = new EventEmitter<void>();

  private extensionConfig?: ExtensionConfig;
  private customElements?: HTMLElement[] = [];

  constructor(
    private ngZone: NgZone,
    private element: ElementRef,
    private viewContainerRef: ViewContainerRef,
    private dataService: DataService
  ) {}

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
    if (this.customElements.length > 0) {
      this.customElements[0].removeEventListener(this.extensionConfig.dataChangeEvent.event, this.onDataChangeHandler);
    }
    this.customElements.forEach((child) => child.remove());
    this.customElements = [];
  }

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
        .pipe(take(1))
        .subscribe((itemData) => {
          if (this.customElements.length > 0 && this.extensionConfig) {
            this.customElements[0][this.extensionConfig.dataInputProperty] = itemData.data;
          }
        });
    }
  }
}
