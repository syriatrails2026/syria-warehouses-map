import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Warehouse } from '../../types/warehouse';
import { MapCanvas } from './MapCanvas';

// Real ids from the imported Syria dataset: SY02 حلب (Aleppo) -> SY0202
// الباب (Al Bab) -> SY020206 عريمة (A'rima). See scripts/import-real-geo.mjs.
const WAREHOUSES: Warehouse[] = [
  { id: 'wh-1', name: 'مخزن 1', governorateId: 'SY02', districtId: 'SY0202', subdistrictId: 'SY020206', lat: 36.44, lng: 37.67, areaM2: 1200 },
  { id: 'wh-2', name: 'مخزن 2', governorateId: 'SY01', districtId: 'SY0100', subdistrictId: 'SY010000', lat: 33.51, lng: 36.29, areaM2: 900 },
];

describe('MapCanvas', () => {
  it('renders the national governorate level when selection is empty', () => {
    render(<MapCanvas selection={{}} warehouses={WAREHOUSES} onSelectionChange={() => {}} onSelectWarehouse={() => {}} />);
    expect(screen.getByText('حلب')).toBeInTheDocument();
    expect(screen.getByText('دمشق')).toBeInTheDocument();
  });

  it('drills into districts when a governorate is selected', () => {
    render(
      <MapCanvas
        selection={{ governorateId: 'SY02' }}
        warehouses={WAREHOUSES}
        onSelectionChange={() => {}}
        onSelectWarehouse={() => {}}
      />,
    );
    expect(screen.getByText('الباب')).toBeInTheDocument();
    expect(screen.getByText('اعزاز')).toBeInTheDocument();
  });

  it('calls onSelectionChange with the extended selection when a district is clicked', () => {
    const onSelectionChange = vi.fn();
    render(
      <MapCanvas
        selection={{ governorateId: 'SY02' }}
        warehouses={WAREHOUSES}
        onSelectionChange={onSelectionChange}
        onSelectWarehouse={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('feature-SY0202'));
    expect(onSelectionChange).toHaveBeenCalledWith({ governorateId: 'SY02', districtId: 'SY0202' });
  });

  it('renders warehouse pins at the subdistrict level', () => {
    render(
      <MapCanvas
        selection={{ governorateId: 'SY02', districtId: 'SY0202', subdistrictId: 'SY020206' }}
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
        selection={{ governorateId: 'SY02', districtId: 'SY0202', subdistrictId: 'SY020206' }}
        warehouses={WAREHOUSES}
        onSelectionChange={() => {}}
        onSelectWarehouse={onSelectWarehouse}
      />,
    );
    fireEvent.click(screen.getByTestId('pin-wh-1'));
    expect(onSelectWarehouse).toHaveBeenCalledWith(WAREHOUSES[0]);
  });
});
