import { geoMercator, geoPath, type GeoPath, type GeoProjection } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';

export interface FittedProjection {
  projection: GeoProjection;
  path: GeoPath<unknown, Feature<Geometry>>;
}

export function fitProjection(
  features: Feature<Geometry>[],
  width: number,
  height: number,
  padding = 24,
): FittedProjection {
  const collection: FeatureCollection = { type: 'FeatureCollection', features };
  const projection = geoMercator().fitExtent(
    [
      [padding, padding],
      [Math.max(width - padding, padding + 1), Math.max(height - padding, padding + 1)],
    ],
    collection,
  );
  const path = geoPath(projection);
  return { projection, path };
}
