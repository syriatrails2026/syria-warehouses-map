import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import { describe, expect, it } from 'vitest';
import { generateWarehouses, randomPointInPolygon, splitCountEvenly } from './generateWarehouses.mjs';

const SQUARE_FEATURE = {
  type: 'Feature',
  properties: { id: 'sq-1', districtId: 'd-1', governorateId: 'g-1' },
  geometry: {
    type: 'Polygon',
    coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
  },
};

const TWO_SUBDISTRICTS = [
  SQUARE_FEATURE,
  {
    type: 'Feature',
    properties: { id: 'sq-2', districtId: 'd-1', governorateId: 'g-1' },
    geometry: {
      type: 'Polygon',
      coordinates: [[[10, 10], [11, 10], [11, 11], [10, 11], [10, 10]]],
    },
  },
];

describe('splitCountEvenly', () => {
  it('splits evenly with no remainder', () => {
    expect(splitCountEvenly(10, 5)).toEqual([2, 2, 2, 2, 2]);
  });

  it('distributes the remainder to the first buckets', () => {
    expect(splitCountEvenly(11, 5)).toEqual([3, 2, 2, 2, 2]);
  });

  it('sums back to the total for an uneven split', () => {
    const buckets = splitCountEvenly(1400, 8);
    expect(buckets.reduce((a, b) => a + b, 0)).toBe(1400);
  });
});

describe('randomPointInPolygon', () => {
  it('always returns a point inside the given polygon', () => {
    for (let i = 0; i < 50; i += 1) {
      const { lng, lat } = randomPointInPolygon(SQUARE_FEATURE);
      expect(booleanPointInPolygon(point([lng, lat]), SQUARE_FEATURE)).toBe(true);
    }
  });
});

describe('generateWarehouses', () => {
  it('generates exactly the requested total', () => {
    const warehouses = generateWarehouses({ subdistricts: TWO_SUBDISTRICTS, total: 1400 });
    expect(warehouses).toHaveLength(1400);
  });

  it('assigns every warehouse a point inside its own subdistrict polygon', () => {
    const warehouses = generateWarehouses({ subdistricts: TWO_SUBDISTRICTS, total: 20 });
    for (const w of warehouses) {
      const feature = TWO_SUBDISTRICTS.find((f) => f.properties.id === w.subdistrictId);
      expect(booleanPointInPolygon(point([w.lng, w.lat]), feature)).toBe(true);
    }
  });

  it('produces unique ids', () => {
    const warehouses = generateWarehouses({ subdistricts: TWO_SUBDISTRICTS, total: 100 });
    const ids = new Set(warehouses.map((w) => w.id));
    expect(ids.size).toBe(100);
  });

  it('keeps area within the defined range', () => {
    const warehouses = generateWarehouses({ subdistricts: TWO_SUBDISTRICTS, total: 50 });
    for (const w of warehouses) {
      expect(w.areaM2).toBeGreaterThanOrEqual(300);
      expect(w.areaM2).toBeLessThanOrEqual(4000);
    }
  });

  it('carries the correct governorateId and districtId from the parent subdistrict', () => {
    const warehouses = generateWarehouses({ subdistricts: TWO_SUBDISTRICTS, total: 4 });
    for (const w of warehouses) {
      expect(w.governorateId).toBe('g-1');
      expect(w.districtId).toBe('d-1');
    }
  });
});
