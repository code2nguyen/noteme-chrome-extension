import '@c2n/components/skip-link';
import '@c2n/components/toast';

import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import type { ToastRegion } from '@c2n/components/toast';
import { I18n } from './i18n/i18n.service';
import { ImageRefusedError, ImageStore } from './services/image-store';
import { Toasts } from './services/toasts';

@Component({
  selector: 'ntm-app',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // First in the page, out of sight until a Tab reaches it: it moves the focus past the header to the view's <main>.
  // The one toast region every view shows its messages in (Toasts): an Undo on the board, an image not kept.
  template: `<c2-skip-link></c2-skip-link><router-outlet />
    <c2-toast-region
      #toasts
      class="app__toasts"
      position="bottom-center"
      (toast-action)="onToastAction($event)"
      (toast-dismiss)="onToastDismiss($event)"
    ></c2-toast-region>`,
})
export class App {
  private readonly t = inject(I18n).t;
  private readonly toasts = inject(Toasts);
  private readonly region = viewChild<ElementRef<ToastRegion>>('toasts');

  constructor() {
    afterNextRender(() => {
      const region = this.region()?.nativeElement;
      if (region) {
        this.toasts.attach(region);
      }
    });
    const failures = inject(ImageStore).failures.subscribe((error) => {
      const reason = error instanceof ImageRefusedError ? error.reason : null;
      this.toasts.show({
        id: 'image-failed',
        message: this.t(
          reason === 'size'
            ? 'common.image.tooLarge'
            : reason === 'type'
              ? 'common.image.notImage'
              : 'common.image.notSaved',
        ),
        variant: 'error',
        duration: 5000,
      });
    });
    inject(DestroyRef).onDestroy(() => failures.unsubscribe());
  }

  onToastAction(event: Event): void {
    this.toasts.acted((event as CustomEvent<{ id: string }>).detail.id);
  }

  onToastDismiss(event: Event): void {
    this.toasts.dismissed((event as CustomEvent<{ id: string }>).detail.id);
  }
}
