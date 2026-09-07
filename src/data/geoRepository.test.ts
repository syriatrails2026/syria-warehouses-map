import { describe, expect, it } from 'vitest';
import { getDistricts, getGovernorates, getSubdistrictById, getSubdistricts } from './geoRepository';

describe('geoRepository', () => {
  it('returns all governorates', () => {
    const governorates = getGovernorates();
    expect(governorates.map((g) => g.properties.id).sort()).toEqual(['gov-a', 'gov-b']);
  });

  it('filters districts by governorateId', () => {
    const districts = getDistricts('gov-a');
    expect(districts.map((d) => d.properties.id).sort()).toEqual(['dist-a1', 'dist-a2']);
  });

  it('filters subdistricts by districtId', () => {
    const subdistricts = getSubdistricts('dist-b1');
    expect(subdistricts.map((s) => s.properties.id).sort()).toEqual(['sub-b1a', 'sub-b1b']);
  });

  it('finds a subdistrict by id', () => {
    const found = getSubdistrictById('sub-a2b');
    expect(found?.properties.name).toBe('ناحية أ2ب');
  });

  it('returns undefined for an unknown subdistrict id', () => {
    expect(getSubdistrictById('does-not-exist')).toBeUndefined();
  });
});
