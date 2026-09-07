import type { Feature, MultiPolygon, Polygon } from 'geojson';

export interface GovernorateProps {
  id: string;
  name: string;
}

export interface DistrictProps {
  id: string;
  name: string;
  governorateId: string;
}

export interface SubdistrictProps {
  id: string;
  name: string;
  districtId: string;
  governorateId: string;
}

export type GovernorateFeature = Feature<Polygon | MultiPolygon, GovernorateProps>;
export type DistrictFeature = Feature<Polygon | MultiPolygon, DistrictProps>;
export type SubdistrictFeature = Feature<Polygon | MultiPolygon, SubdistrictProps>;
