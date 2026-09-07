# تحميل كسول لملف بيانات المخازن — خطة التنفيذ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `warehouses.generated.json` (340KB, 44% of the current ~776KB JS bundle) out of the eagerly-loaded main bundle and into a separately-fetched chunk, with zero change to any consumer's behavior or interface.

**Architecture:** Single-file change. `warehouseSource.ts`'s `getWarehouses()` already returns `Promise<Warehouse[]>` and is already consumed asynchronously (`getWarehouses().then(setWarehouses)` in `App.tsx`) — switching its internal JSON import from static to dynamic requires no ripple beyond that one file.

**Tech Stack:** Vite's native dynamic `import()` code-splitting for JSON assets (no new dependency).

## Global Constraints

- No consumer of `getWarehouses()` changes — same `Promise<Warehouse[]>` signature, same call sites.
- No new dependency.
- All 64 existing tests must keep passing unmodified.

---

## Task 1: Lazy-load warehouses.generated.json

**Files:**
- Modify: `src/data/warehouseSource.ts`

**Interfaces:**
- Produces: `getWarehouses(): Promise<Warehouse[]>` — same signature as before this change; consumed by `src/App.tsx` (unmodified).

- [ ] **Step 1: Read the current file to confirm its exact content before editing**

Run: view `src/data/warehouseSource.ts`. It currently reads:

```ts
import warehousesJson from './warehouses.generated.json';
import type { Warehouse } from '../types/warehouse';

const warehouses = warehousesJson as Warehouse[];

export async function getWarehouses(): Promise<Warehouse[]> {
  return warehouses;
}
```

- [ ] **Step 2: Replace the static import with a memoized dynamic import**

Replace the full file contents with:

```ts
import type { Warehouse } from '../types/warehouse';

let warehousesPromise: Promise<Warehouse[]> | null = null;

export async function getWarehouses(): Promise<Warehouse[]> {
  if (!warehousesPromise) {
    warehousesPromise = import('./warehouses.generated.json').then((mod) => mod.default as Warehouse[]);
  }
  return warehousesPromise;
}
```

The `warehousesPromise` cache means repeated calls to `getWarehouses()` (e.g. if multiple components called it) reuse the same in-flight or resolved fetch instead of re-importing.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all 18 test files / 64 tests pass, unchanged from before this edit. No test file needs modification — this is a purely internal implementation change behind an already-async, already-tested interface (`src/App.test.tsx` already exercises `getWarehouses()` indirectly by rendering `<App />` and awaiting data to appear).

- [ ] **Step 4: Build and confirm the bundle actually split**

Run: `npm run build`
Expected: the build output now lists at least two JS chunks under `dist/assets/` instead of one — one for the main app bundle (noticeably smaller than the previous ~776KB) and one whose size is close to 340KB (the warehouses data, likely named something like `warehouses.generated-<hash>.js`). If only one chunk still appears, the dynamic import didn't take effect — re-check Step 2's exact syntax (`import('./warehouses.generated.json')` must be a call expression, not a static `import` statement).

- [ ] **Step 5: Manual browser check**

Run: `npm run dev`, open the app, and verify:
- The stats toolbar still shows the correct totals (1,400 total warehouses) shortly after the page loads — a brief instant where the toolbar shows 0/blank before the warehouses chunk arrives is expected and fine, since `getWarehouses()` was already async before this change.
- Drilling down to a subdistrict still shows its warehouse pins, and clicking one still opens a working `WarehouseCard`.

- [ ] **Step 6: Commit**

```bash
git add src/data/warehouseSource.ts
git commit -m "perf: lazy-load warehouses.generated.json as a separate chunk"
```
