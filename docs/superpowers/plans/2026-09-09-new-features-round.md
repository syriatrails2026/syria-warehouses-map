# ميزات جديدة ضمن النطاق — خطة التنفيذ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a choropleth color legend, an "about the project" modal reachable from the header, and a count-ranked visual comparison bar in the sidebar's governorate list — the three features chosen from the new-features priority list, per [2026-09-09-new-features-round-design.md](../specs/2026-09-09-new-features-round-design.md).

**Architecture:** Four tasks. Task 1 (legend) and Task 4 (sidebar ranking) are fully self-contained modifications to existing components. Task 2 (AboutModal) is a standalone new component; Task 3 wires it into `Header`/`App.tsx` and depends on Task 2 existing. Tasks 1 and 4 have no dependency on 2/3 or each other.

**Tech Stack:** No new dependency — plain React state and CSS, following the exact patterns already used by `WarehouseCard`/`activeWarehouse` (modal-via-boolean-state) and `StatTile` (small presentational subcomponents).

## Global Constraints

- No new external dependency.
- Reuse existing CSS custom properties (`--color-sand`, `--color-green-dark`, `--color-gold`, `--color-bg-warm-alt`, `--color-text`, `--color-text-muted`) — no new hardcoded hex color values. (`--color-text-muted` was added in the prior UX-polish round specifically to stop hardcoded muted-gray values from creeping back in — use it, don't reintroduce `#666`/`#888`-style ad hoc grays.)
- No routing library, no separate page/URL for "about" — a modal driven by local component state, matching the existing `WarehouseCard`/`activeWarehouse` pattern in `App.tsx`.
- The legend is rendered only by `ChoroplethLevel` (governorate/district/subdistrict choropleth views) — never by `WarehousePinsLevel` (the leaf pins view has no density coloring to explain).
- All existing 69 tests must keep passing. **One necessary exception, called out explicitly so it isn't mistaken for weakening a test:** `Header`'s existing test currently renders `<Header />` with no props; Task 3 makes `onOpenAbout` a required prop, so that existing test's render call must be updated to pass a stub (`onOpenAbout={() => {}}`) — this is a required call-site update for a new required prop, not a weakened assertion, and the test's actual assertion is untouched.
- CSS-only visual details (legend appearance, ranking-bar look) get no new automated test — verify those manually in the browser, per the project's documented precedent for CSS/layout changes.

---

## Task 1: Choropleth color legend

**Files:**
- Create: `src/components/MapCanvas/ChoroplethLegend.tsx`
- Create: `src/components/MapCanvas/ChoroplethLegend.css`
- Test: `src/components/MapCanvas/ChoroplethLegend.test.tsx`
- Modify: `src/components/MapCanvas/ChoroplethLevel.tsx`
- Modify: `src/components/MapCanvas/ChoroplethLevel.css`

**Interfaces:**
- Produces: `<ChoroplethLegend maxCount={number} />` — consumed only by `ChoroplethLevel` (this task).

- [ ] **Step 1: Write `src/components/MapCanvas/ChoroplethLegend.css`**

```css
.choropleth-legend {
  position: absolute;
  bottom: 14px;
  left: 14px;
  background: var(--color-bg-warm-alt);
  border: 1px solid var(--color-sand);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.choropleth-legend__title {
  margin-bottom: 4px;
  color: var(--color-text);
}

.choropleth-legend__bar {
  width: 120px;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--color-sand), var(--color-green-dark));
}

.choropleth-legend__scale {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
  color: var(--color-text-muted);
}
```

- [ ] **Step 2: Write `src/components/MapCanvas/ChoroplethLegend.tsx`**

```tsx
import './ChoroplethLegend.css';

interface ChoroplethLegendProps {
  maxCount: number;
}

export function ChoroplethLegend({ maxCount }: ChoroplethLegendProps) {
  return (
    <div className="choropleth-legend">
      <div className="choropleth-legend__title">عدد المخازن</div>
      <div className="choropleth-legend__bar" />
      <div className="choropleth-legend__scale">
        <span>{(0).toLocaleString('ar-SY')}</span>
        <span>{maxCount.toLocaleString('ar-SY')}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/MapCanvas/ChoroplethLegend.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChoroplethLegend } from './ChoroplethLegend';

describe('ChoroplethLegend', () => {
  it('renders the title and formatted min/max labels', () => {
    render(<ChoroplethLegend maxCount={210} />);
    expect(screen.getByText('عدد المخازن')).toBeInTheDocument();
    expect(screen.getByText('٠')).toBeInTheDocument();
    expect(screen.getByText('٢١٠')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/components/MapCanvas/ChoroplethLegend.test.tsx`
Expected: 1 test passes.

- [ ] **Step 5: Wire the legend into `ChoroplethLevel`, and give its container `position: relative`**

In `src/components/MapCanvas/ChoroplethLevel.css`, add `position: relative;` to the existing `.choropleth-level` rule so the legend's `position: absolute` anchors to the map area, not the page:

```css
.choropleth-level {
  width: 100%;
  height: 100%;
  min-height: 360px;
  position: relative;
}
```

(The rest of `ChoroplethLevel.css` — `.choropleth-level__feature`, `.choropleth-level__feature:hover path`, `.choropleth-level__label` — is unchanged.)

Replace the full contents of `src/components/MapCanvas/ChoroplethLevel.tsx`:

```tsx
import type { Feature, Geometry } from 'geojson';
import { fitProjection } from '../../map/projection';
import { colorForCount, makeCountColorScale } from '../../map/colorScale';
import { useElementSize } from '../../map/useElementSize';
import { ChoroplethLegend } from './ChoroplethLegend';
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
  const maxCount = Math.max(0, ...counts);

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
      <ChoroplethLegend maxCount={maxCount} />
    </div>
  );
}
```

- [ ] **Step 6: Run the existing ChoroplethLevel tests to confirm no regression**

Run: `npm test -- src/components/MapCanvas/ChoroplethLevel.test.tsx`
Expected: both existing tests still pass unmodified. (The legend's `"٠"`/max-count text is a different string than the existing `"{count} مخزن"` feature labels — no text collision.)

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: all 70 tests pass (69 baseline + 1 new).

- [ ] **Step 8: Commit**

```bash
git add src/components/MapCanvas/ChoroplethLegend.tsx src/components/MapCanvas/ChoroplethLegend.css src/components/MapCanvas/ChoroplethLegend.test.tsx src/components/MapCanvas/ChoroplethLevel.tsx src/components/MapCanvas/ChoroplethLevel.css
git commit -m "feat: add a color legend to the choropleth map levels"
```

---

## Task 2: "About the project" modal

**Files:**
- Create: `src/components/AboutModal/AboutModal.tsx`
- Create: `src/components/AboutModal/AboutModal.css`
- Test: `src/components/AboutModal/AboutModal.test.tsx`

**Interfaces:**
- Produces: `<AboutModal onClose={() => void} />` — consumed by `App.tsx` in Task 3.

- [ ] **Step 1: Write `src/components/AboutModal/AboutModal.css`**

```css
.about-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 42, 28, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}

.about-modal {
  position: relative;
  background: var(--color-bg-warm-alt);
  border-radius: 12px;
  padding: 24px;
  width: 380px;
  max-width: calc(100vw - 32px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
}

.about-modal__close {
  position: absolute;
  top: 12px;
  left: 12px;
  background: none;
  border: none;
  font-size: 18px;
  color: var(--color-text);
}

.about-modal__title {
  font-weight: 700;
  color: var(--color-green-dark);
  font-size: 15px;
  margin: 0 0 10px;
}

.about-modal__text {
  font-size: 12px;
  line-height: 1.8;
  color: var(--color-text);
  margin: 0 0 10px;
}

.about-modal__text:last-child {
  margin-bottom: 0;
}
```

- [ ] **Step 2: Write `src/components/AboutModal/AboutModal.tsx`**

```tsx
import './AboutModal.css';

interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="about-modal-backdrop" onClick={onClose}>
      <div className="about-modal" role="dialog" aria-label="عن المشروع" onClick={(event) => event.stopPropagation()}>
        <button className="about-modal__close" onClick={onClose} aria-label="إغلاق">
          ×
        </button>
        <h2 className="about-modal__title">عن المشروع</h2>
        <p className="about-modal__text">
          منصّة عرض تفاعلية تُظهر توزّع 1,400 مخزن تابع لوزارة التجارة الداخلية على امتداد محافظات سوريا الأربع عشرة، بحدود
          جغرافية حقيقية وتصنيف هرمي دقيق (محافظة ← منطقة ← ناحية).
        </p>
        <p className="about-modal__text">
          الهدف من المنصّة تقديم صورة واضحة وقابلة للاستكشاف لحجم وتوزّع البنية التخزينية القائمة، تمهيداً للشراكة والاستثمار
          في تطويرها.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/AboutModal/AboutModal.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AboutModal } from './AboutModal';

describe('AboutModal', () => {
  it('renders the title and description text', () => {
    render(<AboutModal onClose={() => {}} />);
    expect(screen.getByText('عن المشروع')).toBeInTheDocument();
    expect(screen.getByText(/1,400 مخزن/)).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<AboutModal onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the backdrop is clicked, but not when the dialog content is clicked', () => {
    const onClose = vi.fn();
    render(<AboutModal onClose={onClose} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/components/AboutModal/AboutModal.test.tsx`
Expected: 3 tests pass.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all 73 tests pass (70 from Task 1 + 3 new here).

- [ ] **Step 6: Commit**

```bash
git add src/components/AboutModal
git commit -m "feat: add the AboutModal component"
```

---

## Task 3: Wire the "about" link into Header and App

**Files:**
- Modify: `src/components/Header/Header.tsx`
- Modify: `src/components/Header/Header.css`
- Modify: `src/components/Header/Header.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `<AboutModal onClose={() => void} />` from Task 2.
- Produces: `Header` now requires a prop `onOpenAbout: () => void` — its only consumer, `App.tsx`, is updated in this same task, so this is not a breaking change to anything outside this task.

- [ ] **Step 1: Replace the full contents of `src/components/Header/Header.css`**

```css
.app-header {
  background: var(--color-green-dark);
  color: var(--color-bg-warm-alt);
  padding: 14px 24px;
  border-bottom: 3px solid var(--color-gold);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-header__title {
  font-weight: 700;
  font-size: 16px;
}

.app-header__about-link {
  background: none;
  border: none;
  color: var(--color-bg-warm-alt);
  font-size: 13px;
  text-decoration: underline;
}
```

- [ ] **Step 2: Replace the full contents of `src/components/Header/Header.tsx`**

```tsx
import { PROJECT_NAME } from '../../config';
import './Header.css';

interface HeaderProps {
  onOpenAbout: () => void;
}

export function Header({ onOpenAbout }: HeaderProps) {
  return (
    <header className="app-header">
      <span className="app-header__title">{PROJECT_NAME}</span>
      <button className="app-header__about-link" onClick={onOpenAbout}>
        عن المشروع
      </button>
    </header>
  );
}
```

- [ ] **Step 3: Update `src/components/Header/Header.test.tsx`**

Replace the full contents:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PROJECT_NAME } from '../../config';
import { Header } from './Header';

describe('Header', () => {
  it('renders the configured project name', () => {
    render(<Header onOpenAbout={() => {}} />);
    expect(screen.getByText(PROJECT_NAME)).toBeInTheDocument();
  });

  it('calls onOpenAbout when the "عن المشروع" link is clicked', () => {
    const onOpenAbout = vi.fn();
    render(<Header onOpenAbout={onOpenAbout} />);
    fireEvent.click(screen.getByText('عن المشروع'));
    expect(onOpenAbout).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run the Header tests**

Run: `npm test -- src/components/Header/Header.test.tsx`
Expected: 2 tests pass.

- [ ] **Step 5: Wire `aboutOpen` state and `AboutModal` into `App.tsx`**

Replace the full contents of `src/App.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { AboutModal } from './components/AboutModal/AboutModal';
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
  const [aboutOpen, setAboutOpen] = useState(false);

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
      <Header onOpenAbout={() => setAboutOpen(true)} />
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
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </div>
  );
}
```

- [ ] **Step 6: Add a test to `src/App.test.tsx`**

Open `src/App.test.tsx` and add this test inside the existing `describe('App', ...)` block, after the last existing test (so it runs after the "closes a stale warehouse card..." test):

```tsx
  it('opens and closes the "عن المشروع" modal from the header link', () => {
    render(<App />);
    fireEvent.click(screen.getByText('عن المشروع'));
    expect(screen.getByRole('dialog', { name: 'عن المشروع' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
    expect(screen.queryByRole('dialog', { name: 'عن المشروع' })).not.toBeInTheDocument();
  });
```

This test needs no `await`/`findBy` — clicking the header link is not gated by the async warehouse-data load, so the modal appears synchronously after the click.

- [ ] **Step 7: Run the App tests**

Run: `npm test -- src/App.test.tsx`
Expected: 6 tests pass (5 existing + 1 new), all unmodified except this addition.

- [ ] **Step 8: Run the full test suite**

Run: `npm test`
Expected: all 75 tests pass (73 from Task 2 + 1 net-new from Step 3's Header.test.tsx replacement [2 tests where 1 existed before] + 1 new from Step 6's App.test.tsx addition).

- [ ] **Step 9: Manual browser check**

Run: `npm run dev`. Click "عن المشروع" in the header — confirm the modal appears centered with a dimmed backdrop, reads correctly in RTL, and both the × button and clicking outside the modal close it.

- [ ] **Step 10: Commit**

```bash
git add src/components/Header/Header.tsx src/components/Header/Header.css src/components/Header/Header.test.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: add an \"about the project\" link and modal to the header"
```

---

## Task 4: Governorate ranking bar in the sidebar

**Files:**
- Modify: `src/components/Sidebar/Sidebar.tsx`
- Modify: `src/components/Sidebar/Sidebar.css`
- Modify: `src/components/Sidebar/Sidebar.test.tsx`

**Interfaces:** No change to `Sidebar`'s props. Purely internal rendering/sorting logic.

- [ ] **Step 1: Replace the full contents of `src/components/Sidebar/Sidebar.css`**

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
  position: relative;
  overflow: hidden;
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

.sidebar__item-bar {
  position: absolute;
  inset: 0;
  background: var(--color-sand);
  opacity: 0.45;
}

.sidebar__item-name,
.sidebar__item-count {
  position: relative;
}

.sidebar__item--active {
  background: var(--color-bg-warm);
  color: var(--color-green-dark);
  font-weight: 700;
}

.sidebar__item:hover {
  background: var(--color-bg-warm);
}

.sidebar__search:focus {
  outline: 2px solid var(--color-gold);
  outline-offset: 1px;
  border-color: var(--color-gold);
}
```

Note on why the bar needs `position: relative` on the two text spans: `.sidebar__item-bar` is `position: absolute`, which lifts it out of normal flow — CSS stacking rules paint positioned elements after static ones regardless of DOM order, so without `position: relative` on the name/count spans, the absolutely-positioned bar (despite coming first in the JSX) would render *on top of* the plain-static text, hiding it. Giving the text spans `position: relative` (with default `z-index: auto`) makes them stack by DOM order among themselves and the bar, so they correctly paint after (visually above) the bar.

- [ ] **Step 2: Replace the full contents of `src/components/Sidebar/Sidebar.tsx`**

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

  const rankedGovernorates = [...governorates].sort(
    (a, b) => (countsById[b.properties.id] ?? 0) - (countsById[a.properties.id] ?? 0),
  );
  const maxCount = Math.max(0, ...rankedGovernorates.map((g) => countsById[g.properties.id] ?? 0));

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
        {rankedGovernorates.map((g) => {
          const count = countsById[g.properties.id] ?? 0;
          const barPercent = maxCount === 0 ? 0 : (count / maxCount) * 100;
          return (
            <li key={g.properties.id}>
              <button
                className={g.properties.id === selectedGovernorateId ? 'sidebar__item sidebar__item--active' : 'sidebar__item'}
                onClick={() => onSelectGovernorate(g.properties.id)}
              >
                <span className="sidebar__item-bar" style={{ width: `${barPercent}%` }} />
                <span className="sidebar__item-name">{g.properties.name}</span>
                <span className="sidebar__item-count">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
```

- [ ] **Step 3: Add a sort-order test to `src/components/Sidebar/Sidebar.test.tsx`**

Add this test inside the existing `describe('Sidebar', ...)` block, after the last existing test:

```tsx
  it('ranks governorates by count in descending order', () => {
    render(
      <Sidebar
        governorates={GOVERNORATES}
        countsById={{ 'gov-a': 50, 'gov-b': 190 }}
        onSelectGovernorate={() => {}}
        warehouses={WAREHOUSES}
        onSelectWarehouse={() => {}}
      />,
    );
    const names = screen.getAllByText(/محافظة تجريبية/).map((el) => el.textContent);
    expect(names).toEqual(['محافظة تجريبية ب', 'محافظة تجريبية أ']);
  });
```

- [ ] **Step 4: Run the Sidebar tests**

Run: `npm test -- src/components/Sidebar/Sidebar.test.tsx`
Expected: 5 tests pass (4 existing + 1 new). The existing tests don't assert DOM order (they query by text or fire events by text, not by position), so sorting doesn't affect them.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all 76 tests pass (75 from Task 3 + 1 new here).

- [ ] **Step 6: Manual browser check**

Run: `npm run dev`. Confirm in the sidebar:
- Governorates are listed with the highest warehouse count first.
- Each row shows a subtle colored bar behind the name/count, proportional to that governorate's share of the highest count.
- The active/hover states (background tint) still read clearly with the bar present — if the bar makes the active/hover tint hard to distinguish, that's worth a quick opacity adjustment, but is not expected given the bar's low 0.45 opacity.

- [ ] **Step 7: Commit**

```bash
git add src/components/Sidebar/Sidebar.tsx src/components/Sidebar/Sidebar.css src/components/Sidebar/Sidebar.test.tsx
git commit -m "feat: rank the sidebar governorate list by warehouse count with a visual bar"
```

---

## After This Plan

All three planned improvement passes (performance, UX polish, new features) are complete. A natural next checkpoint is a full manual browser walkthrough of the whole app before considering this round of polish finished.
