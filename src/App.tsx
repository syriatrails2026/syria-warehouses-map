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
