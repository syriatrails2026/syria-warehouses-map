# لمسات بصرية/UX — خطة التنفيذ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add loading/error states for warehouse data (fixing a real retry bug found during design), a fade+scale transition between map drill-down levels, clearer hover/focus states, and larger mobile touch targets — the five items chosen from the UX-polish priority list, per [2026-09-07-ux-polish-pass-design.md](../specs/2026-09-07-ux-polish-pass-design.md).

**Architecture:** Five independent-ish tasks touching mostly-disjoint files. Task 1 (the retry bug fix) must land before Task 2 (loading/error UI), since Task 2's retry button only works correctly once Task 1's fix is in. Tasks 3-5 are fully independent of 1-2 and each other.

**Tech Stack:** No new dependency — CSS `@keyframes`/transitions for animation, React state for load status.

## Global Constraints

- No new external dependency for the transition animation — CSS only.
- Loading UI: a simple spinner + text, not a skeleton (decided via direct visual comparison).
- Level-transition style: fade + scale (250ms), not fade-only (decided via direct visual comparison).
- Reuse existing CSS custom properties (`--color-gold`, `--color-green-dark`, `--color-bg-warm`, `--color-sand`, etc.) — no new color values.
- All existing 64 tests must keep passing. Existing test assertions are never weakened to accommodate a change — if a change would break one, the component's public behavior for that assertion must be preserved.
- CSS-only changes (transitions, hover, focus, touch-target sizing) get no new automated test — jsdom doesn't apply real CSS layout/animation (documented precedent in `CLAUDE.md`) — verify those manually in the browser instead.

---

## Task 1: Fix the warehouse-fetch retry bug

**Files:**
- Modify: `src/data/warehouseSource.ts`
- Create: `src/data/warehouseSource.test.ts`

