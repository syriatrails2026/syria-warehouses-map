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
