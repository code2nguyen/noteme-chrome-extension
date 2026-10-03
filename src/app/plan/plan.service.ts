import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { INSTANCE_ID } from '../services/instance-id';
import { STORAGE_API } from '../services/storage.api';
import { uuid } from '../services/utils';
import { parsePlans, PlanItem } from './plan';

/** The one record holding every plan: small, so it is read and written whole. */
export const PLAN_KEY = 'PLAN__ITEMS';

/**
 * The plans, as a signal. Each change writes the whole list (a few KB at most); another tab's change arrives through
 * chrome.storage's change event and replaces the list.
 */
@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly storage = inject(STORAGE_API);
  private readonly instanceId = inject(INSTANCE_ID);
  private readonly state = signal<PlanItem[]>([]);
  readonly items = this.state.asReadonly();
  readonly loaded = signal(false);

  constructor() {
    this.storage.get(PLAN_KEY).subscribe((raw) => {
      this.state.set(parsePlans(raw));
      this.loaded.set(true);
    });
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
        const change = changes[PLAN_KEY];
        if (area !== 'local' || !change) {
          return;
        }
        const value = typeof change.newValue === 'string' ? JSON.parse(change.newValue) : null;
        if (value?.sourceId !== this.instanceId) {
          this.state.set(parsePlans(value));
        }
      };
      chrome.storage.onChanged.addListener(listener);
      inject(DestroyRef).onDestroy(() => chrome.storage.onChanged.removeListener(listener));
    }
  }

  add(plan: Omit<PlanItem, 'id'>): PlanItem {
    const item = { ...plan, id: uuid() };
    this.write([...this.state(), item]);
    return item;
  }

  update(item: PlanItem): void {
    this.write(this.state().map((current) => (current.id === item.id ? item : current)));
  }

  remove(id: string): void {
    this.write(this.state().filter((item) => item.id !== id));
  }

  find(id: string | undefined): PlanItem | undefined {
    return this.state().find((item) => item.id === id);
  }

  private write(items: PlanItem[]): void {
    this.state.set(items);
    this.storage.set(PLAN_KEY, { items }).subscribe();
  }
}
