import warehousesJson from './warehouses.generated.json';
import type { Warehouse } from '../types/warehouse';

const warehouses = warehousesJson as Warehouse[];

export async function getWarehouses(): Promise<Warehouse[]> {
  return warehouses;
}
