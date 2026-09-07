import type { Warehouse } from '../types/warehouse';

export function memoizeWithRetry<T>(load: () => Promise<T>): () => Promise<T> {
  let cached: Promise<T> | null = null;
  return () => {
    if (!cached) {
      cached = load().catch((error) => {
        cached = null;
        throw error;
      });
    }
    return cached;
  };
}

export const getWarehouses = memoizeWithRetry(() =>
  import('./warehouses.generated.json').then((mod) => mod.default as Warehouse[]),
);
