import { describe, expect, it } from 'vitest';
import { getDistricts, getGovernorates, getSubdistrictById, getSubdistricts } from './geoRepository';

// These assert against real values from the imported Syria admin-boundaries
// dataset (see scripts/import-real-geo.mjs) rather than synthetic fixture
// ids, since this module reads the actual src/data/geo/*.json files.
describe('geoRepository', () => {
  it('returns all 14 governorates', () => {
    const governorates = getGovernorates();
    expect(governorates).toHaveLength(14);
    expect(governorates.map((g) => g.properties.id)).toContain('SY02');
    expect(governorates.find((g) => g.properties.id === 'SY02')?.properties.name).toBe('حلب');
  });

  it('filters districts by governorateId', () => {
    const districts = getDistricts('SY02');
    expect(districts.length).toBeGreaterThan(0);
    expect(districts.every((d) => d.properties.governorateId === 'SY02')).toBe(true);
    expect(districts.find((d) => d.properties.id === 'SY0202')?.properties.name).toBe('الباب');
  });

  it('filters subdistricts by districtId', () => {
    const subdistricts = getSubdistricts('SY0202');
    expect(subdistricts.length).toBeGreaterThan(0);
    expect(subdistricts.every((s) => s.properties.districtId === 'SY0202')).toBe(true);
    expect(subdistricts.find((s) => s.properties.id === 'SY020206')?.properties.name).toBe('عريمة');
  });

  it('finds a subdistrict by id', () => {
    const found = getSubdistrictById('SY020206');
    expect(found?.properties.name).toBe('عريمة');
    expect(found?.properties.districtId).toBe('SY0202');
    expect(found?.properties.governorateId).toBe('SY02');
  });

  it('returns undefined for an unknown subdistrict id', () => {
    expect(getSubdistrictById('does-not-exist')).toBeUndefined();
  });
});