**Interfaces:**
- Produces: `getWarehouses(): Promise<Warehouse[]>` — same signature as before (no consumer changes). Also produces `memoizeWithRetry<T>(load: () => Promise<T>): () => Promise<T>`, a small internal utility, exported for direct unit testing.
- Consumed by: Task 2 (`App.tsx`'s retry button calls `getWarehouses()` again after a failure).

**Bug being fixed:** the current `warehouseSource.ts` (from the earlier lazy-loading perf change) caches whatever promise `import()` returns forever, including a *rejected* one. If the chunk fails to load once, every later call to `getWarehouses()` — including a user pressing "retry" — replays the same rejection and can never succeed again without a full page reload.

- [ ] **Step 1: Read the current file to confirm its exact content before editing**

Run: view `src/data/warehouseSource.ts`. It currently reads:

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

- [ ] **Step 2: Write the failing tests**

Create `src/data/warehouseSource.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { memoizeWithRetry } from './warehouseSource';

describe('memoizeWithRetry', () => {
  it('caches a successful result and does not call load again', async () => {
    const load = vi.fn().mockResolvedValue('value');
    const memoized = memoizeWithRetry(load);

    await expect(memoized()).resolves.toBe('value');
    await expect(memoized()).resolves.toBe('value');

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not cache a rejection — a later call retries and can succeed', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce('value');
    const memoized = memoizeWithRetry(load);

    await expect(memoized()).rejects.toThrow('network error');
    await expect(memoized()).resolves.toBe('value');

    expect(load).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- src/data/warehouseSource.test.ts`
Expected: FAIL — `memoizeWithRetry` is not exported from `./warehouseSource` yet.

- [ ] **Step 4: Implement the fix**

Replace the full contents of `src/data/warehouseSource.ts`:

```ts
import type { Warehouse } from '../types/warehouse';

export function memoizeWithRetry<T>(load: () => Promise<T>): () => Promise<T> {
  let cached: Promise<T> | null = null;
  return () => {
    if (!cached) {
      cached = load().catch((error) => {
        cached = null;
        throw error;
      });
    }
    return cached;
  };
}

export const getWarehouses = memoizeWithRetry(() =>
  import('./warehouses.generated.json').then((mod) => mod.default as Warehouse[]),
);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/data/warehouseSource.test.ts`
Expected: 2 tests pass.

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: all 66 tests pass (64 existing + 2 new) — `getWarehouses`'s exported type (`Promise<Warehouse[]>`, called as `getWarehouses()`) is unchanged, so `src/App.tsx` and `src/App.test.tsx` need no changes and should be unaffected.

- [ ] **Step 7: Commit**

```bash
git add src/data/warehouseSource.ts src/data/warehouseSource.test.ts
git commit -m "fix: don't permanently cache a rejected warehouse-data fetch"
```

---

## Task 2: Loading and error states for warehouse data

**Files:**
- Create: `src/components/DataState/LoadingIndicator.tsx`
- Create: `src/components/DataState/LoadingIndicator.css`
- Create: `src/components/DataState/ErrorState.tsx`
- Create: `src/components/DataState/ErrorState.css`
- Modify: `src/components/StatsToolbar/StatsToolbar.tsx`
- Modify: `src/components/StatsToolbar/StatsToolbar.test.tsx`
- Modify: `src/App.tsx`
- Create: `src/App.dataState.test.tsx`

**Interfaces:**
- Consumes: `getWarehouses()` from Task 1 (its retry behavior is what makes this task's "retry" button actually work).
- Produces: `<LoadingIndicator />` (no props), `<ErrorState onRetry={() => void} />` — both consumed only by `App.tsx`. `StatsToolbar` gains an optional `loading?: boolean` prop (default falsy — existing callers/tests unaffected).

- [ ] **Step 1: Write `src/components/DataState/LoadingIndicator.css`**

```css
.loading-indicator {
  height: 100%;
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #8a9180;
}

.loading-indicator__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--color-sand);
  border-top-color: var(--color-green-dark);
  border-radius: 50%;
  animation: loading-indicator-spin 0.9s linear infinite;
}

.loading-indicator__text {
  font-size: 12px;
  margin: 0;
}

@keyframes loading-indicator-spin {
  to {
    transform: rotate(360deg);
  }
}
```

- [ ] **Step 2: Write `src/components/DataState/LoadingIndicator.tsx`**

```tsx
import './LoadingIndicator.css';

export function LoadingIndicator() {
  return (
    <div className="loading-indicator" role="status">
      <div className="loading-indicator__spinner" aria-hidden="true" />
      <p className="loading-indicator__text">جارٍ تحميل بيانات المخازن...</p>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/DataState/ErrorState.css`**

```css
.error-state {
  height: 100%;
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
  padding: 20px;
}

.error-state__icon {
  font-size: 28px;
  margin-bottom: 4px;
}

.error-state__title {
  font-weight: 700;
  color: var(--color-green-dark);
  margin: 0;
}

.error-state__hint {
  font-size: 12px;
  color: #666;
  margin: 0 0 8px;
}

.error-state__retry {
  background: var(--color-green-dark);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 20px;
  font-size: 13px;
}
```

- [ ] **Step 4: Write `src/components/DataState/ErrorState.tsx`**

```tsx
import './ErrorState.css';

interface ErrorStateProps {
  onRetry: () => void;
}

export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <div className="error-state__icon" aria-hidden="true">
        ⚠️
      </div>
      <p className="error-state__title">تعذّر تحميل بيانات المخازن</p>
      <p className="error-state__hint">تحقق من اتصالك بالإنترنت</p>
      <button className="error-state__retry" onClick={onRetry}>
        إعادة المحاولة
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Modify `StatsToolbar` to accept an optional `loading` prop**

Replace the full contents of `src/components/StatsToolbar/StatsToolbar.tsx`:

```tsx
import type { OverallStats } from '../../data/stats';
import { StatTile } from './StatTile';
import './StatsToolbar.css';

interface StatsToolbarProps {
  stats: OverallStats;
  contextualLabel: string;
  contextualCount: number;
  loading?: boolean;
}

export function StatsToolbar({ stats, contextualLabel, contextualCount, loading }: StatsToolbarProps) {
  const display = (value: string) => (loading ? '···' : value);

  return (
    <div className="stats-toolbar">
      <StatTile label="إجمالي المخازن" value={display(stats.totalWarehouses.toLocaleString('ar-SY'))} />
      <StatTile label="إجمالي المساحة (م²)" value={display(stats.totalAreaM2.toLocaleString('ar-SY'))} />
      <StatTile label="متوسط مساحة المخزن (م²)" value={display(Math.round(stats.averageAreaM2).toLocaleString('ar-SY'))} />
      <StatTile label="أكبر محافظة" value={loading ? '···' : stats.topGovernorateName || '—'} />
      <StatTile label={contextualLabel} value={display(contextualCount.toLocaleString('ar-SY'))} accent />
    </div>
  );
}
```

- [ ] **Step 6: Add a loading-state test to `StatsToolbar.test.tsx`**

Open `src/components/StatsToolbar/StatsToolbar.test.tsx` and add this test inside the existing `describe('StatsToolbar', ...)` block, after the two existing tests:

```tsx
  it('shows placeholder dots instead of numbers when loading', () => {
    render(<StatsToolbar stats={STATS} contextualLabel="مخازن ضمن سوريا" contextualCount={1400} loading />);
    expect(screen.getAllByText('···')).toHaveLength(5);
    expect(screen.queryByText('١٬٤٠٠')).not.toBeInTheDocument();
    // Labels stay visible even while loading
    expect(screen.getByText('إجمالي المخازن')).toBeInTheDocument();
    expect(screen.getByText('مخازن ضمن سوريا')).toBeInTheDocument();
  });
```

- [ ] **Step 7: Run the StatsToolbar tests**

Run: `npm test -- src/components/StatsToolbar/StatsToolbar.test.tsx`
Expected: 3 tests pass (2 existing + 1 new).

- [ ] **Step 8: Wire loading/error state into `App.tsx`**

Replace the full contents of `src/App.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { Breadcrumb } from './components/Breadcrumb/Breadcrumb';
import { ErrorState } from './components/DataState/ErrorState';
import { LoadingIndicator } from './components/DataState/LoadingIndicator';
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

type WarehousesLoadState = 'loading' | 'error' | 'ready';

export default function App() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadState, setLoadState] = useState<WarehousesLoadState>('loading');
  const [selection, setSelection] = useSelection();
  const [activeWarehouse, setActiveWarehouse] = useState<Warehouse | null>(null);

  const loadWarehouses = useCallback(() => {
    setLoadState('loading');
    getWarehouses()
      .then((data) => {
        setWarehouses(data);
        setLoadState('ready');
      })
      .catch(() => {
        setLoadState('error');
      });
  }, []);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  useEffect(() => {
    if (
      activeWarehouse &&
      (activeWarehouse.governorateId !== selection.governorateId ||
        activeWarehouse.districtId !== selection.districtId ||
        activeWarehouse.subdistrictId !== selection.subdistrictId)
    ) {
      setActiveWarehouse(null);
    }
  }, [selection, activeWarehouse]);

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
      <StatsToolbar
        stats={overallStats}
        contextualLabel={contextualLabel}
        contextualCount={contextualCount}
        loading={loadState === 'loading'}
      />
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
          {loadState === 'loading' && <LoadingIndicator />}
          {loadState === 'error' && <ErrorState onRetry={loadWarehouses} />}
          {loadState === 'ready' && (
            <MapCanvas
              selection={selection}
              warehouses={warehouses}
              onSelectionChange={handleSelectionChange}
              onSelectWarehouse={setActiveWarehouse}
            />
          )}
        </div>
      </div>
      {activeWarehouse && <WarehouseCard warehouse={activeWarehouse} onClose={() => setActiveWarehouse(null)} />}
    </div>
  );
}
```

- [ ] **Step 9: Write `src/App.dataState.test.tsx`**

This is a separate file from `src/App.test.tsx` specifically so it can mock `./data/warehouseSource` (to control loading/failure timing) without affecting the existing real-data tests in `App.test.tsx` — `vi.mock` is file-scoped, so mocking the module here has no effect on the other test file.

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { getWarehouses } from './data/warehouseSource';
import type { Warehouse } from './types/warehouse';

vi.mock('./data/warehouseSource', () => ({
  getWarehouses: vi.fn(),
}));

describe('App data loading state', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    vi.mocked(getWarehouses).mockReset();
  });

  it('shows a loading indicator before warehouse data arrives, then hides it once ready', async () => {
    let resolveLoad: (value: Warehouse[]) => void = () => {};
    vi.mocked(getWarehouses).mockReturnValue(
      new Promise<Warehouse[]>((resolve) => {
        resolveLoad = resolve;
      }),
    );

    render(<App />);
    expect(screen.getByText('جارٍ تحميل بيانات المخازن...')).toBeInTheDocument();

    resolveLoad([]);
    await waitFor(() => expect(screen.queryByText('جارٍ تحميل بيانات المخازن...')).not.toBeInTheDocument());
  });

  it('shows an error state with a retry button when loading fails, and retry can succeed', async () => {
    vi.mocked(getWarehouses).mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce([]);

    render(<App />);
    expect(await screen.findByText('تعذّر تحميل بيانات المخازن')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    await waitFor(() => expect(screen.queryByText('تعذّر تحميل بيانات المخازن')).not.toBeInTheDocument());
    expect(getWarehouses).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 10: Run the new test file**

Run: `npm test -- src/App.dataState.test.tsx`
Expected: 2 tests pass.

- [ ] **Step 11: Run the full test suite**

Run: `npm test`
Expected: all 69 tests pass (64 baseline + 2 from Task 1 + 1 from Step 6 + 2 from Step 9 — verify the exact total printed matches "no failures"; the running total is informational, not a hard gate).

- [ ] **Step 12: Manual browser check**

Run: `npm run dev`. Since real data loads almost instantly locally, throttle the network in devtools (or briefly comment out the `.catch` fallback and force-reject to eyeball the error UI) to confirm:
- The spinner + "···" stats appear briefly on first load, then the real map and numbers replace them.
- Forcing a rejection (e.g., temporarily changing the import path to a nonexistent file) shows the error state, and clicking "إعادة المحاولة" after fixing it back recovers correctly.

Revert any temporary debugging change before committing.

- [ ] **Step 13: Commit**

```bash
git add src/components/DataState src/components/StatsToolbar/StatsToolbar.tsx src/components/StatsToolbar/StatsToolbar.test.tsx src/App.tsx src/App.dataState.test.tsx
git commit -m "feat: add loading and error states for warehouse data"
```

---

## Task 3: Fade+scale transition between map levels

**Files:**
- Create: `src/components/MapCanvas/MapCanvas.css`
- Modify: `src/components/MapCanvas/MapCanvas.tsx`

**Interfaces:**
- No change to `MapCanvas`'s props or exports — purely a rendering/CSS change internal to the component.

- [ ] **Step 1: Write `src/components/MapCanvas/MapCanvas.css`**

```css
.map-canvas__level {
  width: 100%;
  height: 100%;
  animation: map-canvas-level-enter 250ms ease;
}

