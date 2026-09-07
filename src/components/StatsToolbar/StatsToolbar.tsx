import type { OverallStats } from '../../data/stats';
import { StatTile } from './StatTile';
import './StatsToolbar.css';

interface StatsToolbarProps {
  stats: OverallStats;
  contextualLabel: string;
  contextualCount: number;
}

export function StatsToolbar({ stats, contextualLabel, contextualCount }: StatsToolbarProps) {
  return (
    <div className="stats-toolbar">
      <StatTile label="إجمالي المخازن" value={stats.totalWarehouses.toLocaleString('ar-SY')} />
      <StatTile label="إجمالي المساحة (م²)" value={stats.totalAreaM2.toLocaleString('ar-SY')} />
      <StatTile label="متوسط مساحة المخزن (م²)" value={Math.round(stats.averageAreaM2).toLocaleString('ar-SY')} />
      <StatTile label="أكبر محافظة" value={stats.topGovernorateName || '—'} />
      <StatTile label={contextualLabel} value={contextualCount.toLocaleString('ar-SY')} accent />
    </div>
  );
}
