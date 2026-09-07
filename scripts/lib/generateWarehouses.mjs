import bboxFn from '@turf/bbox';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

const MIN_AREA_M2 = 300;
const MAX_AREA_M2 = 4000;

export function splitCountEvenly(total, buckets) {
  if (buckets <= 0) {
    throw new Error('splitCountEvenly requires at least one bucket');
  }
  const base = Math.floor(total / buckets);
  const remainder = total % buckets;
  return Array.from({ length: buckets }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function randomPointInPolygon(feature, rng = Math.random, maxAttempts = 500) {
  const [minX, minY, maxX, maxY] = bboxFn(feature);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const lng = minX + rng() * (maxX - minX);
    const lat = minY + rng() * (maxY - minY);
    const candidate = point([lng, lat]);
    if (booleanPointInPolygon(candidate, feature)) {
      return { lng, lat };
    }
  }
  throw new Error(
    `Could not find a random point inside polygon "${feature.properties?.id ?? '(unknown)'}" after ${maxAttempts} attempts`,
  );
}

export function generateWarehouses({ subdistricts, total, rng = Math.random }) {
  if (subdistricts.length === 0) {
    throw new Error('generateWarehouses requires at least one subdistrict feature');
  }
  const counts = splitCountEvenly(total, subdistricts.length);
  const warehouses = [];
  let globalIndex = 0;

  subdistricts.forEach((subdistrict, subIndex) => {
    const count = counts[subIndex];
    for (let i = 0; i < count; i += 1) {
      globalIndex += 1;
      const { lng, lat } = randomPointInPolygon(subdistrict, rng);
      const areaM2 = Math.round(MIN_AREA_M2 + rng() * (MAX_AREA_M2 - MIN_AREA_M2));
      warehouses.push({
        id: `wh-${globalIndex}`,
        name: `مخزن ${subdistrict.properties.id}-${i + 1}`,
        governorateId: subdistrict.properties.governorateId,
        districtId: subdistrict.properties.districtId,
        subdistrictId: subdistrict.properties.id,
        lat,
        lng,
        areaM2,
      });
    }
  });

  return warehouses;
}
