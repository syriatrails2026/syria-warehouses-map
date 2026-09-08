import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChoroplethLegend } from './ChoroplethLegend';

describe('ChoroplethLegend', () => {
  it('renders the title and formatted min/max labels', () => {
    render(<ChoroplethLegend maxCount={210} />);
    expect(screen.getByText('عدد المخازن')).toBeInTheDocument();
    expect(screen.getByText('٠')).toBeInTheDocument();
    expect(screen.getByText('٢١٠')).toBeInTheDocument();
  });
});
