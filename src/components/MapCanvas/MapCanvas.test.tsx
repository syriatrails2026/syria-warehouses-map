import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Warehouse } from '../../types/warehouse';
import { MapCanvas } from './MapCanvas';

const WAREHOUSES: Warehouse[] = [
  { id: 'wh-1', name: 'مخزن 1', governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a', lat: 34.2, lng: 36.2, areaM2: 1200 },
  { id: 'wh-2', name: 'مخزن 2', governorateId: 'gov-b', districtId: 'dist-b1', subdistrictId: 'sub-b1a', lat: 34.2, lng: 37.2, areaM2: 900 },
];

describe('MapCanvas', () => {
  it('renders the national governorate level when selection is empty', () => {
    render(<MapCanvas selection={{}} warehouses={WAREHOUSES} onSelectionChange={() => {}} onSelectWarehouse={() => {}} />);
    expect(screen.getByText('محافظة تجريبية أ')).toBeInTheDocument();
    expect(screen.getByText('محافظة تجريبية ب')).toBeInTheDocument();
  });

  it('drills into districts when a governorate is selected', () => {
    render(
      <MapCanvas
        selection={{ governorateId: 'gov-a' }}
        warehouses={WAREHOUSES}
        onSelectionChange={() => {}}
        onSelectWarehouse={() => {}}
      />,
    );
    expect(screen.getByText('منطقة أ1')).toBeInTheDocument();
    expect(screen.getByText('منطقة أ2')).toBeInTheDocument();
  });

  it('calls onSelectionChange with the extended selection when a district is clicked', () => {
    const onSelectionChange = vi.fn();
    render(
      <MapCanvas
        selection={{ governorateId: 'gov-a' }}
        warehouses={WAREHOUSES}
        onSelectionChange={onSelectionChange}
        onSelectWarehouse={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('feature-dist-a1'));
    expect(onSelectionChange).toHaveBeenCalledWith({ governorateId: 'gov-a', districtId: 'dist-a1' });
  });

  it('renders warehouse pins at the subdistrict level', () => {
    render(
      <MapCanvas
        selection={{ governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a' }}
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
        selection={{ governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a' }}
        warehouses={WAREHOUSES}
        onSelectionChange={() => {}}
        onSelectWarehouse={onSelectWarehouse}
      />,
    );
    fireEvent.click(screen.getByTestId('pin-wh-1'));
    expect(onSelectWarehouse).toHaveBeenCalledWith(WAREHOUSES[0]);
  });
});
