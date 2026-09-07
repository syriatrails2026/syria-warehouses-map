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
