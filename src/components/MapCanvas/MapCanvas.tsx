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
