import {
  Compiler,
  Directive,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
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

@Directive({ selector: '[ntmExtensionInject]' })
export class ExtensionInjectDirective implements OnChanges {
  @Input('ntmExtensionInject') extensiontId?: ExtensionId;

  @Input()
  private extensionData: ItemData;
  public get data(): ItemData {
    return this.extensionData;
  }
  public set data(value: ItemData) {
    this.extensionData = value;
    if (this.customElements.length > 0 && this.extensionConfig) {
      this.customElements[0][this.extensionConfig.dataInputProperty] = convertItemData(
        value,
        this.extensionConfig.dataType
      );
    }
  }

  @Output() dataChange = new EventEmitter<DataChangeEvent>();
  @Output() activate = new EventEmitter<void>();

  private extensionConfig?: ExtensionConfig;
  private customElements?: HTMLElement[] = [];

  constructor(
    private element: ElementRef,
    private viewContainerRef: ViewContainerRef,
    private injector: Injector,
    private compiler: Compiler
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
      this.extensionConfig = extensionConfigs[this.extensiontId];

      if (this.extensionConfig.element) {
        this.injectCustomElement();
      }
    }
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
        if (this.extensionData) {
          customElement[this.extensionConfig.dataInputProperty] = convertItemData(
            this.extensionData,
            this.extensionConfig.dataType
          );
        }
        customElement.addEventListener(this.extensionConfig.dataChangeEvent.event, this.onDataChangeHandler);
        this.customElements.push(customElement);
        if (this.extensionConfig.toolbarComponent) {
          const toolbarCustomElement = document.createElement(this.extensionConfig.toolbarComponent.element);
          toolbarCustomElement.slot = 'toolbar';
          this.customElements.push(toolbarCustomElement);
        }
        this.customElements.forEach((item) => {
          this.element.nativeElement.appendChild(item);
        });
      });
  }
  onDataChangeHandler = (event: any): void => {
    const data = getObjectPropertyValue(event, this.extensionConfig.dataChangeEvent.propertyName);
    this.dataChange.emit({ data, dataType: this.extensionConfig.dataType });
  };
}
