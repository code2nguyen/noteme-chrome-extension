import type { ToastOptions, ToastRegion } from '@c2n/components/toast';
import { describe, expect, it, vi } from 'vitest';
import { Toasts } from './toasts';

describe('Toasts', () => {
  it('shows a toast asked for before the region is drawn once it is, with its action', async () => {
    const toasts = new Toasts();
    // The region's code is read with the first toast.
    const load = vi.fn(async () => undefined);
    toasts.load = load;
    const onAction = vi.fn();
    toasts.show({ message: 'Pinned' }, onAction);
    const shown: ToastOptions[] = [];
    toasts.attach({ show: (options: ToastOptions) => (shown.push(options), 't1') } as unknown as ToastRegion);
    expect(shown).toEqual([]);
    await new Promise((resolve) => setTimeout(resolve));
    expect(load).toHaveBeenCalledOnce();
    expect(shown).toEqual([{ message: 'Pinned' }]);
    toasts.acted('t1');
    expect(onAction).toHaveBeenCalledOnce();
  });
});
