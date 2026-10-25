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

  /** The app root hands over its region once drawn. */
  attach(region: ToastRegion): void {
    this.region = region;
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
    const id = this.region.show(options);
    if (id && onAction) {
      this.actions.set(id, onAction);
    }
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
