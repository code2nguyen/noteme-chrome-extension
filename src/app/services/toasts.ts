import { Injectable } from '@angular/core';
import type { ToastOptions, ToastRegion } from '@c2n/components/toast';

/**
 * Noteme's one place for messages: the c2-toast-region at the app root, which every view shows its toasts in, so two
 * messages never stack at the same spot. A toast with an action (an Undo) runs it when it is clicked.
 */
@Injectable({ providedIn: 'root' })
export class Toasts {
  private region?: ToastRegion;
  /** What each toast's action does, by the toast's id. */
  private readonly actions = new Map<string, () => void>();
  /** Toasts asked for before the region was drawn, shown once it is. */
  private waiting: [ToastOptions, (() => void) | undefined][] = [];
  private defined?: Promise<unknown>;
  /**
   * c2-toast-region's code, read with the first toast: most new tabs show none, so the region waits in the page as an
   * unknown element until then, and is upgraded where it stands.
   */
  load: () => Promise<unknown> = () => import('@c2n/components/toast');

  /** The app root hands over its region once drawn. */
  attach(region: ToastRegion): void {
    this.region = region;
    // Read ahead once the page is idle: the first toast (an Undo) then does not depend on a file read at that moment.
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => void this.define().catch(() => undefined));
    }
    const waiting = this.waiting;
    this.waiting = [];
    for (const [options, onAction] of waiting) {
      this.show(options, onAction);
    }
  }

  /** Shows a toast; `onAction` runs when its action (`actionLabel`) is clicked. */
  show(options: ToastOptions, onAction?: () => void): void {
    if (!this.region) {
      this.waiting.push([options, onAction]);
      return;
    }
    const region = this.region;
    this.define().then(
      () => {
        const id = region.show(options);
        if (id && onAction) {
          this.actions.set(id, onAction);
        }
      },
      (error: unknown) => console.error('Could not show a message', error),
    );
  }

  /** c2-toast-region's code, read once; a failed read is tried again by the next toast. */
  private define(): Promise<unknown> {
    this.defined ??= this.load().catch((error: unknown) => {
      this.defined = undefined;
      throw error;
    });
    return this.defined;
  }

  /** The region's `toast-action`. */
  acted(id: string): void {
    this.actions.get(id)?.();
    this.actions.delete(id);
  }

  /** The region's `toast-dismiss`: its action can no longer run. */
  dismissed(id: string): void {
    this.actions.delete(id);
  }
}
