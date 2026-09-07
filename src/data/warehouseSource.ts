import type { Warehouse } from '../types/warehouse';

let warehousesPromise: Promise<Warehouse[]> | null = null;

export async function getWarehouses(): Promise<Warehouse[]> {
  if (!warehousesPromise) {
    warehousesPromise = import('./warehouses.generated.json').then((mod) => mod.default as Warehouse[]);
  }
  return warehousesPromise;
}
