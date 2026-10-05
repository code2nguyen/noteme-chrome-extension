import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { INSTANCE_ID } from '../services/instance-id';
import { STORAGE_API } from '../services/storage.api';
import { uuid } from '../services/utils';
import { parsePlans, PlanItem } from './plan';

/** The one record holding every plan: small, so it is read and written whole. */
export const PLAN_KEY = 'PLAN__ITEMS';

/**
 * The plans, as a signal. Each change writes the whole list (a few KB at most); another tab's change arrives through
 * chrome.storage's change event and replaces the list. A change made before the stored list has been read shows at
 * once and is replayed onto that list when it arrives, so the first write never drops what is stored.
 */
@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly storage = inject(STORAGE_API);
  private readonly instanceId = inject(INSTANCE_ID);
  private readonly state = signal<PlanItem[]>([]);
  readonly items = this.state.asReadonly();
  readonly loaded = signal(false);
  private pending: ((items: PlanItem[]) => PlanItem[])[] = [];

  constructor() {
    this.storage.get(PLAN_KEY).subscribe((raw) => {
      const changes = this.pending;
      this.pending = [];
      this.loaded.set(true);
      const items = changes.reduce((list, change) => change(list), parsePlans(raw));
      if (changes.length > 0) {
        this.write(items);
      } else {
        this.state.set(items);
      }
    });
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
        const change = changes[PLAN_KEY];
        if (area !== 'local' || !change) {
          return;
        }
        const value = parseRecord(change.newValue);
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
    this.change((items) => [...items, item]);
    return item;
  }

  update(item: PlanItem): void {
    this.change((items) => items.map((current) => (current.id === item.id ? item : current)));
  }

  remove(id: string): void {
    this.change((items) => items.filter((item) => item.id !== id));
  }

  find(id: string | undefined): PlanItem | undefined {
    return this.state().find((item) => item.id === id);
  }

  private change(apply: (items: PlanItem[]) => PlanItem[]): void {
    if (this.loaded()) {
      this.write(apply(this.state()));
    } else {
      this.pending.push(apply);
      this.state.set(apply(this.state()));
    }
  }

  private write(items: PlanItem[]): void {
    this.state.set(items);
    this.storage.set(PLAN_KEY, { items }).subscribe();
  }
}

/** A corrupted record reads as no plans, as parsePlans does with anything malformed, instead of throwing. */
function parseRecord(text: unknown): { sourceId?: string } | null {
  try {
    return typeof text === 'string' ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}
