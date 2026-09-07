import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Warehouse } from '../../types/warehouse';
import { WarehouseCard } from './WarehouseCard';

const WAREHOUSE: Warehouse = {
  id: 'wh-1',
  name: 'مخزن أ1أ-1',
  governorateId: 'gov-a',
  districtId: 'dist-a1',
  subdistrictId: 'sub-a1a',
  lat: 34.25,
  lng: 36.25,
  areaM2: 1500,
};

describe('WarehouseCard', () => {
  it('shows the warehouse name and area', () => {
    render(<WarehouseCard warehouse={WAREHOUSE} onClose={() => {}} />);
    expect(screen.getByText('مخزن أ1أ-1')).toBeInTheDocument();
    // areaM2.toLocaleString('ar-SY') renders Eastern Arabic-Indic digits (١٬٥٠٠), not "1,500"
    expect(screen.getByText(/١٬٥٠٠ م²/)).toBeInTheDocument();
  });

  it('builds a Google Maps link from the warehouse coordinates', () => {
    render(<WarehouseCard warehouse={WAREHOUSE} onClose={() => {}} />);
    const link = screen.getByRole('link', { name: 'فتح في خرائط جوجل' });
    expect(link).toHaveAttribute('href', 'https://www.google.com/maps?q=34.25,36.25');
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<WarehouseCard warehouse={WAREHOUSE} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
    expect(onClose).toHaveBeenCalled();
  });
});
