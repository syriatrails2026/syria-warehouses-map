// One-time import: converts a combined OCHA-style admin-boundaries GeoJSON
// (one FeatureCollection mixing whole-country / whole-governorate /
// whole-district / subdistrict polygons, distinguished by which adm*_pcode
// fields are populated) into this project's 3-file schema:
//   src/data/geo/governorates.json, districts.json, subdistricts.json
//
// Usage: node scripts/import-real-geo.mjs <path-to-source.geojson>
//
// Source row shapes (by which pcode fields are present):
//   adm1_pcode set, adm2_pcode absent -> whole-governorate polygon
//   adm2_pcode set, adm3_pcode absent -> whole-district polygon
//   adm3_pcode set                    -> subdistrict polygon
// (A single adm0-only row for the whole country is ignored.)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import simplify from '@turf/simplify';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../src/data/geo');

// The source is survey-grade precision (tens of thousands of vertices per
// polygon) — far more detail than a few-hundred-pixel on-screen map needs,
// and it makes the unprocessed files ~18MB combined (bad for a bundled
// browser asset). Each level gets a tolerance suited to how closely it's
// ever viewed: governorates are only ever seen at national-overview scale,
// subdistricts are zoomed in tightly and need more shape fidelity kept.
const SIMPLIFY_TOLERANCE = {
  governorates: 0.01,
  districts: 0.005,
  subdistricts: 0.003,
};

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error('Usage: node scripts/import-real-geo.mjs <path-to-source.geojson>');
  process.exit(1);
}

const source = JSON.parse(readFileSync(sourcePath, 'utf-8'));

function toFeatureCollection(features) {
  return { type: 'FeatureCollection', features };
}

const governorateFeatures = source.features
  .filter((f) => f.properties.adm1_pcode && !f.properties.adm2_pcode)
  .map((f) => ({
    type: 'Feature',
    properties: {
      id: f.properties.adm1_pcode,
      name: f.properties.adm1_name1,
    },
    geometry: f.geometry,
  }));

const districtFeatures = source.features
  .filter((f) => f.properties.adm2_pcode && !f.properties.adm3_pcode)
  .map((f) => ({
    type: 'Feature',
    properties: {
      id: f.properties.adm2_pcode,
      name: f.properties.adm2_name1,
      governorateId: f.properties.adm1_pcode,
    },
    geometry: f.geometry,
  }));

const subdistrictFeatures = source.features
  .filter((f) => f.properties.adm3_pcode)
  .map((f) => ({
    type: 'Feature',
    properties: {
      id: f.properties.adm3_pcode,
      name: f.properties.adm3_name1,
      districtId: f.properties.adm2_pcode,
      governorateId: f.properties.adm1_pcode,
    },
    geometry: f.geometry,
  }));

// Referential integrity: every district must point at a real governorate,
// every subdistrict at a real district. A silent gap here would show up
// later as an empty map level with no error, so fail loudly now instead.
const governorateIds = new Set(governorateFeatures.map((f) => f.properties.id));
const districtIds = new Set(districtFeatures.map((f) => f.properties.id));

const orphanedDistricts = districtFeatures.filter((f) => !governorateIds.has(f.properties.governorateId));
const orphanedSubdistricts = subdistrictFeatures.filter((f) => !districtIds.has(f.properties.districtId));

if (orphanedDistricts.length > 0) {
  throw new Error(
    `${orphanedDistricts.length} district(s) reference a governorateId with no matching governorate: ${orphanedDistricts
      .map((f) => f.properties.id)
      .join(', ')}`,
  );
}
if (orphanedSubdistricts.length > 0) {
  throw new Error(
    `${orphanedSubdistricts.length} subdistrict(s) reference a districtId with no matching district: ${orphanedSubdistricts
      .map((f) => f.properties.id)
      .join(', ')}`,
  );
}

const governorateCollection = simplify(toFeatureCollection(governorateFeatures), {
  tolerance: SIMPLIFY_TOLERANCE.governorates,
  highQuality: true,
  mutate: true,
});
const districtCollection = simplify(toFeatureCollection(districtFeatures), {
  tolerance: SIMPLIFY_TOLERANCE.districts,
  highQuality: true,
  mutate: true,
});
const subdistrictCollection = simplify(toFeatureCollection(subdistrictFeatures), {
  tolerance: SIMPLIFY_TOLERANCE.subdistricts,
  highQuality: true,
  mutate: true,
});

// Compact (no pretty-printing) — this ships to the browser as-is via a
// static import, so formatting whitespace is pure waste.
writeFileSync(join(outDir, 'governorates.json'), JSON.stringify(governorateCollection), 'utf-8');
writeFileSync(join(outDir, 'districts.json'), JSON.stringify(districtCollection), 'utf-8');
writeFileSync(join(outDir, 'subdistricts.json'), JSON.stringify(subdistrictCollection), 'utf-8');

console.log(
  `Imported ${governorateFeatures.length} governorates, ${districtFeatures.length} districts, ${subdistrictFeatures.length} subdistricts -> ${outDir}`,
);
