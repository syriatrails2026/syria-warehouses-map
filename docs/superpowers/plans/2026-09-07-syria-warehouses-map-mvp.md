# خريطة مخازن سوريا التفاعلية — خطة التنفيذ (MVP)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public-facing React + Vite site that renders Syria's warehouses on a hierarchical, D3-rendered infographic map (governorate → district → subdistrict → warehouse pins), backed by mock data generated inside real GeoJSON polygon bounds.

**Architecture:** Pure-data modules (geo lookup, warehouse source, stats, navigation state) are built and unit-tested first, independent of React. UI components consume only those modules' exported functions/types — never raw JSON — so the data layer can be swapped for a real API later without touching components. The map itself is plain SVG driven by `d3-geo` (projection + path) with no tile layer.

**Tech Stack:** React 18 + TypeScript + Vite, `d3-geo`/`d3-scale` for map math, `@turf/*` (build-time only) for point-in-polygon mock data generation, Vitest + Testing Library for tests.

## Global Constraints

- Site is Arabic-only, `dir="rtl"` throughout. No i18n framework.
- No backend, no database, no auth. All data ships as static JSON at build time.
- Map rendering must use `d3-geo`/`d3-zoom` on raw SVG — do not introduce Leaflet, MapLibre, or any tile-based map library (rejected decision, see `docs/superpowers/specs/2026-09-07-syria-warehouses-map-design.md`).
- All warehouse reads go through `src/data/warehouseSource.ts`. No component or module outside `src/data/` may import `warehouses.generated.json` directly.
- A governorate/district/subdistrict with 0 warehouses is still rendered, filled with the neutral color `#e5e2d8`, labeled "0 مخازن" — never hidden.
- No marker clustering.
- Color tokens (exact hex, from the approved palette):
  `--color-green-dark:#0f2a1c; --color-green-mid:#1d4a30; --color-green-light:#2f6b46; --color-gold:#c8a84b; --color-sand:#dcc27a; --color-bg-warm:#f7f5ef; --color-bg-warm-alt:#faf9f6; --color-text:#1f2d24; --color-neutral:#e5e2d8;`
- Google Maps link format: `https://www.google.com/maps?q=${lat},${lng}`.
- Project display name lives in exactly one place (`src/config.ts`), value `"منصة مخازن سوريا"` — a descriptive placeholder, not a brand name.
- Total mock warehouses: exactly 1,400.
- The real 14-governorate GeoJSON files are **not yet available in this session**. Task 2 creates a small synthetic 2-governorate/4-district/8-subdistrict fixture set with the exact schema the real files must follow, placed at the real files' final paths (`src/data/geo/governorates.json`, `districts.json`, `subdistricts.json`). Swapping in the real files later is a data-only change — see the note at the end of Task 2.

---

## Task 1: Project Scaffold, Tooling, and Design Tokens

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx` (placeholder shell, replaced fully in Task 12)
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/test/setup.ts`
- Create: `.gitignore` entries (append, `.gitignore` already exists at repo root)

**Interfaces:**
- Produces: CSS custom properties on `:root` (`--color-green-dark`, `--color-green-mid`, `--color-green-light`, `--color-gold`, `--color-sand`, `--color-bg-warm`, `--color-bg-warm-alt`, `--color-text`, `--color-neutral`, `--font-body`) that every later component's CSS relies on.
- Produces: Vitest configured with jsdom + Testing Library, so every later task can write `*.test.ts`/`*.test.tsx` files without repeating config.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "syria-warehouses-map",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "generate:warehouses": "node scripts/generate-fake-warehouses.mjs"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "d3-geo": "^3.1.1",
    "d3-scale": "^4.0.2"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@turf/bbox": "^7.1.0",
    "@turf/boolean-point-in-polygon": "^7.1.0",
    "@turf/helpers": "^7.1.0",
    "@types/d3-geo": "^3.1.0",
    "@types/d3-scale": "^4.0.8",
    "@types/geojson": "^7946.0.14",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.4",
    "vite": "^5.4.2",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap"
      rel="stylesheet"
    />
    <title>منصة مخازن سوريا</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `src/styles/tokens.css`**

```css
:root {
  --color-green-dark: #0f2a1c;
  --color-green-mid: #1d4a30;
  --color-green-light: #2f6b46;
  --color-gold: #c8a84b;
  --color-sand: #dcc27a;
  --color-bg-warm: #f7f5ef;
  --color-bg-warm-alt: #faf9f6;
  --color-text: #1f2d24;
  --color-neutral: #e5e2d8;
  --font-body: 'Tajawal', 'Segoe UI', sans-serif;
}
```

- [ ] **Step 7: Create `src/styles/global.css`**

```css
@import './tokens.css';

* {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  height: 100%;
}

body {
  font-family: var(--font-body);
  background: var(--color-bg-warm);
  color: var(--color-text);
}

button {
  font-family: inherit;
  cursor: pointer;
}
```

- [ ] **Step 8: Create `src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 9: Create placeholder `src/App.tsx`** (fully rebuilt in Task 12)

```tsx
export default function App() {
  return <p>منصة مخازن سوريا — قيد الإنشاء</p>;
}
```

- [ ] **Step 10: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
```

- [ ] **Step 11: Install dependencies**

Run: `npm install`
Expected: installs without errors, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 12: Verify the dev server boots**

Run: `npm run dev` (then stop it with Ctrl+C once you see the local URL logged)
Expected: Vite prints a `Local: http://localhost:5173/` line with no errors.

- [ ] **Step 13: Verify the test runner works with zero tests**

Run: `npm test`
Expected: Vitest reports "No test files found" (or passes with 0 tests) — not an error. This confirms config is wired correctly before any test files exist.

- [ ] **Step 14: Commit**

```bash
git add package.json tsconfig.json tsconfig.node.json vite.config.ts index.html src/main.tsx src/App.tsx src/styles src/test package-lock.json
git commit -m "chore: scaffold Vite + React + TS project with RTL shell and design tokens"
```

---

## Task 2: Domain Types, GeoJSON Fixtures, and Geo Repository

**Files:**
- Create: `src/types/geo.ts`
- Create: `src/types/warehouse.ts`
- Create: `src/data/geo/governorates.json`
- Create: `src/data/geo/districts.json`
- Create: `src/data/geo/subdistricts.json`
- Create: `src/data/geo/README.md`
- Create: `src/data/geoRepository.ts`
- Test: `src/data/geoRepository.test.ts`

**Interfaces:**
- Produces: `GovernorateFeature`, `DistrictFeature`, `SubdistrictFeature` types; `Warehouse` type.
- Produces: `getGovernorates(): GovernorateFeature[]`, `getDistricts(governorateId: string): DistrictFeature[]`, `getSubdistricts(districtId: string): SubdistrictFeature[]`, `getSubdistrictById(id: string): SubdistrictFeature | undefined` — used by Task 4 (stats), Task 8 (MapCanvas), and Task 12 (App). (Task 3's generator script reads the raw GeoJSON files directly with `fs`, not through this module — see Task 3.)

- [ ] **Step 1: Create `src/types/geo.ts`**

```ts
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
```

- [ ] **Step 2: Create `src/types/warehouse.ts`**

```ts
export interface Warehouse {
  id: string;
  name: string;
  governorateId: string;
  districtId: string;
  subdistrictId: string;
  lat: number;
  lng: number;
  areaM2: number;
}
```

- [ ] **Step 3: Create `src/data/geo/governorates.json`**

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "id": "gov-a", "name": "محافظة تجريبية أ" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[36.0, 34.0], [37.0, 34.0], [37.0, 35.0], [36.0, 35.0], [36.0, 34.0]]]
      }
    },
    {
      "type": "Feature",
      "properties": { "id": "gov-b", "name": "محافظة تجريبية ب" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[37.0, 34.0], [38.0, 34.0], [38.0, 35.0], [37.0, 35.0], [37.0, 34.0]]]
      }
    }
  ]
}
```

- [ ] **Step 4: Create `src/data/geo/districts.json`**

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "id": "dist-a1", "name": "منطقة أ1", "governorateId": "gov-a" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[36.0, 34.0], [36.5, 34.0], [36.5, 35.0], [36.0, 35.0], [36.0, 34.0]]]
      }
    },
    {
      "type": "Feature",
      "properties": { "id": "dist-a2", "name": "منطقة أ2", "governorateId": "gov-a" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[36.5, 34.0], [37.0, 34.0], [37.0, 35.0], [36.5, 35.0], [36.5, 34.0]]]
      }
    },
    {
      "type": "Feature",
      "properties": { "id": "dist-b1", "name": "منطقة ب1", "governorateId": "gov-b" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[37.0, 34.0], [37.5, 34.0], [37.5, 35.0], [37.0, 35.0], [37.0, 34.0]]]
      }
    },
    {
      "type": "Feature",
      "properties": { "id": "dist-b2", "name": "منطقة ب2", "governorateId": "gov-b" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[37.5, 34.0], [38.0, 34.0], [38.0, 35.0], [37.5, 35.0], [37.5, 34.0]]]
      }
    }
  ]
}
```

- [ ] **Step 5: Create `src/data/geo/subdistricts.json`**

