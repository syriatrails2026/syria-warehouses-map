import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChoroplethLevel } from './ChoroplethLevel';

const FEATURES: GeoJSON.Feature<GeoJSON.Polygon, { id: string; name: string }>[] = [
  {
    type: 'Feature',
    properties: { id: 'gov-a', name: 'محافظة تجريبية أ' },
    geometry: { type: 'Polygon', coordinates: [[[36, 34], [37, 34], [37, 35], [36, 35], [36, 34]]] },
  },
  {
    type: 'Feature',
    properties: { id: 'gov-b', name: 'محافظة تجريبية ب' },
    geometry: { type: 'Polygon', coordinates: [[[37, 34], [38, 34], [38, 35], [37, 35], [37, 34]]] },
  },
];

describe('ChoroplethLevel', () => {
  it('renders one feature group per input feature with its name and count', () => {
    render(<ChoroplethLevel features={FEATURES} countsById={{ 'gov-a': 210, 'gov-b': 0 }} onSelectFeature={() => {}} />);
    expect(screen.getByText('محافظة تجريبية أ')).toBeInTheDocument();
    expect(screen.getByText('210 مخزن')).toBeInTheDocument();
    expect(screen.getByText('محافظة تجريبية ب')).toBeInTheDocument();
    expect(screen.getByText('0 مخزن')).toBeInTheDocument();
  });

  it('calls onSelectFeature with the feature id when clicked', () => {
    const onSelectFeature = vi.fn();
    render(<ChoroplethLevel features={FEATURES} countsById={{}} onSelectFeature={onSelectFeature} />);
    fireEvent.click(screen.getByTestId('feature-gov-a'));
    expect(onSelectFeature).toHaveBeenCalledWith('gov-a');
  });
});
