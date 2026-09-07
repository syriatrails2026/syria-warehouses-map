import governoratesGeo from './geo/governorates.json';
import districtsGeo from './geo/districts.json';
import subdistrictsGeo from './geo/subdistricts.json';
import type { DistrictFeature, GovernorateFeature, SubdistrictFeature } from '../types/geo';

const governorates = governoratesGeo.features as unknown as GovernorateFeature[];
const districts = districtsGeo.features as unknown as DistrictFeature[];
const subdistricts = subdistrictsGeo.features as unknown as SubdistrictFeature[];

export function getGovernorates(): GovernorateFeature[] {
  return governorates;
}

export function getDistricts(governorateId: string): DistrictFeature[] {
  return districts.filter((f) => f.properties.governorateId === governorateId);
}

export function getSubdistricts(districtId: string): SubdistrictFeature[] {
  return subdistricts.filter((f) => f.properties.districtId === districtId);
}

export function getSubdistrictById(id: string): SubdistrictFeature | undefined {
  return subdistricts.find((f) => f.properties.id === id);
}
