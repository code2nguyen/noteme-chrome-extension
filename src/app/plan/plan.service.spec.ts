// The service is partially compiled: JIT finishes it outside an Angular build.
import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { INSTANCE_ID } from '../services/instance-id';
import { STORAGE_API, StorageApi } from '../services/storage.api';
import { PLAN_KEY, PlanService } from './plan.service';

describe('PlanService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reads the stored plans again when the first read failed, and keeps both', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const stored = { items: [{ id: 'kept', title: 'Dentist', date: '2026-10-06' }] };
    const writes: unknown[] = [];
    let reads = 0;
    const storage = {
      get: () => (reads++ === 0 ? throwError(() => new Error('storage unavailable')) : of(stored)),
      set: (key: string, value: unknown) => (writes.push([key, value]), of(undefined)),
    } as unknown as StorageApi;
    const injector = Injector.create({
      providers: [
        { provide: STORAGE_API, useValue: storage },
        { provide: INSTANCE_ID, useValue: 'tab' },
      ],
    });
    const plans = runInInjectionContext(injector, () => new PlanService());
    expect(plans.loaded()).toBe(false);

    plans.add({ title: 'Gym', date: '2026-10-07' });

    expect(plans.loaded()).toBe(true);
    expect(plans.items().map((item) => item.title)).toEqual(['Dentist', 'Gym']);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toEqual([PLAN_KEY, { items: plans.items() }]);
  });
});
