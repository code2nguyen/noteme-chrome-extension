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

@Directive({ selector: '[ntmExtensionInject]' })
export class ExtensionInjectDirective implements OnChanges {
  @Input('ntmExtensionInject') extensiontId?: ExtensionId;

  @Output() activate = new EventEmitter<void>();

  private extensionConfig?: ExtensionConfig;
  private customElements?: HTMLElement[];

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
        this.customElements = [];
        const customElement = document.createElement(this.extensionConfig.element);
        for (const property of this.extensionConfig.properties) {
          customElement[property.name] = property.value;
        }
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
}
