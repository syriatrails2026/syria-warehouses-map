import type { OverallStats } from '../../data/stats';
import { StatTile } from './StatTile';
import './StatsToolbar.css';

interface StatsToolbarProps {
  stats: OverallStats;
  contextualLabel: string;
  contextualCount: number;
  loading?: boolean;
}

export function StatsToolbar({ stats, contextualLabel, contextualCount, loading }: StatsToolbarProps) {
  const display = (value: string) => (loading ? '···' : value);

  return (
    <div className="stats-toolbar">
      <StatTile label="إجمالي المخازن" value={display(stats.totalWarehouses.toLocaleString('ar-SY'))} />
      <StatTile label="إجمالي المساحة (م²)" value={display(stats.totalAreaM2.toLocaleString('ar-SY'))} />
      <StatTile label="متوسط مساحة المخزن (م²)" value={display(Math.round(stats.averageAreaM2).toLocaleString('ar-SY'))} />
      <StatTile label="أكبر محافظة" value={loading ? '···' : stats.topGovernorateName || '—'} />
      <StatTile label={contextualLabel} value={display(contextualCount.toLocaleString('ar-SY'))} accent />
    </div>
  );
}