@keyframes map-canvas-level-enter {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

- [ ] **Step 2: Modify `MapCanvas.tsx` to wrap its output in an animated, level-keyed container**

Replace the full contents of `src/components/MapCanvas/MapCanvas.tsx`:

```tsx
import { getDistricts, getGovernorates, getSubdistrictById, getSubdistricts } from '../../data/geoRepository';
import { countByDistrict, countByGovernorate, countBySubdistrict } from '../../data/stats';
import type { Selection } from '../../state/selection';
import type { Warehouse } from '../../types/warehouse';
import { ChoroplethLevel } from './ChoroplethLevel';
import { WarehousePinsLevel } from './WarehousePinsLevel';
import './MapCanvas.css';

interface MapCanvasProps {
  selection: Selection;
  warehouses: Warehouse[];
  onSelectionChange: (selection: Selection) => void;
  onSelectWarehouse: (warehouse: Warehouse) => void;
}

export function MapCanvas({ selection, warehouses, onSelectionChange, onSelectWarehouse }: MapCanvasProps) {
  const levelKey = `${selection.governorateId ?? ''}-${selection.districtId ?? ''}-${selection.subdistrictId ?? ''}`;

  let content: JSX.Element;

  if (selection.governorateId && selection.districtId && selection.subdistrictId) {
    const subdistrict = getSubdistrictById(selection.subdistrictId);
    if (!subdistrict) {
      content = <p>لم يتم العثور على الناحية المطلوبة.</p>;
    } else {
      const subWarehouses = warehouses.filter((w) => w.subdistrictId === selection.subdistrictId);
      content = <WarehousePinsLevel subdistrict={subdistrict} warehouses={subWarehouses} onSelectWarehouse={onSelectWarehouse} />;
    }
  } else if (selection.governorateId && selection.districtId) {
    const subdistricts = getSubdistricts(selection.districtId);
    const counts = countBySubdistrict(warehouses);
    content = (
      <ChoroplethLevel
        features={subdistricts}
        countsById={counts}
        onSelectFeature={(subdistrictId) => onSelectionChange({ ...selection, subdistrictId })}
      />
    );
  } else if (selection.governorateId) {
    const districts = getDistricts(selection.governorateId);
    const counts = countByDistrict(warehouses);
    content = (
      <ChoroplethLevel
        features={districts}
        countsById={counts}
        onSelectFeature={(districtId) => onSelectionChange({ ...selection, districtId })}
      />
    );
  } else {
    const governorates = getGovernorates();
    const counts = countByGovernorate(warehouses);
    content = (
      <ChoroplethLevel
        features={governorates}
        countsById={counts}
        onSelectFeature={(governorateId) => onSelectionChange({ governorateId })}
      />
    );
  }

  return (
    <div className="map-canvas__level" key={levelKey}>
      {content}
    </div>
  );
}
```

- [ ] **Step 3: Run the existing MapCanvas tests to confirm no regression**

Run: `npm test -- src/components/MapCanvas/MapCanvas.test.tsx`
Expected: all 5 existing tests still pass unmodified — the extra wrapper `<div>` doesn't affect `getByText`/`getByTestId` queries, which search the whole rendered tree regardless of wrapping elements.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all tests pass (same total as after Task 2 — this task adds no new tests, per the Global Constraints note that CSS/animation-only behavior isn't unit-tested).

