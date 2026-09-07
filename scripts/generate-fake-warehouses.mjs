import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWarehouses } from './lib/generateWarehouses.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const geoDir = join(__dirname, '../src/data/geo');
const outPath = join(__dirname, '../src/data/warehouses.generated.json');
const TOTAL_WAREHOUSES = 1400;

function loadFeatures(fileName) {
  const raw = readFileSync(join(geoDir, fileName), 'utf-8');
  return JSON.parse(raw).features;
}

const subdistricts = loadFeatures('subdistricts.json');
const warehouses = generateWarehouses({ subdistricts, total: TOTAL_WAREHOUSES });

writeFileSync(outPath, JSON.stringify(warehouses, null, 2) + '\n', 'utf-8');

console.log(`Generated ${warehouses.length} warehouses across ${subdistricts.length} subdistricts -> ${outPath}`);