```json
{
  "type": "FeatureCollection",
  "features": [
    { "type": "Feature", "properties": { "id": "sub-a1a", "name": "ناحية أ1أ", "districtId": "dist-a1", "governorateId": "gov-a" }, "geometry": { "type": "Polygon", "coordinates": [[[36.0, 34.0], [36.5, 34.0], [36.5, 34.5], [36.0, 34.5], [36.0, 34.0]]] } },
    { "type": "Feature", "properties": { "id": "sub-a1b", "name": "ناحية أ1ب", "districtId": "dist-a1", "governorateId": "gov-a" }, "geometry": { "type": "Polygon", "coordinates": [[[36.0, 34.5], [36.5, 34.5], [36.5, 35.0], [36.0, 35.0], [36.0, 34.5]]] } },
    { "type": "Feature", "properties": { "id": "sub-a2a", "name": "ناحية أ2أ", "districtId": "dist-a2", "governorateId": "gov-a" }, "geometry": { "type": "Polygon", "coordinates": [[[36.5, 34.0], [37.0, 34.0], [37.0, 34.5], [36.5, 34.5], [36.5, 34.0]]] } },
    { "type": "Feature", "properties": { "id": "sub-a2b", "name": "ناحية أ2ب", "districtId": "dist-a2", "governorateId": "gov-a" }, "geometry": { "type": "Polygon", "coordinates": [[[36.5, 34.5], [37.0, 34.5], [37.0, 35.0], [36.5, 35.0], [36.5, 34.5]]] } },
    { "type": "Feature", "properties": { "id": "sub-b1a", "name": "ناحية ب1أ", "districtId": "dist-b1", "governorateId": "gov-b" }, "geometry": { "type": "Polygon", "coordinates": [[[37.0, 34.0], [37.5, 34.0], [37.5, 34.5], [37.0, 34.5], [37.0, 34.0]]] } },
    { "type": "Feature", "properties": { "id": "sub-b1b", "name": "ناحية ب1ب", "districtId": "dist-b1", "governorateId": "gov-b" }, "geometry": { "type": "Polygon", "coordinates": [[[37.0, 34.5], [37.5, 34.5], [37.5, 35.0], [37.0, 35.0], [37.0, 34.5]]] } },
    { "type": "Feature", "properties": { "id": "sub-b2a", "name": "ناحية ب2أ", "districtId": "dist-b2", "governorateId": "gov-b" }, "geometry": { "type": "Polygon", "coordinates": [[[37.5, 34.0], [38.0, 34.0], [38.0, 34.5], [37.5, 34.5], [37.5, 34.0]]] } },
    { "type": "Feature", "properties": { "id": "sub-b2b", "name": "ناحية ب2ب", "districtId": "dist-b2", "governorateId": "gov-b" }, "geometry": { "type": "Polygon", "coordinates": [[[37.5, 34.5], [38.0, 34.5], [38.0, 35.0], [37.5, 35.0], [37.5, 34.5]]] } }
  ]
}
```

- [ ] **Step 6: Create `src/data/geo/README.md`**

```markdown
# ملفات GeoJSON

هذه نسخة **مؤقتة/تجريبية** بمحافظتين ومناطق ونواحٍ افتراضية (لبناء واختبار البنية الكاملة). عند استلام ملفات GeoJSON الحقيقية لمحافظات سوريا الـ14، استبدل هذه الملفات الثلاثة بنفس الأسماء تماماً، مع الحفاظ على نفس البنية:

- `governorates.json`: `FeatureCollection`، كل `Feature.properties` يحوي `{ id, name }`.
- `districts.json`: كل `Feature.properties` يحوي `{ id, name, governorateId }` (يشير إلى `id` محافظة أب).
- `subdistricts.json`: كل `Feature.properties` يحوي `{ id, name, districtId, governorateId }`.

لا حاجة لتعديل أي كود عند الاستبدال — `geoRepository.ts` والمولّد (`scripts/generate-fake-warehouses.mjs`) يقرآن هذه الملفات ديناميكياً بغض النظر عن عدد المعالم (features) بداخلها.
```

- [ ] **Step 7: Create `src/data/geoRepository.ts`**

```ts
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
```

- [ ] **Step 8: Write `src/data/geoRepository.test.ts`**

```ts
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
```

- [ ] **Step 9: Run the tests**

Run: `npm test -- src/data/geoRepository.test.ts`
Expected: 5 tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/types src/data/geo src/data/geoRepository.ts src/data/geoRepository.test.ts
git commit -m "feat: add geo types, fixture GeoJSON, and geo repository"
```

---

## Task 3: Fake Warehouse Generator

**Files:**
- Create: `scripts/lib/generateWarehouses.mjs`
- Test: `scripts/lib/generateWarehouses.test.mjs`
- Create: `scripts/generate-fake-warehouses.mjs`

**Interfaces:**
- Consumes: subdistrict features shaped like `{ properties: { id, districtId, governorateId }, geometry, ... }` (matches `SubdistrictFeature` from Task 2, but this file is plain `.mjs` so it does not import TS types — it duck-types the same shape).
- Produces: `generateWarehouses({ subdistricts, total, rng? }): Warehouse[]` (plain object shape matching `src/types/warehouse.ts`'s `Warehouse`), consumed by Task 4's `warehouseSource.ts` via the generated JSON file it writes.
- Produces: `src/data/warehouses.generated.json` (array of 1,400 `Warehouse` objects) as a side effect of running `npm run generate:warehouses`.

- [ ] **Step 1: Write `scripts/lib/generateWarehouses.mjs`**

```js
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
```

- [ ] **Step 2: Write `scripts/lib/generateWarehouses.test.mjs`**

```js
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
```

- [ ] **Step 3: Run the tests**

Run: `npm test -- scripts/lib/generateWarehouses.test.mjs`
Expected: 9 tests pass.

- [ ] **Step 4: Write the CLI wrapper `scripts/generate-fake-warehouses.mjs`**

```js
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
```

- [ ] **Step 5: Run the generator**

Run: `npm run generate:warehouses`
Expected: prints `Generated 1400 warehouses across 8 subdistricts -> .../src/data/warehouses.generated.json`, and the file now exists.

- [ ] **Step 6: Commit**

```bash
git add scripts src/data/warehouses.generated.json
git commit -m "feat: generate mock warehouse data inside real subdistrict polygons"
```

---

## Task 4: Warehouse Data Source and Stats Utilities

**Files:**
- Create: `src/data/warehouseSource.ts`
- Create: `src/data/stats.ts`
- Test: `src/data/stats.test.ts`

**Interfaces:**
- Consumes: `Warehouse` type (Task 2), `warehouses.generated.json` (Task 3), `GovernorateFeature` type (Task 2).
- Produces: `getWarehouses(): Promise<Warehouse[]>` — the **only** sanctioned way for UI code to read warehouse data (per Global Constraints). Level-specific filtering (by governorate/district/subdistrict) is done in-memory by callers (see Task 8) since the full dataset is a small static array — no need for per-level fetch functions.
- Produces: `computeOverallStats(warehouses, governorates): OverallStats`, `countByGovernorate`, `countByDistrict`, `countBySubdistrict` — consumed by Task 8 (MapCanvas) and Task 10 (StatsToolbar).

- [ ] **Step 1: Write `src/data/warehouseSource.ts`**

```ts
import warehousesJson from './warehouses.generated.json';
import type { Warehouse } from '../types/warehouse';

const warehouses = warehousesJson as Warehouse[];

export async function getWarehouses(): Promise<Warehouse[]> {
  return warehouses;
}
```

- [ ] **Step 2: Write `src/data/stats.ts`**

```ts
import type { GovernorateFeature } from '../types/geo';
import type { Warehouse } from '../types/warehouse';

export interface OverallStats {
  totalWarehouses: number;
  totalAreaM2: number;
  averageAreaM2: number;
  topGovernorateId: string;
  topGovernorateName: string;
  topGovernorateCount: number;
}

function countBy(warehouses: Warehouse[], key: keyof Pick<Warehouse, 'governorateId' | 'districtId' | 'subdistrictId'>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const w of warehouses) {
    const id = w[key];
    result[id] = (result[id] ?? 0) + 1;
  }
  return result;
}

export function countByGovernorate(warehouses: Warehouse[]): Record<string, number> {
  return countBy(warehouses, 'governorateId');
}

export function countByDistrict(warehouses: Warehouse[]): Record<string, number> {
  return countBy(warehouses, 'districtId');
}

export function countBySubdistrict(warehouses: Warehouse[]): Record<string, number> {
  return countBy(warehouses, 'subdistrictId');
}

export function computeOverallStats(warehouses: Warehouse[], governorates: GovernorateFeature[]): OverallStats {
  const totalWarehouses = warehouses.length;
  const totalAreaM2 = warehouses.reduce((sum, w) => sum + w.areaM2, 0);
  const averageAreaM2 = totalWarehouses === 0 ? 0 : totalAreaM2 / totalWarehouses;

  const byGovernorate = countByGovernorate(warehouses);
  let topGovernorateId = '';
  let topGovernorateCount = -1;
  for (const [id, count] of Object.entries(byGovernorate)) {
    if (count > topGovernorateCount) {
      topGovernorateId = id;
      topGovernorateCount = count;
    }
  }
  const topGovernorateName =
    governorates.find((g) => g.properties.id === topGovernorateId)?.properties.name ?? '';

  return {
    totalWarehouses,
    totalAreaM2,
    averageAreaM2,
    topGovernorateId,
    topGovernorateName,
    topGovernorateCount: topGovernorateCount < 0 ? 0 : topGovernorateCount,
  };
}
```

- [ ] **Step 3: Write `src/data/stats.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import type { GovernorateFeature } from '../types/geo';
import type { Warehouse } from '../types/warehouse';
import { computeOverallStats, countByDistrict, countByGovernorate, countBySubdistrict } from './stats';

function makeWarehouse(overrides: Partial<Warehouse>): Warehouse {
  return {
    id: 'wh-1',
    name: 'مخزن',
    governorateId: 'gov-a',
    districtId: 'dist-a1',
    subdistrictId: 'sub-a1a',
    lat: 34.1,
    lng: 36.1,
    areaM2: 1000,
    ...overrides,
  };
}

const GOVERNORATES: GovernorateFeature[] = [
  { type: 'Feature', properties: { id: 'gov-a', name: 'محافظة تجريبية أ' }, geometry: { type: 'Polygon', coordinates: [] } },
  { type: 'Feature', properties: { id: 'gov-b', name: 'محافظة تجريبية ب' }, geometry: { type: 'Polygon', coordinates: [] } },
];