- [ ] **Step 5: Manual browser check**

Run: `npm run dev`. Click through governorate → district → subdistrict → back via breadcrumb, and confirm each level change fades and scales in smoothly (~250ms) instead of snapping instantly.

- [ ] **Step 6: Commit**

```bash
git add src/components/MapCanvas/MapCanvas.tsx src/components/MapCanvas/MapCanvas.css
git commit -m "feat: add fade+scale transition between map drill-down levels"
```

---

## Task 4: Hover and focus states

**Files:**
- Modify: `src/components/Sidebar/Sidebar.css`
- Modify: `src/components/Breadcrumb/Breadcrumb.css`

**Interfaces:** None — pure CSS, no component code changes.

- [ ] **Step 1: Add hover and focus rules to `Sidebar.css`**

In `src/components/Sidebar/Sidebar.css`, add these rules (e.g., after the existing `.sidebar__item--active` rule):

```css
.sidebar__item:hover {
  background: var(--color-bg-warm);
}

.sidebar__search:focus {
  outline: 2px solid var(--color-gold);
  outline-offset: 1px;
  border-color: var(--color-gold);
}
```

- [ ] **Step 2: Add a hover rule to `Breadcrumb.css`**

In `src/components/Breadcrumb/Breadcrumb.css`, add this rule (e.g., after the existing `.breadcrumb button` rule):

