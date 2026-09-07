import { describe, expect, it, vi } from 'vitest';
import { memoizeWithRetry } from './warehouseSource';

describe('memoizeWithRetry', () => {
  it('caches a successful result and does not call load again', async () => {
    const load = vi.fn().mockResolvedValue('value');
    const memoized = memoizeWithRetry(load);

    await expect(memoized()).resolves.toBe('value');
    await expect(memoized()).resolves.toBe('value');

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not cache a rejection — a later call retries and can succeed', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce('value');
    const memoized = memoizeWithRetry(load);

    await expect(memoized()).rejects.toThrow('network error');
    await expect(memoized()).resolves.toBe('value');

    expect(load).toHaveBeenCalledTimes(2);
  });
});
