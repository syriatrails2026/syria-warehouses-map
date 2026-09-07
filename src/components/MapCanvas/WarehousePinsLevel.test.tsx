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