```css
.breadcrumb button:hover {
  text-decoration: underline;
}
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all tests still pass (CSS-only change, no test impact expected).

- [ ] **Step 4: Manual browser check**

Run: `npm run dev`. Hover over sidebar governorate rows (background tints), hover over breadcrumb links (underline appears), and tab-focus into the sidebar search box (gold focus ring appears, replacing the browser's default outline).

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar/Sidebar.css src/components/Breadcrumb/Breadcrumb.css
git commit -m "style: add hover/focus states to sidebar, breadcrumb, and search"
```

---

## Task 5: Larger touch targets on mobile

**Files:**
- Modify: `src/components/MapCanvas/WarehousePinsLevel.tsx`
- Modify: `src/components/MapCanvas/WarehousePinsLevel.css`
- Modify: `src/components/WarehouseCard/WarehouseCard.css`

**Interfaces:** No change to any component's props. `WarehousePinsLevel`'s existing `data-testid={\`pin-${warehouse.id}\`}` moves from the `<circle>` onto a wrapping `<g>` that carries both the testid and the click handler — existing tests query by that testid and click it, and neither `getByTestId` nor `fireEvent.click` cares which tag carries the attribute/handler, so no test file needs to change.

- [ ] **Step 1: Add a touch-target style to `WarehousePinsLevel.css`**

