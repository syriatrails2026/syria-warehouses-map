import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { OverallStats } from '../../data/stats';
import { StatsToolbar } from './StatsToolbar';

const STATS: OverallStats = {
  totalWarehouses: 1400,
  totalAreaM2: 2100000,
  averageAreaM2: 1500,
  topGovernorateId: 'gov-a',
  topGovernorateName: 'محافظة تجريبية أ',
  topGovernorateCount: 700,
};

describe('StatsToolbar', () => {
  it('renders all five stat tiles with formatted values', () => {
    render(<StatsToolbar stats={STATS} contextualLabel="مخازن ضمن المحافظة الحالية" contextualCount={350} />);
    expect(screen.getByText('١٬٤٠٠')).toBeInTheDocument();
    expect(screen.getByText('٢٬١٠٠٬٠٠٠')).toBeInTheDocument();
    expect(screen.getByText('١٬٥٠٠')).toBeInTheDocument();
    expect(screen.getByText('محافظة تجريبية أ')).toBeInTheDocument();
    expect(screen.getByText('٣٥٠')).toBeInTheDocument();
    expect(screen.getByText('مخازن ضمن المحافظة الحالية')).toBeInTheDocument();
  });

  it('does not crash when the contextual count equals the national total (e.g. no drill-down yet)', () => {
    render(<StatsToolbar stats={STATS} contextualLabel="مخازن ضمن سوريا" contextualCount={1400} />);
    expect(screen.getAllByText('١٬٤٠٠')).toHaveLength(2);
    expect(screen.getByText('مخازن ضمن سوريا')).toBeInTheDocument();
  });
});