describe('countByGovernorate / countByDistrict / countBySubdistrict', () => {
  const warehouses = [
    makeWarehouse({ id: 'wh-1', governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a' }),
    makeWarehouse({ id: 'wh-2', governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a' }),
    makeWarehouse({ id: 'wh-3', governorateId: 'gov-b', districtId: 'dist-b1', subdistrictId: 'sub-b1a' }),
  ];

  it('counts warehouses per governorate', () => {
    expect(countByGovernorate(warehouses)).toEqual({ 'gov-a': 2, 'gov-b': 1 });
  });

  it('counts warehouses per district', () => {
    expect(countByDistrict(warehouses)).toEqual({ 'dist-a1': 2, 'dist-b1': 1 });
  });

  it('counts warehouses per subdistrict', () => {
    expect(countBySubdistrict(warehouses)).toEqual({ 'sub-a1a': 2, 'sub-b1a': 1 });
  });
});

describe('computeOverallStats', () => {
  it('computes totals, average, and the top governorate by count', () => {
    const warehouses = [
      makeWarehouse({ id: 'wh-1', governorateId: 'gov-a', areaM2: 1000 }),
      makeWarehouse({ id: 'wh-2', governorateId: 'gov-a', areaM2: 2000 }),
      makeWarehouse({ id: 'wh-3', governorateId: 'gov-b', areaM2: 3000 }),
    ];

    const stats = computeOverallStats(warehouses, GOVERNORATES);

    expect(stats.totalWarehouses).toBe(3);
    expect(stats.totalAreaM2).toBe(6000);
    expect(stats.averageAreaM2).toBeCloseTo(2000);
    expect(stats.topGovernorateId).toBe('gov-a');
    expect(stats.topGovernorateName).toBe('محافظة تجريبية أ');
    expect(stats.topGovernorateCount).toBe(2);
  });

  it('returns zeroed stats for an empty warehouse list', () => {
    const stats = computeOverallStats([], GOVERNORATES);
    expect(stats.totalWarehouses).toBe(0);
    expect(stats.totalAreaM2).toBe(0);
    expect(stats.averageAreaM2).toBe(0);
    expect(stats.topGovernorateCount).toBe(0);
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/data/stats.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/data/warehouseSource.ts src/data/stats.ts src/data/stats.test.ts
git commit -m "feat: add warehouse data source and stats aggregation utilities"
```

---

## Task 5: Navigation State (Selection, URL Sync, Breadcrumb)

**Files:**
- Create: `src/state/selection.ts`
- Test: `src/state/selection.test.ts`
- Create: `src/state/useSelection.ts`
- Test: `src/state/useSelection.test.ts`
- Create: `src/state/breadcrumb.ts`
- Test: `src/state/breadcrumb.test.ts`

**Interfaces:**
- Produces: `Selection` type (`{ governorateId?: string; districtId?: string; subdistrictId?: string }`), consumed by Task 8 (MapCanvas), Task 11 (Sidebar/Breadcrumb), Task 12 (App).
- Produces: `parseSelectionFromSearch`, `selectionToSearch` (pure), `useSelection(): [Selection, (next: Selection) => void]` (React hook), `buildBreadcrumb(selection, names): BreadcrumbItem[]`.

- [ ] **Step 1: Write `src/state/selection.ts`**

```ts
export interface Selection {
  governorateId?: string;
  districtId?: string;
  subdistrictId?: string;
}

export function parseSelectionFromSearch(search: string): Selection {
  const params = new URLSearchParams(search);
  const selection: Selection = {};
  const gov = params.get('gov');
  const district = params.get('district');
  const sub = params.get('sub');
  if (gov) selection.governorateId = gov;
  if (gov && district) selection.districtId = district;
  if (gov && district && sub) selection.subdistrictId = sub;
  return selection;
}

export function selectionToSearch(selection: Selection): string {
  const params = new URLSearchParams();
  if (selection.governorateId) params.set('gov', selection.governorateId);
  if (selection.governorateId && selection.districtId) params.set('district', selection.districtId);
  if (selection.governorateId && selection.districtId && selection.subdistrictId) {
    params.set('sub', selection.subdistrictId);
  }
  return params.toString();
}
```

- [ ] **Step 2: Write `src/state/selection.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { parseSelectionFromSearch, selectionToSearch } from './selection';

describe('parseSelectionFromSearch', () => {
  it('parses an empty search into an empty selection', () => {
    expect(parseSelectionFromSearch('')).toEqual({});
  });

  it('parses a full gov/district/sub path', () => {
    expect(parseSelectionFromSearch('?gov=gov-a&district=dist-a1&sub=sub-a1a')).toEqual({
      governorateId: 'gov-a',
      districtId: 'dist-a1',
      subdistrictId: 'sub-a1a',
    });
  });

  it('ignores a sub param if district is missing (malformed URL)', () => {
    expect(parseSelectionFromSearch('?gov=gov-a&sub=sub-a1a')).toEqual({ governorateId: 'gov-a' });
  });
});

describe('selectionToSearch', () => {
  it('produces an empty string for an empty selection', () => {
    expect(selectionToSearch({})).toBe('');
  });

  it('round-trips a full selection through parse/serialize', () => {
    const selection = { governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a' };
    const search = selectionToSearch(selection);
    expect(parseSelectionFromSearch(`?${search}`)).toEqual(selection);
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npm test -- src/state/selection.test.ts`
Expected: 5 tests pass.

- [ ] **Step 4: Write `src/state/useSelection.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import { parseSelectionFromSearch, selectionToSearch, type Selection } from './selection';

export function useSelection(): [Selection, (next: Selection) => void] {
  const [selection, setSelectionState] = useState<Selection>(() =>
    parseSelectionFromSearch(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => setSelectionState(parseSelectionFromSearch(window.location.search));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setSelection = useCallback((next: Selection) => {
    const search = selectionToSearch(next);
    const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
    window.history.pushState({}, '', url);
    setSelectionState(next);
  }, []);

  return [selection, setSelection];
}
```

- [ ] **Step 5: Write `src/state/useSelection.test.ts`**

```ts
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSelection } from './useSelection';

describe('useSelection', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('starts from the current URL search params', () => {
    window.history.pushState({}, '', '/?gov=gov-a');
    const { result } = renderHook(() => useSelection());
    expect(result.current[0]).toEqual({ governorateId: 'gov-a' });
  });

  it('updates the URL and state when setSelection is called', () => {
    const { result } = renderHook(() => useSelection());
    act(() => {
      result.current[1]({ governorateId: 'gov-a', districtId: 'dist-a1' });
    });
    expect(result.current[0]).toEqual({ governorateId: 'gov-a', districtId: 'dist-a1' });
    expect(window.location.search).toBe('?gov=gov-a&district=dist-a1');
  });

  it('responds to browser back/forward (popstate)', () => {
    const { result } = renderHook(() => useSelection());
    act(() => {
      result.current[1]({ governorateId: 'gov-a' });
    });
    act(() => {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current[0]).toEqual({});
  });
});
```

- [ ] **Step 6: Run the tests**

Run: `npm test -- src/state/useSelection.test.ts`
Expected: 3 tests pass.

- [ ] **Step 7: Write `src/state/breadcrumb.ts`**

```ts
import type { Selection } from './selection';

export interface BreadcrumbItem {
  label: string;
  selection: Selection;
}

export interface BreadcrumbNames {
  governorate?: string;
  district?: string;
  subdistrict?: string;
}

export function buildBreadcrumb(selection: Selection, names: BreadcrumbNames): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [];

  if (selection.governorateId && names.governorate) {
    items.push({ label: names.governorate, selection: { governorateId: selection.governorateId } });
  }
  if (selection.governorateId && selection.districtId && names.district) {
    items.push({
      label: names.district,
      selection: { governorateId: selection.governorateId, districtId: selection.districtId },
    });
  }
  if (selection.governorateId && selection.districtId && selection.subdistrictId && names.subdistrict) {
    items.push({ label: names.subdistrict, selection: { ...selection } });
  }

  return items;
}
```

- [ ] **Step 8: Write `src/state/breadcrumb.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { buildBreadcrumb } from './breadcrumb';

describe('buildBreadcrumb', () => {
  it('returns an empty list for an empty selection', () => {
    expect(buildBreadcrumb({}, {})).toEqual([]);
  });

  it('builds one item for a governorate-only selection', () => {
    const items = buildBreadcrumb({ governorateId: 'gov-a' }, { governorate: 'محافظة تجريبية أ' });
    expect(items).toEqual([{ label: 'محافظة تجريبية أ', selection: { governorateId: 'gov-a' } }]);
  });

  it('builds a full 3-level trail with correct partial selections at each step', () => {
    const selection = { governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a' };
    const items = buildBreadcrumb(selection, {
      governorate: 'محافظة تجريبية أ',
      district: 'منطقة أ1',
      subdistrict: 'ناحية أ1أ',
    });
    expect(items).toEqual([
      { label: 'محافظة تجريبية أ', selection: { governorateId: 'gov-a' } },
      { label: 'منطقة أ1', selection: { governorateId: 'gov-a', districtId: 'dist-a1' } },
      { label: 'ناحية أ1أ', selection: { governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a' } },
    ]);
  });
});
```

- [ ] **Step 9: Run the tests**

Run: `npm test -- src/state/breadcrumb.test.ts`
Expected: 3 tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/state
git commit -m "feat: add URL-synced navigation selection state and breadcrumb builder"
```

---

## Task 6: Map Projection, Color Scale, and ChoroplethLevel Component

**Files:**
- Create: `src/map/projection.ts`
- Test: `src/map/projection.test.ts`
- Create: `src/map/colorScale.ts`
- Test: `src/map/colorScale.test.ts`
- Create: `src/map/useElementSize.ts`
- Create: `src/components/MapCanvas/ChoroplethLevel.tsx`
- Create: `src/components/MapCanvas/ChoroplethLevel.css`
- Test: `src/components/MapCanvas/ChoroplethLevel.test.tsx`

**Interfaces:**
- Consumes: `GovernorateFeature`/`DistrictFeature`/`SubdistrictFeature` (Task 2).
- Produces: `fitProjection(features, width, height): { projection, path }`, `colorForCount(count, scale): string`, `makeCountColorScale(counts: number[])`, `useElementSize(): { ref, size: { width, height } }`, and the `<ChoroplethLevel />` component — `useElementSize` and `fitProjection` are also consumed by Task 7 (`WarehousePinsLevel`); `<ChoroplethLevel />` is consumed by Task 8 (MapCanvas).

- [ ] **Step 1: Write `src/map/projection.ts`**

```ts
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
```

- [ ] **Step 2: Write `src/map/projection.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { fitProjection } from './projection';

const SQUARE: GeoJSON.Feature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'Polygon', coordinates: [[[36, 34], [37, 34], [37, 35], [36, 35], [36, 34]]] },
};

describe('fitProjection', () => {
  it('produces a path generator that renders a non-empty "d" attribute for the feature', () => {
    const { path } = fitProjection([SQUARE], 600, 400);
    const d = path(SQUARE);
    expect(d).toBeTruthy();
    expect(d).toMatch(/^M/);
  });

  it('projects a coordinate from the feature into the given pixel bounds', () => {
    const { projection } = fitProjection([SQUARE], 600, 400);
    const projected = projection([36.5, 34.5]);
    expect(projected).not.toBeNull();
    const [x, y] = projected!;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(600);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(400);
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npm test -- src/map/projection.test.ts`
Expected: 2 tests pass.

- [ ] **Step 4: Write `src/map/colorScale.ts`**

```ts
import { scaleLinear, type ScaleLinear } from 'd3-scale';

export const NEUTRAL_FILL = '#e5e2d8';

export function makeCountColorScale(counts: number[]): ScaleLinear<string, string> {
  const max = Math.max(1, ...counts);
  return scaleLinear<string>().domain([0, max]).range(['#dcc27a', '#0f2a1c']);
}

export function colorForCount(count: number, scale: ScaleLinear<string, string>): string {
  if (count === 0) return NEUTRAL_FILL;
  return scale(count);
}
```

- [ ] **Step 5: Write `src/map/colorScale.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { colorForCount, makeCountColorScale, NEUTRAL_FILL } from './colorScale';

describe('colorForCount', () => {
  it('returns the neutral fill for a zero count', () => {
    const scale = makeCountColorScale([0, 5, 10]);
    expect(colorForCount(0, scale)).toBe(NEUTRAL_FILL);
  });

  it('returns a color from the scale for a positive count', () => {
    const scale = makeCountColorScale([0, 5, 10]);
    const color = colorForCount(5, scale);
    expect(color).not.toBe(NEUTRAL_FILL);
    expect(color).toMatch(/^#|^rgb/);
  });

  it('handles an all-zero counts array without throwing', () => {
    const scale = makeCountColorScale([0, 0, 0]);
    expect(() => colorForCount(0, scale)).not.toThrow();
  });
});
```

- [ ] **Step 6: Run the tests**

Run: `npm test -- src/map/colorScale.test.ts`
Expected: 3 tests pass.

- [ ] **Step 7: Write `src/map/useElementSize.ts`**

Shared by `ChoroplethLevel` (this task) and `WarehousePinsLevel` (Task 7) so the "measure my container and re-render on resize" logic exists in exactly one place.

```ts
import { useLayoutEffect, useRef, useState } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

const DEFAULT_SIZE: ElementSize = { width: 600, height: 400 };

export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<ElementSize>(DEFAULT_SIZE);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width || DEFAULT_SIZE.width,
          height: entry.contentRect.height || DEFAULT_SIZE.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}
```

- [ ] **Step 8: Write `src/map/useElementSize.test.ts`**

The jsdom `ResizeObserver` stub from `src/test/setup.ts` never fires a resize callback, so this test only verifies the hook's initial contract (a ref plus a sane default size) — actual resize behavior is exercised manually in Task 12's browser smoke test.

```ts
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useElementSize } from './useElementSize';

describe('useElementSize', () => {
  it('returns a ref and a default size before any element is measured', () => {
    const { result } = renderHook(() => useElementSize());
    expect(result.current.ref.current).toBeNull();
    expect(result.current.size).toEqual({ width: 600, height: 400 });
  });
});
```

- [ ] **Step 9: Run the test**

Run: `npm test -- src/map/useElementSize.test.ts`
Expected: 1 test passes.

- [ ] **Step 10: Write `src/components/MapCanvas/ChoroplethLevel.css`**

```css
.choropleth-level {
  width: 100%;
  height: 100%;
  min-height: 360px;
}

.choropleth-level__feature {
  cursor: pointer;
}

.choropleth-level__feature:hover path {
  opacity: 0.85;
}

.choropleth-level__label {
  fill: var(--color-bg-warm-alt);
  font-size: 12px;
  font-weight: 500;
  pointer-events: none;
  paint-order: stroke;
  stroke: var(--color-green-dark);
  stroke-width: 3px;
}
```

- [ ] **Step 11: Write `src/components/MapCanvas/ChoroplethLevel.tsx`**

```tsx
import type { Feature, Geometry } from 'geojson';
import { fitProjection } from '../../map/projection';
import { colorForCount, makeCountColorScale } from '../../map/colorScale';
import { useElementSize } from '../../map/useElementSize';
import './ChoroplethLevel.css';

interface FeatureWithIdName {
  id: string;
  name: string;
}

interface ChoroplethLevelProps<P extends FeatureWithIdName> {
  features: Feature<Geometry, P>[];
  countsById: Record<string, number>;
  onSelectFeature: (id: string) => void;
}

export function ChoroplethLevel<P extends FeatureWithIdName>({
  features,
  countsById,
  onSelectFeature,
}: ChoroplethLevelProps<P>) {
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();

  const { path } = fitProjection(features, size.width, size.height);
  const counts = features.map((f) => countsById[f.properties.id] ?? 0);
  const colorScale = makeCountColorScale(counts);

  return (
    <div className="choropleth-level" ref={containerRef} data-testid="choropleth-level">
      <svg width={size.width} height={size.height} role="img" aria-label="خريطة">
        {features.map((feature) => {
          const count = countsById[feature.properties.id] ?? 0;
          const centroid = path.centroid(feature);
          return (
            <g
              key={feature.properties.id}
              className="choropleth-level__feature"
              onClick={() => onSelectFeature(feature.properties.id)}
              data-testid={`feature-${feature.properties.id}`}
            >
              <path d={path(feature) ?? undefined} fill={colorForCount(count, colorScale)} stroke="#faf9f6" strokeWidth={2} />
              <text x={centroid[0]} y={centroid[1]} textAnchor="middle" className="choropleth-level__label">
                {feature.properties.name}
                <tspan x={centroid[0]} dy="1.2em">
                  {count} مخزن
                </tspan>
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
```

- [ ] **Step 12: Write `src/components/MapCanvas/ChoroplethLevel.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChoroplethLevel } from './ChoroplethLevel';

const FEATURES: GeoJSON.Feature<GeoJSON.Polygon, { id: string; name: string }>[] = [
  {
    type: 'Feature',
    properties: { id: 'gov-a', name: 'محافظة تجريبية أ' },
    geometry: { type: 'Polygon', coordinates: [[[36, 34], [37, 34], [37, 35], [36, 35], [36, 34]]] },
  },
  {
    type: 'Feature',
    properties: { id: 'gov-b', name: 'محافظة تجريبية ب' },
    geometry: { type: 'Polygon', coordinates: [[[37, 34], [38, 34], [38, 35], [37, 35], [37, 34]]] },
  },
];

describe('ChoroplethLevel', () => {
  it('renders one feature group per input feature with its name and count', () => {
    render(<ChoroplethLevel features={FEATURES} countsById={{ 'gov-a': 210, 'gov-b': 0 }} onSelectFeature={() => {}} />);
    expect(screen.getByText('محافظة تجريبية أ')).toBeInTheDocument();
    expect(screen.getByText('210 مخزن')).toBeInTheDocument();
    expect(screen.getByText('محافظة تجريبية ب')).toBeInTheDocument();
    expect(screen.getByText('0 مخزن')).toBeInTheDocument();
  });

  it('calls onSelectFeature with the feature id when clicked', () => {
    const onSelectFeature = vi.fn();
    render(<ChoroplethLevel features={FEATURES} countsById={{}} onSelectFeature={onSelectFeature} />);
    fireEvent.click(screen.getByTestId('feature-gov-a'));
    expect(onSelectFeature).toHaveBeenCalledWith('gov-a');
  });
});
```

- [ ] **Step 13: Run the tests**

Run: `npm test -- src/components/MapCanvas/ChoroplethLevel.test.tsx`
Expected: 2 tests pass.

- [ ] **Step 14: Commit**

```bash
git add src/map src/components/MapCanvas/ChoroplethLevel.tsx src/components/MapCanvas/ChoroplethLevel.css src/components/MapCanvas/ChoroplethLevel.test.tsx
git commit -m "feat: add map projection/color/size utilities and ChoroplethLevel component"
```

---

## Task 7: WarehousePinsLevel Component

**Files:**
- Create: `src/components/MapCanvas/WarehousePinsLevel.tsx`
- Create: `src/components/MapCanvas/WarehousePinsLevel.css`
- Test: `src/components/MapCanvas/WarehousePinsLevel.test.tsx`

**Interfaces:**
- Consumes: `SubdistrictFeature` (Task 2), `Warehouse` (Task 2), `fitProjection` and `useElementSize` (Task 6).
- Produces: `<WarehousePinsLevel subdistrict warehouses onSelectWarehouse />` — consumed by Task 8 (MapCanvas).

- [ ] **Step 1: Write `src/components/MapCanvas/WarehousePinsLevel.css`**

```css
.warehouse-pins-level {
  width: 100%;
  height: 100%;
  min-height: 360px;
}

.warehouse-pins-level__pin {
  cursor: pointer;
  fill: var(--color-gold);
  stroke: var(--color-green-dark);
  stroke-width: 1.5px;
}

.warehouse-pins-level__pin:hover {
  fill: var(--color-sand);
}
```

- [ ] **Step 2: Write `src/components/MapCanvas/WarehousePinsLevel.tsx`**

```tsx
import type { SubdistrictFeature } from '../../types/geo';
import type { Warehouse } from '../../types/warehouse';
import { fitProjection } from '../../map/projection';
import { useElementSize } from '../../map/useElementSize';
import './WarehousePinsLevel.css';

interface WarehousePinsLevelProps {
  subdistrict: SubdistrictFeature;
  warehouses: Warehouse[];
  onSelectWarehouse: (warehouse: Warehouse) => void;
}

export function WarehousePinsLevel({ subdistrict, warehouses, onSelectWarehouse }: WarehousePinsLevelProps) {
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();

  const { projection, path } = fitProjection([subdistrict], size.width, size.height);

  return (
    <div className="warehouse-pins-level" ref={containerRef} data-testid="warehouse-pins-level">
      <svg width={size.width} height={size.height} role="img" aria-label={subdistrict.properties.name}>
        <path d={path(subdistrict) ?? undefined} fill="#e5e2d8" stroke="#1d4a30" strokeWidth={2} />
        {warehouses.map((warehouse) => {
          const coords = projection([warehouse.lng, warehouse.lat]);
          if (!coords) return null;
          const [cx, cy] = coords;
          return (
            <circle
              key={warehouse.id}
              className="warehouse-pins-level__pin"
              cx={cx}
              cy={cy}
              r={6}
              data-testid={`pin-${warehouse.id}`}
              onClick={() => onSelectWarehouse(warehouse)}
            />
          );
        })}
      </svg>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/MapCanvas/WarehousePinsLevel.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SubdistrictFeature } from '../../types/geo';
import type { Warehouse } from '../../types/warehouse';
import { WarehousePinsLevel } from './WarehousePinsLevel';

const SUBDISTRICT: SubdistrictFeature = {
  type: 'Feature',
  properties: { id: 'sub-a1a', name: 'ناحية أ1أ', districtId: 'dist-a1', governorateId: 'gov-a' },
  geometry: { type: 'Polygon', coordinates: [[[36, 34], [36.5, 34], [36.5, 34.5], [36, 34.5], [36, 34]]] },
};

const WAREHOUSES: Warehouse[] = [
  { id: 'wh-1', name: 'مخزن 1', governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a', lat: 34.2, lng: 36.2, areaM2: 1200 },
  { id: 'wh-2', name: 'مخزن 2', governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a', lat: 34.3, lng: 36.3, areaM2: 800 },
];

describe('WarehousePinsLevel', () => {
  it('renders one pin per warehouse', () => {
    render(<WarehousePinsLevel subdistrict={SUBDISTRICT} warehouses={WAREHOUSES} onSelectWarehouse={() => {}} />);
    expect(screen.getByTestId('pin-wh-1')).toBeInTheDocument();
    expect(screen.getByTestId('pin-wh-2')).toBeInTheDocument();
  });

  it('calls onSelectWarehouse with the clicked warehouse', () => {
    const onSelectWarehouse = vi.fn();
    render(<WarehousePinsLevel subdistrict={SUBDISTRICT} warehouses={WAREHOUSES} onSelectWarehouse={onSelectWarehouse} />);
    fireEvent.click(screen.getByTestId('pin-wh-2'));
    expect(onSelectWarehouse).toHaveBeenCalledWith(WAREHOUSES[1]);
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/components/MapCanvas/WarehousePinsLevel.test.tsx`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/MapCanvas/WarehousePinsLevel.tsx src/components/MapCanvas/WarehousePinsLevel.css src/components/MapCanvas/WarehousePinsLevel.test.tsx
git commit -m "feat: add WarehousePinsLevel component for the leaf map level"
```

---

## Task 8: MapCanvas Orchestrator

**Files:**
- Create: `src/components/MapCanvas/MapCanvas.tsx`
- Test: `src/components/MapCanvas/MapCanvas.test.tsx`

**Interfaces:**
- Consumes: `Selection` (Task 5), `getGovernorates`/`getDistricts`/`getSubdistricts`/`getSubdistrictById` (Task 2), `countByGovernorate`/`countByDistrict`/`countBySubdistrict` (Task 4), `<ChoroplethLevel />` (Task 6), `<WarehousePinsLevel />` (Task 7).
- Produces: `<MapCanvas selection warehouses onSelectionChange onSelectWarehouse />` — consumed by Task 12 (App).

- [ ] **Step 1: Write `src/components/MapCanvas/MapCanvas.tsx`**

```tsx
import { getDistricts, getGovernorates, getSubdistrictById, getSubdistricts } from '../../data/geoRepository';
import { countByDistrict, countByGovernorate, countBySubdistrict } from '../../data/stats';
import type { Selection } from '../../state/selection';
import type { Warehouse } from '../../types/warehouse';
import { ChoroplethLevel } from './ChoroplethLevel';
import { WarehousePinsLevel } from './WarehousePinsLevel';

interface MapCanvasProps {
  selection: Selection;
  warehouses: Warehouse[];
  onSelectionChange: (selection: Selection) => void;
  onSelectWarehouse: (warehouse: Warehouse) => void;
}

export function MapCanvas({ selection, warehouses, onSelectionChange, onSelectWarehouse }: MapCanvasProps) {
  if (selection.governorateId && selection.districtId && selection.subdistrictId) {
    const subdistrict = getSubdistrictById(selection.subdistrictId);
    if (!subdistrict) {
      return <p>لم يتم العثور على الناحية المطلوبة.</p>;
    }
    const subWarehouses = warehouses.filter((w) => w.subdistrictId === selection.subdistrictId);
    return <WarehousePinsLevel subdistrict={subdistrict} warehouses={subWarehouses} onSelectWarehouse={onSelectWarehouse} />;
  }

  if (selection.governorateId && selection.districtId) {
    const subdistricts = getSubdistricts(selection.districtId);
    const counts = countBySubdistrict(warehouses);
    return (
      <ChoroplethLevel
        features={subdistricts}
        countsById={counts}
        onSelectFeature={(subdistrictId) => onSelectionChange({ ...selection, subdistrictId })}
      />
    );
  }

  if (selection.governorateId) {
    const districts = getDistricts(selection.governorateId);
    const counts = countByDistrict(warehouses);
    return (
      <ChoroplethLevel
        features={districts}
        countsById={counts}
        onSelectFeature={(districtId) => onSelectionChange({ ...selection, districtId })}
      />
    );
  }

  const governorates = getGovernorates();
  const counts = countByGovernorate(warehouses);
  return (
    <ChoroplethLevel
      features={governorates}
      countsById={counts}
      onSelectFeature={(governorateId) => onSelectionChange({ governorateId })}
    />
  );
}
```

- [ ] **Step 2: Write `src/components/MapCanvas/MapCanvas.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Warehouse } from '../../types/warehouse';
import { MapCanvas } from './MapCanvas';

const WAREHOUSES: Warehouse[] = [
  { id: 'wh-1', name: 'مخزن 1', governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a', lat: 34.2, lng: 36.2, areaM2: 1200 },
  { id: 'wh-2', name: 'مخزن 2', governorateId: 'gov-b', districtId: 'dist-b1', subdistrictId: 'sub-b1a', lat: 34.2, lng: 37.2, areaM2: 900 },
];

describe('MapCanvas', () => {
  it('renders the national governorate level when selection is empty', () => {
    render(<MapCanvas selection={{}} warehouses={WAREHOUSES} onSelectionChange={() => {}} onSelectWarehouse={() => {}} />);
    expect(screen.getByText('محافظة تجريبية أ')).toBeInTheDocument();
    expect(screen.getByText('محافظة تجريبية ب')).toBeInTheDocument();
  });

  it('drills into districts when a governorate is selected', () => {
    render(
      <MapCanvas
        selection={{ governorateId: 'gov-a' }}
        warehouses={WAREHOUSES}
        onSelectionChange={() => {}}
        onSelectWarehouse={() => {}}
      />,
    );
    expect(screen.getByText('منطقة أ1')).toBeInTheDocument();
    expect(screen.getByText('منطقة أ2')).toBeInTheDocument();
  });

  it('calls onSelectionChange with the extended selection when a district is clicked', () => {
    const onSelectionChange = vi.fn();
    render(
      <MapCanvas
        selection={{ governorateId: 'gov-a' }}
        warehouses={WAREHOUSES}
        onSelectionChange={onSelectionChange}
        onSelectWarehouse={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('feature-dist-a1'));
    expect(onSelectionChange).toHaveBeenCalledWith({ governorateId: 'gov-a', districtId: 'dist-a1' });
  });

  it('renders warehouse pins at the subdistrict level', () => {
    render(
      <MapCanvas
        selection={{ governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a' }}
        warehouses={WAREHOUSES}
        onSelectionChange={() => {}}
        onSelectWarehouse={() => {}}
      />,
    );
    expect(screen.getByTestId('pin-wh-1')).toBeInTheDocument();
  });

  it('calls onSelectWarehouse when a pin is clicked', () => {
    const onSelectWarehouse = vi.fn();
    render(
      <MapCanvas
        selection={{ governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a' }}
        warehouses={WAREHOUSES}
        onSelectionChange={() => {}}
        onSelectWarehouse={onSelectWarehouse}
      />,
    );
    fireEvent.click(screen.getByTestId('pin-wh-1'));
    expect(onSelectWarehouse).toHaveBeenCalledWith(WAREHOUSES[0]);
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npm test -- src/components/MapCanvas/MapCanvas.test.tsx`
Expected: 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/MapCanvas/MapCanvas.tsx src/components/MapCanvas/MapCanvas.test.tsx
git commit -m "feat: add MapCanvas orchestrator wiring selection state to map levels"
```

---

## Task 9: WarehouseCard Component

**Files:**
- Create: `src/components/WarehouseCard/WarehouseCard.tsx`
- Create: `src/components/WarehouseCard/WarehouseCard.css`
- Test: `src/components/WarehouseCard/WarehouseCard.test.tsx`

**Interfaces:**
- Consumes: `Warehouse` (Task 2).
- Produces: `<WarehouseCard warehouse onClose />` — consumed by Task 12 (App).

- [ ] **Step 1: Write `src/components/WarehouseCard/WarehouseCard.css`**

```css
.warehouse-card {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-bg-warm-alt);
  border: 1px solid var(--color-sand);
  border-radius: 12px;
  padding: 16px 20px;
  min-width: 260px;
  box-shadow: 0 8px 24px rgba(15, 42, 28, 0.18);
}

.warehouse-card__close {
  position: absolute;
  top: 8px;
  left: 12px;
  background: none;
  border: none;
  font-size: 18px;
  color: var(--color-text);
}

.warehouse-card h3 {
  margin: 0 0 8px;
  color: var(--color-green-dark);
}

.warehouse-card__link {
  display: inline-block;
  margin-top: 10px;
  color: var(--color-green-mid);
  font-weight: 700;
}
```

- [ ] **Step 2: Write `src/components/WarehouseCard/WarehouseCard.tsx`**

```tsx
import type { Warehouse } from '../../types/warehouse';
import './WarehouseCard.css';

interface WarehouseCardProps {
  warehouse: Warehouse;
  onClose: () => void;
}

export function WarehouseCard({ warehouse, onClose }: WarehouseCardProps) {
  const mapsUrl = `https://www.google.com/maps?q=${warehouse.lat},${warehouse.lng}`;

  return (
    <div className="warehouse-card" role="dialog" aria-label={warehouse.name}>
      <button className="warehouse-card__close" onClick={onClose} aria-label="إغلاق">
        ×
      </button>
      <h3>{warehouse.name}</h3>
      <p>المساحة: {warehouse.areaM2.toLocaleString('ar-SY')} م²</p>
      <a className="warehouse-card__link" href={mapsUrl} target="_blank" rel="noreferrer">
        فتح في خرائط جوجل
      </a>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/WarehouseCard/WarehouseCard.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Warehouse } from '../../types/warehouse';
import { WarehouseCard } from './WarehouseCard';

const WAREHOUSE: Warehouse = {
  id: 'wh-1',
  name: 'مخزن أ1أ-1',
  governorateId: 'gov-a',
  districtId: 'dist-a1',
  subdistrictId: 'sub-a1a',
  lat: 34.25,
  lng: 36.25,
  areaM2: 1500,
};

describe('WarehouseCard', () => {
  it('shows the warehouse name and area', () => {
    render(<WarehouseCard warehouse={WAREHOUSE} onClose={() => {}} />);
    expect(screen.getByText('مخزن أ1أ-1')).toBeInTheDocument();
    // areaM2.toLocaleString('ar-SY') renders Eastern Arabic-Indic digits (١٬٥٠٠), not "1,500"
    expect(screen.getByText(/١٬٥٠٠ م²/)).toBeInTheDocument();
  });

  it('builds a Google Maps link from the warehouse coordinates', () => {
    render(<WarehouseCard warehouse={WAREHOUSE} onClose={() => {}} />);
    const link = screen.getByRole('link', { name: 'فتح في خرائط جوجل' });
    expect(link).toHaveAttribute('href', 'https://www.google.com/maps?q=34.25,36.25');
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<WarehouseCard warehouse={WAREHOUSE} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/components/WarehouseCard/WarehouseCard.test.tsx`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/WarehouseCard
git commit -m "feat: add WarehouseCard popup with Google Maps link"
```

---

## Task 10: Header, StatsToolbar, and StatTile Components

**Files:**
- Create: `src/config.ts`
- Create: `src/components/Header/Header.tsx`
- Create: `src/components/Header/Header.css`
- Test: `src/components/Header/Header.test.tsx`
- Create: `src/components/StatsToolbar/StatTile.tsx`
- Create: `src/components/StatsToolbar/StatsToolbar.tsx`
- Create: `src/components/StatsToolbar/StatsToolbar.css`
- Test: `src/components/StatsToolbar/StatsToolbar.test.tsx`

**Interfaces:**
- Consumes: `OverallStats` (Task 4).
- Produces: `<Header />`, `<StatsToolbar stats contextualLabel contextualCount />` — consumed by Task 12 (App).

- [ ] **Step 1: Write `src/config.ts`**

```ts
// اسم عرض عام/وصفي — غيّره من هنا فقط، لا تكرره بأماكن أخرى بالكود
export const PROJECT_NAME = 'منصة مخازن سوريا';
```

- [ ] **Step 2: Write `src/components/Header/Header.css`**

```css
.app-header {
  background: var(--color-green-dark);
  color: var(--color-bg-warm-alt);
  padding: 14px 24px;
  border-bottom: 3px solid var(--color-gold);
}

.app-header__title {
  font-weight: 700;
  font-size: 16px;
}
```

- [ ] **Step 3: Write `src/components/Header/Header.tsx`**

```tsx
import { PROJECT_NAME } from '../../config';
import './Header.css';

export function Header() {
  return (
    <header className="app-header">
      <span className="app-header__title">{PROJECT_NAME}</span>
    </header>
  );
}
```

- [ ] **Step 4: Write `src/components/Header/Header.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PROJECT_NAME } from '../../config';
import { Header } from './Header';

describe('Header', () => {
  it('renders the configured project name', () => {
    render(<Header />);
    expect(screen.getByText(PROJECT_NAME)).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run the test**

Run: `npm test -- src/components/Header/Header.test.tsx`
Expected: 1 test passes.

- [ ] **Step 6: Write `src/components/StatsToolbar/StatsToolbar.css`**

```css
.stats-toolbar {
  display: flex;
  gap: 12px;
  padding: 10px 20px;
  background: var(--color-bg-warm-alt);
  border-bottom: 1px solid var(--color-sand);
  overflow-x: auto;
}

.stat-tile {
  flex: 1;
  min-width: 140px;
  text-align: center;
  background: #fff;
  border: 1px solid var(--color-sand);
  border-radius: 8px;
  padding: 8px 12px;
}

.stat-tile--accent {
  background: var(--color-gold);
  border-color: var(--color-gold);
}

.stat-tile__value {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-green-dark);
}

.stat-tile__label {
  font-size: 11px;
  color: var(--color-text);
}
```

- [ ] **Step 7: Write `src/components/StatsToolbar/StatTile.tsx`**

```tsx
interface StatTileProps {
  label: string;
  value: string;
  accent?: boolean;
}

export function StatTile({ label, value, accent }: StatTileProps) {
  return (
    <div className={accent ? 'stat-tile stat-tile--accent' : 'stat-tile'}>
      <div className="stat-tile__value">{value}</div>
      <div className="stat-tile__label">{label}</div>
    </div>
  );
}
```

- [ ] **Step 8: Write `src/components/StatsToolbar/StatsToolbar.tsx`**

```tsx
import type { OverallStats } from '../../data/stats';
import { StatTile } from './StatTile';
import './StatsToolbar.css';

interface StatsToolbarProps {
  stats: OverallStats;
  contextualLabel: string;
  contextualCount: number;
}

export function StatsToolbar({ stats, contextualLabel, contextualCount }: StatsToolbarProps) {
  return (
    <div className="stats-toolbar">
      <StatTile label="إجمالي المخازن" value={stats.totalWarehouses.toLocaleString('ar-SY')} />
      <StatTile label="إجمالي المساحة (م²)" value={stats.totalAreaM2.toLocaleString('ar-SY')} />
      <StatTile label="متوسط مساحة المخزن (م²)" value={Math.round(stats.averageAreaM2).toLocaleString('ar-SY')} />
      <StatTile label="أكبر محافظة" value={stats.topGovernorateName || '—'} />
      <StatTile label={contextualLabel} value={contextualCount.toLocaleString('ar-SY')} accent />
    </div>
  );
}
```

- [ ] **Step 9: Write `src/components/StatsToolbar/StatsToolbar.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { OverallStats } from '../../data/stats';
import { StatsToolbar } from './StatsToolbar';

const STATS: OverallStats = {
  totalWarehouses: 1400,
  totalAreaM2: 2100000,
  averageAreaM2: 1500,
  topGovernorateId: 'gov-a',
  topGovernorateName: 'محافظة تجريبية أ',
  topGovernorateCount: 700,
};

describe('StatsToolbar', () => {
  it('renders all five stat tiles with formatted values', () => {
    render(<StatsToolbar stats={STATS} contextualLabel="مخازن ضمن المحافظة الحالية" contextualCount={350} />);
    expect(screen.getByText('١٬٤٠٠')).toBeInTheDocument();
    expect(screen.getByText('٢٬١٠٠٬٠٠٠')).toBeInTheDocument();
    expect(screen.getByText('١٬٥٠٠')).toBeInTheDocument();
    expect(screen.getByText('محافظة تجريبية أ')).toBeInTheDocument();
    expect(screen.getByText('٣٥٠')).toBeInTheDocument();
    expect(screen.getByText('مخازن ضمن المحافظة الحالية')).toBeInTheDocument();
  });

  it('does not crash when the contextual count equals the national total (e.g. no drill-down yet)', () => {
    render(<StatsToolbar stats={STATS} contextualLabel="مخازن ضمن سوريا" contextualCount={1400} />);
    expect(screen.getAllByText('١٬٤٠٠')).toHaveLength(2);
    expect(screen.getByText('مخازن ضمن سوريا')).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Run the tests**

Run: `npm test -- src/components/StatsToolbar/StatsToolbar.test.tsx`
Expected: 2 tests pass. (Note: `toLocaleString('ar-SY')` renders Eastern Arabic-Indic digits — this is expected and correct for an Arabic-facing UI. The fixture originally used `contextualCount={1400}`, the same value as `totalWarehouses`, which made `getByText('١٬٤٠٠')` ambiguous — fixed by using a distinct value for the main assertion and adding a second test that explicitly covers the equal-values case with `getAllByText`.)

- [ ] **Step 11: Commit**

```bash
git add src/config.ts src/components/Header src/components/StatsToolbar
git commit -m "feat: add Header, StatsToolbar, and StatTile components"
```

---

## Task 11: Sidebar (Governorate List + Warehouse Search) and Breadcrumb Component

**Files:**
- Create: `src/components/Sidebar/Sidebar.tsx`
- Create: `src/components/Sidebar/Sidebar.css`
- Test: `src/components/Sidebar/Sidebar.test.tsx`
- Create: `src/components/Breadcrumb/Breadcrumb.tsx`
- Create: `src/components/Breadcrumb/Breadcrumb.css`
- Test: `src/components/Breadcrumb/Breadcrumb.test.tsx`

**Interfaces:**
- Consumes: `GovernorateFeature` (Task 2), `Warehouse` (Task 2), `BreadcrumbItem`/`Selection` (Task 5).
- Produces: `<Sidebar governorates countsById selectedGovernorateId onSelectGovernorate warehouses onSelectWarehouse />`, `<Breadcrumb items onNavigate />` — both consumed by Task 12 (App).

- [ ] **Step 1: Write `src/components/Sidebar/Sidebar.css`**

```css
.sidebar {
  width: 220px;
  background: #fff;
  border-left: 1px solid var(--color-sand);
  padding: 12px;
  overflow-y: auto;
}

.sidebar__search {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--color-sand);
  border-radius: 6px;
  margin-bottom: 10px;
  font-family: inherit;
}

.sidebar__empty {
  color: #888;
  font-size: 12px;
}

.sidebar__search-results {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  border-bottom: 1px solid var(--color-sand);
  padding-bottom: 10px;
}

.sidebar__search-results button {
  width: 100%;
  text-align: right;
  background: var(--color-bg-warm);
  border: none;
  border-radius: 6px;
  padding: 6px 8px;
  margin-bottom: 4px;
}

.sidebar__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.sidebar__item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  background: none;
  border: none;
  border-radius: 6px;
  padding: 6px 8px;
  margin-bottom: 4px;
  color: var(--color-text);
}

.sidebar__item--active {
  background: var(--color-bg-warm);
  color: var(--color-green-dark);
  font-weight: 700;
}
```

- [ ] **Step 2: Write `src/components/Sidebar/Sidebar.tsx`**

```tsx
import { useState } from 'react';
import type { GovernorateFeature } from '../../types/geo';
import type { Warehouse } from '../../types/warehouse';
import './Sidebar.css';

interface SidebarProps {
  governorates: GovernorateFeature[];
  countsById: Record<string, number>;
  selectedGovernorateId?: string;
  onSelectGovernorate: (governorateId: string) => void;
  warehouses: Warehouse[];
  onSelectWarehouse: (warehouse: Warehouse) => void;
}

const MAX_SEARCH_RESULTS = 8;

export function Sidebar({
  governorates,
  countsById,
  selectedGovernorateId,
  onSelectGovernorate,
  warehouses,
  onSelectWarehouse,
}: SidebarProps) {
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const matches = trimmed.length === 0 ? [] : warehouses.filter((w) => w.name.includes(trimmed)).slice(0, MAX_SEARCH_RESULTS);

  return (
    <aside className="sidebar">
      <input
        className="sidebar__search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ابحث عن مخزن بالاسم..."
        aria-label="ابحث عن مخزن بالاسم"
      />
      {trimmed.length > 0 && matches.length === 0 && <p className="sidebar__empty">لا توجد نتائج</p>}
      {matches.length > 0 && (
        <ul className="sidebar__search-results">
          {matches.map((w) => (
            <li key={w.id}>
              <button onClick={() => onSelectWarehouse(w)}>{w.name}</button>
            </li>
          ))}
        </ul>
      )}
      <ul className="sidebar__list">
        {governorates.map((g) => (
          <li key={g.properties.id}>
            <button
              className={g.properties.id === selectedGovernorateId ? 'sidebar__item sidebar__item--active' : 'sidebar__item'}
              onClick={() => onSelectGovernorate(g.properties.id)}
            >
              <span>{g.properties.name}</span>
              <span>{countsById[g.properties.id] ?? 0}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 3: Write `src/components/Sidebar/Sidebar.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GovernorateFeature } from '../../types/geo';
import type { Warehouse } from '../../types/warehouse';
import { Sidebar } from './Sidebar';

const GOVERNORATES: GovernorateFeature[] = [
  { type: 'Feature', properties: { id: 'gov-a', name: 'محافظة تجريبية أ' }, geometry: { type: 'Polygon', coordinates: [] } },
  { type: 'Feature', properties: { id: 'gov-b', name: 'محافظة تجريبية ب' }, geometry: { type: 'Polygon', coordinates: [] } },
];

const WAREHOUSES: Warehouse[] = [
  { id: 'wh-1', name: 'مخزن أ1أ-1', governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a', lat: 34.2, lng: 36.2, areaM2: 1200 },
];

describe('Sidebar', () => {
  it('lists all governorates with their counts', () => {
    render(
      <Sidebar
        governorates={GOVERNORATES}
        countsById={{ 'gov-a': 210, 'gov-b': 190 }}
        onSelectGovernorate={() => {}}
        warehouses={WAREHOUSES}
        onSelectWarehouse={() => {}}
      />,
    );
    expect(screen.getByText('محافظة تجريبية أ')).toBeInTheDocument();
    expect(screen.getByText('210')).toBeInTheDocument();
  });

  it('calls onSelectGovernorate when a governorate row is clicked', () => {
    const onSelectGovernorate = vi.fn();
    render(
      <Sidebar
        governorates={GOVERNORATES}
        countsById={{}}
        onSelectGovernorate={onSelectGovernorate}
        warehouses={WAREHOUSES}
        onSelectWarehouse={() => {}}
      />,
    );
    fireEvent.click(screen.getByText('محافظة تجريبية ب'));
    expect(onSelectGovernorate).toHaveBeenCalledWith('gov-b');
  });

  it('shows matching warehouses when typing in the search box, and calls onSelectWarehouse on click', () => {
    const onSelectWarehouse = vi.fn();
    render(
      <Sidebar
        governorates={GOVERNORATES}
        countsById={{}}
        onSelectGovernorate={() => {}}
        warehouses={WAREHOUSES}
        onSelectWarehouse={onSelectWarehouse}
      />,
    );
    fireEvent.change(screen.getByLabelText('ابحث عن مخزن بالاسم'), { target: { value: 'أ1أ' } });
    const result = screen.getByText('مخزن أ1أ-1');
    expect(result).toBeInTheDocument();
    fireEvent.click(result);
    expect(onSelectWarehouse).toHaveBeenCalledWith(WAREHOUSES[0]);
  });

  it('shows an empty state when the search has no matches', () => {
    render(
      <Sidebar
        governorates={GOVERNORATES}
        countsById={{}}
        onSelectGovernorate={() => {}}
        warehouses={WAREHOUSES}
        onSelectWarehouse={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText('ابحث عن مخزن بالاسم'), { target: { value: 'لا يوجد مخزن بهذا الاسم' } });
    expect(screen.getByText('لا توجد نتائج')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/components/Sidebar/Sidebar.test.tsx`
Expected: 4 tests pass.

- [ ] **Step 5: Write `src/components/Breadcrumb/Breadcrumb.css`**

```css
.breadcrumb {
  padding: 10px 20px;
  font-size: 13px;
  background: var(--color-bg-warm);
}

.breadcrumb button {
  background: none;
  border: none;
  color: var(--color-green-mid);
  font-weight: 700;
  padding: 0;
}

.breadcrumb__sep {
  margin: 0 6px;
  color: var(--color-text);
}
```

- [ ] **Step 6: Write `src/components/Breadcrumb/Breadcrumb.tsx`**

```tsx
import type { BreadcrumbItem } from '../../state/breadcrumb';
import type { Selection } from '../../state/selection';
import './Breadcrumb.css';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (selection: Selection) => void;
}

export function Breadcrumb({ items, onNavigate }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb" aria-label="مسار التنقل">
      <button onClick={() => onNavigate({})}>سوريا</button>
      {items.map((item) => (
        <span key={item.label}>
          <span className="breadcrumb__sep">‹</span>
          <button onClick={() => onNavigate(item.selection)}>{item.label}</button>
        </span>
      ))}
    </nav>
  );
}
```

- [ ] **Step 7: Write `src/components/Breadcrumb/Breadcrumb.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Breadcrumb } from './Breadcrumb';

describe('Breadcrumb', () => {
  it('always renders the "سوريا" root item', () => {
    render(<Breadcrumb items={[]} onNavigate={() => {}} />);
    expect(screen.getByText('سوريا')).toBeInTheDocument();
  });

  it('renders each breadcrumb item label', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'محافظة تجريبية أ', selection: { governorateId: 'gov-a' } },
          { label: 'منطقة أ1', selection: { governorateId: 'gov-a', districtId: 'dist-a1' } },
        ]}
        onNavigate={() => {}}
      />,
    );
    expect(screen.getByText('محافظة تجريبية أ')).toBeInTheDocument();
    expect(screen.getByText('منطقة أ1')).toBeInTheDocument();
  });

  it('calls onNavigate with the empty selection when the root is clicked', () => {
    const onNavigate = vi.fn();
    render(<Breadcrumb items={[{ label: 'محافظة تجريبية أ', selection: { governorateId: 'gov-a' } }]} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('سوريا'));
    expect(onNavigate).toHaveBeenCalledWith({});
  });

  it('calls onNavigate with that item selection when a breadcrumb item is clicked', () => {
    const onNavigate = vi.fn();
    const items = [{ label: 'محافظة تجريبية أ', selection: { governorateId: 'gov-a' } }];
    render(<Breadcrumb items={items} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('محافظة تجريبية أ'));
    expect(onNavigate).toHaveBeenCalledWith({ governorateId: 'gov-a' });
  });
});
```

- [ ] **Step 8: Run the tests**

Run: `npm test -- src/components/Breadcrumb/Breadcrumb.test.tsx`
Expected: 4 tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/components/Sidebar src/components/Breadcrumb
git commit -m "feat: add Sidebar (governorate list + warehouse search) and Breadcrumb"
```

---

## Task 12: App Integration and Layout

**Files:**
- Modify: `src/App.tsx` (replace placeholder from Task 1)
- Create: `src/App.css`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes every component and data/state module produced by Tasks 2–11.
- Produces: the assembled application — no further consumers within this plan.

- [ ] **Step 1: Write `src/App.css`**

```css
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-layout__body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.app-layout__map {
  flex: 1;
  min-width: 0;
  padding: 12px;
}

@media (max-width: 720px) {
  .app-layout__body {
    flex-direction: column;
  }
}
```

- [ ] **Step 2: Replace `src/App.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { Breadcrumb } from './components/Breadcrumb/Breadcrumb';
import { Header } from './components/Header/Header';
import { MapCanvas } from './components/MapCanvas/MapCanvas';
import { Sidebar } from './components/Sidebar/Sidebar';
import { StatsToolbar } from './components/StatsToolbar/StatsToolbar';
import { WarehouseCard } from './components/WarehouseCard/WarehouseCard';
import { getDistricts, getGovernorates, getSubdistrictById, getSubdistricts } from './data/geoRepository';
import { computeOverallStats, countByGovernorate } from './data/stats';
import { getWarehouses } from './data/warehouseSource';
import { buildBreadcrumb } from './state/breadcrumb';
import type { Selection } from './state/selection';
import { useSelection } from './state/useSelection';
import type { Warehouse } from './types/warehouse';

export default function App() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selection, setSelection] = useSelection();
  const [activeWarehouse, setActiveWarehouse] = useState<Warehouse | null>(null);

  useEffect(() => {
    getWarehouses().then(setWarehouses);
  }, []);

  const governorates = useMemo(() => getGovernorates(), []);
  const overallStats = useMemo(() => computeOverallStats(warehouses, governorates), [warehouses, governorates]);
  const governorateCounts = useMemo(() => countByGovernorate(warehouses), [warehouses]);

  const { contextualLabel, contextualCount } = useMemo(() => {
    if (selection.subdistrictId) {
      const sub = getSubdistrictById(selection.subdistrictId);
      const count = warehouses.filter((w) => w.subdistrictId === selection.subdistrictId).length;
      return { contextualLabel: `مخازن ${sub?.properties.name ?? ''}`, contextualCount: count };
    }
    if (selection.districtId) {
      const count = warehouses.filter((w) => w.districtId === selection.districtId).length;
      return { contextualLabel: 'مخازن ضمن المنطقة الحالية', contextualCount: count };
    }
    if (selection.governorateId) {
      const count = warehouses.filter((w) => w.governorateId === selection.governorateId).length;
      return { contextualLabel: 'مخازن ضمن المحافظة الحالية', contextualCount: count };
    }
    return { contextualLabel: 'مخازن ضمن سوريا', contextualCount: warehouses.length };
  }, [selection, warehouses]);

  const breadcrumbNames = useMemo(() => {
    const governorate = selection.governorateId
      ? governorates.find((g) => g.properties.id === selection.governorateId)?.properties.name
      : undefined;
    const district = selection.districtId
      ? getDistricts(selection.governorateId!).find((d) => d.properties.id === selection.districtId)?.properties.name
      : undefined;
    const subdistrict = selection.subdistrictId
      ? getSubdistricts(selection.districtId!).find((s) => s.properties.id === selection.subdistrictId)?.properties.name
      : undefined;
    return { governorate, district, subdistrict };
  }, [selection, governorates]);

  const breadcrumbItems = useMemo(() => buildBreadcrumb(selection, breadcrumbNames), [selection, breadcrumbNames]);

  function handleSelectionChange(next: Selection) {
    setActiveWarehouse(null);
    setSelection(next);
  }

  function handleSelectWarehouse(warehouse: Warehouse) {
    setSelection({
      governorateId: warehouse.governorateId,
      districtId: warehouse.districtId,
      subdistrictId: warehouse.subdistrictId,
    });
    setActiveWarehouse(warehouse);
  }

  return (
    <div className="app-layout">
      <Header />
      <StatsToolbar stats={overallStats} contextualLabel={contextualLabel} contextualCount={contextualCount} />
      <Breadcrumb items={breadcrumbItems} onNavigate={handleSelectionChange} />
      <div className="app-layout__body">
        <Sidebar
          governorates={governorates}
          countsById={governorateCounts}
          selectedGovernorateId={selection.governorateId}
          onSelectGovernorate={(governorateId) => handleSelectionChange({ governorateId })}
          warehouses={warehouses}
          onSelectWarehouse={handleSelectWarehouse}
        />
        <div className="app-layout__map">
          <MapCanvas
            selection={selection}
            warehouses={warehouses}
            onSelectionChange={handleSelectionChange}
            onSelectWarehouse={setActiveWarehouse}
          />
        </div>
      </div>
      {activeWarehouse && <WarehouseCard warehouse={activeWarehouse} onClose={() => setActiveWarehouse(null)} />}
    </div>
  );
}
```

- [ ] **Step 3: Write `src/App.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('renders the header, stats toolbar, and national map level on first load', async () => {
    render(<App />);
    expect(screen.getByText('منصة مخازن سوريا')).toBeInTheDocument();
    expect(await screen.findByText('محافظة تجريبية أ')).toBeInTheDocument();
    expect(screen.getByText('مخازن ضمن سوريا')).toBeInTheDocument();
  });

  it('drills into a governorate when its map region is clicked, and updates the breadcrumb', async () => {
    render(<App />);
    const featureGroup = await screen.findByTestId('feature-gov-a');
    fireEvent.click(featureGroup);
    expect(await screen.findByText('منطقة أ1')).toBeInTheDocument();
    expect(screen.getAllByText('محافظة تجريبية أ').length).toBeGreaterThan(0);
  });

  it('opens a warehouse card when a pin is clicked at the subdistrict level', async () => {
    window.history.pushState({}, '', '/?gov=gov-a&district=dist-a1&sub=sub-a1a');
    render(<App />);
    const pin = await screen.findByTestId(/^pin-/);
    fireEvent.click(pin);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'فتح في خرائط جوجل' })).toHaveAttribute('href', expect.stringContaining('https://www.google.com/maps?q='));
  });

  it('returns to the national level when the "سوريا" breadcrumb root is clicked', async () => {
    window.history.pushState({}, '', '/?gov=gov-a');
    render(<App />);
    await screen.findByText('منطقة أ1');
    fireEvent.click(screen.getByText('سوريا'));
    expect(await screen.findByText('محافظة تجريبية ب')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: every test file across the project passes (this task's 4 plus all prior tasks').

- [ ] **Step 5: Type-check and build**

Run: `npm run build`
Expected: `tsc -b` reports no type errors, and Vite produces a `dist/` bundle successfully.

- [ ] **Step 6: Manual smoke test in the browser**

Run: `npm run dev`, open the printed local URL, and verify by hand:
- Page renders right-to-left, Tajawal font is applied, header shows "منصة مخازن سوريا".
- Toolbar shows 5 stat tiles with correct totals (1,400 total warehouses).
- Clicking a governorate on the map drills into its districts; clicking a district drills into its subdistricts; clicking a subdistrict shows individual pins.
- Clicking a pin opens the warehouse card with a working "فتح في خرائط جوجل" link (opens Google Maps at the right coordinates in a new tab).
- The breadcrumb reflects the current level and each segment is clickable to jump back up.
- Clicking the sidebar governorate list navigates the map to match.
- Typing a warehouse name fragment into the sidebar search shows matching results; clicking one navigates the map to that warehouse's subdistrict and opens its card.
- Browser back button steps back up one map level at a time.
- Resize the window narrow (< 720px) and confirm the sidebar stacks below the map instead of overlapping it.

Fix any visual issues found (spacing, overflow, contrast) directly in the relevant component's `.css` file before proceeding — this step is expected to produce small follow-up edits.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.css src/App.test.tsx
git commit -m "feat: wire Header, StatsToolbar, Breadcrumb, Sidebar, MapCanvas, and WarehouseCard into App"
```

---

## After This Plan

- Replace the placeholder fixtures in `src/data/geo/` with the real 14-governorate GeoJSON files (same 3 filenames, same property schema — see `src/data/geo/README.md`), then re-run `npm run generate:warehouses`.
- Building the admin control panel (Excel upload) and a real API is a separate future project — it only needs to reimplement `src/data/warehouseSource.ts`'s `getWarehouses()` export (e.g. as an HTTP call instead of a static import); no other file in this plan should need to change.