In `src/components/MapCanvas/WarehousePinsLevel.css`, add:

```css
.warehouse-pins-level__touch-target {
  /* fill="transparent" alone is not hit-testable by default (SVG treats an
     explicitly transparent fill as unpainted) — this makes the larger
     invisible circle still receive clicks/taps. */
  pointer-events: all;
  cursor: pointer;
}
```

- [ ] **Step 2: Modify `WarehousePinsLevel.tsx` to render a larger invisible touch circle behind each visible pin**

Replace the full contents of `src/components/MapCanvas/WarehousePinsLevel.tsx`:

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
            <g
              key={warehouse.id}
              data-testid={`pin-${warehouse.id}`}
              onClick={() => onSelectWarehouse(warehouse)}
            >
              <circle className="warehouse-pins-level__touch-target" cx={cx} cy={cy} r={14} fill="transparent" />
              <circle className="warehouse-pins-level__pin" cx={cx} cy={cy} r={6} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
```

- [ ] **Step 3: Run the existing WarehousePinsLevel tests to confirm no regression**

Run: `npm test -- src/components/MapCanvas/WarehousePinsLevel.test.tsx`
Expected: both existing tests still pass unmodified.

- [ ] **Step 4: Run the MapCanvas and App tests too (they also exercise pins)**

Run: `npm test -- src/components/MapCanvas/MapCanvas.test.tsx src/App.test.tsx`
Expected: all pass unmodified (they query and click by the same `pin-<id>` testid, now on the `<g>` instead of the `<circle>`).

- [ ] **Step 5: Add a mobile media query to `WarehouseCard.css`**

In `src/components/WarehouseCard/WarehouseCard.css`, add:

```css
@media (max-width: 480px) {
  .warehouse-card {
    left: 0;
    right: 0;
    bottom: 0;
    transform: none;
    width: auto;
    min-width: 0;
    border-radius: 12px 12px 0 0;
  }
}
```

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: all tests pass (same total as after Task 4).

- [ ] **Step 7: Manual browser check**

Run: `npm run dev`, switch devtools to a mobile viewport (e.g., 375px wide):
- Drill into a subdistrict and confirm pins are comfortably tappable (the enlarged invisible touch circle should make near-misses still register).
- Click a pin and confirm the warehouse card now spans the full width, docked to the bottom of the screen, instead of a narrow floating box.
- Resize back to desktop width and confirm the card returns to its normal floating centered style.

- [ ] **Step 8: Commit**

```bash
git add src/components/MapCanvas/WarehousePinsLevel.tsx src/components/MapCanvas/WarehousePinsLevel.css src/components/WarehouseCard/WarehouseCard.css
git commit -m "feat: enlarge pin touch targets and make the warehouse card full-width on mobile"
```
