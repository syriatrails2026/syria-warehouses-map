import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GovernorateFeature } from '../../types/geo';
import type { Warehouse } from '../../types/warehouse';
import { Sidebar } from './Sidebar';

const GOVERNORATES: GovernorateFeature[] = [
  { type: 'Feature', properties: { id: 'gov-a', name: 'محافظة تجريبية أ' }, geometry: { type: 'Polygon', coordinates: [] } },
  { type: 'Feature', properties: { id: 'gov-b', name: 'محافظة تجريبية ب' }, geometry: { type: 'Polygon', coordinates: [] } },
];

const WAREHOUSES: Warehouse[] = [
  { id: 'wh-1', name: 'مخزن أ1أ-1', governorateId: 'gov-a', districtId: 'dist-a1', subdistrictId: 'sub-a1a', lat: 34.2, lng: 36.2, areaM2: 1200 },
];

describe('Sidebar', () => {
  it('lists all governorates with their counts', () => {
    render(
      <Sidebar
        governorates={GOVERNORATES}
        countsById={{ 'gov-a': 210, 'gov-b': 190 }}
        onSelectGovernorate={() => {}}
        warehouses={WAREHOUSES}
        onSelectWarehouse={() => {}}
      />,
    );
    expect(screen.getByText('محافظة تجريبية أ')).toBeInTheDocument();
    expect(screen.getByText('210')).toBeInTheDocument();
  });

  it('calls onSelectGovernorate when a governorate row is clicked', () => {
    const onSelectGovernorate = vi.fn();
    render(
      <Sidebar
        governorates={GOVERNORATES}
        countsById={{}}
        onSelectGovernorate={onSelectGovernorate}
        warehouses={WAREHOUSES}
        onSelectWarehouse={() => {}}
      />,
    );
    fireEvent.click(screen.getByText('محافظة تجريبية ب'));
    expect(onSelectGovernorate).toHaveBeenCalledWith('gov-b');
  });

  it('shows matching warehouses when typing in the search box, and calls onSelectWarehouse on click', () => {
    const onSelectWarehouse = vi.fn();
    render(
      <Sidebar
        governorates={GOVERNORATES}
        countsById={{}}
        onSelectGovernorate={() => {}}
        warehouses={WAREHOUSES}
        onSelectWarehouse={onSelectWarehouse}
      />,
    );
    fireEvent.change(screen.getByLabelText('ابحث عن مخزن بالاسم'), { target: { value: 'أ1أ' } });
    const result = screen.getByText('مخزن أ1أ-1');
    expect(result).toBeInTheDocument();
    fireEvent.click(result);
    expect(onSelectWarehouse).toHaveBeenCalledWith(WAREHOUSES[0]);
  });

  it('shows an empty state when the search has no matches', () => {
    render(
      <Sidebar
        governorates={GOVERNORATES}
        countsById={{}}
        onSelectGovernorate={() => {}}
        warehouses={WAREHOUSES}
        onSelectWarehouse={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText('ابحث عن مخزن بالاسم'), { target: { value: 'لا يوجد مخزن بهذا الاسم' } });
    expect(screen.getByText('لا توجد نتائج')).toBeInTheDocument();
  });
});
