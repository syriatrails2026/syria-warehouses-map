import rewind from '@turf/rewind';
import type { FeatureCollection } from 'geojson';
import governoratesGeo from './geo/governorates.json';
import districtsGeo from './geo/districts.json';
import subdistrictsGeo from './geo/subdistricts.json';
import type { DistrictFeature, GovernorateFeature, SubdistrictFeature } from '../types/geo';

/**
 * d3-geo's spherical bounds/area algorithms expect exterior rings wound
 * clockwise (lon=x, lat=y) — the opposite of the RFC 7946 GeoJSON convention
 * (counterclockwise) that most real-world GIS exports follow. Without this,
 * a correctly-authored GeoJSON file renders as "the whole sphere minus this
 * shape" once projected. Rewinding at load time makes this work regardless
 * of which convention the source file (fixture now, real data later) uses.
 */
function loadRewound<T>(collection: unknown): T {
  return rewind(collection as FeatureCollection, { reverse: true }) as T;
}

const governorates = loadRewound<FeatureCollection>(governoratesGeo).features as unknown as GovernorateFeature[];
const districts = loadRewound<FeatureCollection>(districtsGeo).features as unknown as DistrictFeature[];
const subdistricts = loadRewound<FeatureCollection>(subdistrictsGeo).features as unknown as SubdistrictFeature[];

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
