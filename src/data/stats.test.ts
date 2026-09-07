import { describe, expect, it } from 'vitest';
import type { GovernorateFeature } from '../types/geo';
import type { Warehouse } from '../types/warehouse';
import { computeOverallStats, countByDistrict, countByGovernorate, countBySubdistrict } from './stats';

function makeWarehouse(overrides: Partial<Warehouse>): Warehouse {
  return {
    id: 'wh-1',
    name: 'مخزن',
    governorateId: 'gov-a',
    districtId: 'dist-a1',
    subdistrictId: 'sub-a1a',
    lat: 34.1,
    lng: 36.1,
    areaM2: 1000,
    ...overrides,
  };
}

const GOVERNORATES: GovernorateFeature[] = [
  { type: 'Feature', properties: { id: 'gov-a', name: 'محافظة تجريبية أ' }, geometry: { type: 'Polygon', coordinates: [] } },
  { type: 'Feature', properties: { id: 'gov-b', name: 'محافظة تجريبية ب' }, geometry: { type: 'Polygon', coordinates: [] } },
];

describe('countByGovernorate / countByDistrict / countBySubdistrict', () => {
  const warehouses = [
    makeWarehouse({ id: 'wh-1', governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a' }),
    makeWarehouse({ id: 'wh-2', governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a' }),
    makeWarehouse({ id: 'wh-3', governorateId: 'gov-b', districtId: 'dist-b1', subdistrictId: 'sub-b1a' }),
  ];

  it('counts warehouses per governorate', () => {
    expect(countByGovernorate(warehouses)).toEqual({ 'gov-a': 2, 'gov-b': 1 });
  });

  it('counts warehouses per district', () => {
    expect(countByDistrict(warehouses)).toEqual({ 'dist-a1': 2, 'dist-b1': 1 });
  });

  it('counts warehouses per subdistrict', () => {
    expect(countBySubdistrict(warehouses)).toEqual({ 'sub-a1a': 2, 'sub-b1a': 1 });
  });
});

describe('computeOverallStats', () => {
  it('computes totals, average, and the top governorate by count', () => {
    const warehouses = [
      makeWarehouse({ id: 'wh-1', governorateId: 'gov-a', areaM2: 1000 }),
      makeWarehouse({ id: 'wh-2', governorateId: 'gov-a', areaM2: 2000 }),
      makeWarehouse({ id: 'wh-3', governorateId: 'gov-b', areaM2: 3000 }),
    ];

    const stats = computeOverallStats(warehouses, GOVERNORATES);

    expect(stats.totalWarehouses).toBe(3);
    expect(stats.totalAreaM2).toBe(6000);
    expect(stats.averageAreaM2).toBeCloseTo(2000);
    expect(stats.topGovernorateId).toBe('gov-a');
    expect(stats.topGovernorateName).toBe('محافظة تجريبية أ');
    expect(stats.topGovernorateCount).toBe(2);
  });

  it('returns zeroed stats for an empty warehouse list', () => {
    const stats = computeOverallStats([], GOVERNORATES);
    expect(stats.totalWarehouses).toBe(0);
    expect(stats.totalAreaM2).toBe(0);
    expect(stats.averageAreaM2).toBe(0);
    expect(stats.topGovernorateCount).toBe(0);
  });
});
