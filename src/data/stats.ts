import type { GovernorateFeature } from '../types/geo';
import type { Warehouse } from '../types/warehouse';

export interface OverallStats {
  totalWarehouses: number;
  totalAreaM2: number;
  averageAreaM2: number;
  topGovernorateId: string;
  topGovernorateName: string;
  topGovernorateCount: number;
}

function countBy(warehouses: Warehouse[], key: keyof Pick<Warehouse, 'governorateId' | 'districtId' | 'subdistrictId'>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const w of warehouses) {
    const id = w[key];
    result[id] = (result[id] ?? 0) + 1;
  }
  return result;
}

export function countByGovernorate(warehouses: Warehouse[]): Record<string, number> {
  return countBy(warehouses, 'governorateId');
}

export function countByDistrict(warehouses: Warehouse[]): Record<string, number> {
  return countBy(warehouses, 'districtId');
}

export function countBySubdistrict(warehouses: Warehouse[]): Record<string, number> {
  return countBy(warehouses, 'subdistrictId');
}

export function computeOverallStats(warehouses: Warehouse[], governorates: GovernorateFeature[]): OverallStats {
  const totalWarehouses = warehouses.length;
  const totalAreaM2 = warehouses.reduce((sum, w) => sum + w.areaM2, 0);
  const averageAreaM2 = totalWarehouses === 0 ? 0 : totalAreaM2 / totalWarehouses;

  const byGovernorate = countByGovernorate(warehouses);
  let topGovernorateId = '';
  let topGovernorateCount = -1;
  for (const [id, count] of Object.entries(byGovernorate)) {
    if (count > topGovernorateCount) {
      topGovernorateId = id;
      topGovernorateCount = count;
    }
  }
  const topGovernorateName =
    governorates.find((g) => g.properties.id === topGovernorateId)?.properties.name ?? '';

  return {
    totalWarehouses,
    totalAreaM2,
    averageAreaM2,
    topGovernorateId,
    topGovernorateName,
    topGovernorateCount: topGovernorateCount < 0 ? 0 : topGovernorateCount,
  };
}
