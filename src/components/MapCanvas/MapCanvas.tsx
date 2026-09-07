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
