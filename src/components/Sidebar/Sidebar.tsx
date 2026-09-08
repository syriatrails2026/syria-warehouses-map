import { useState } from 'react';
import type { GovernorateFeature } from '../../types/geo';
import type { Warehouse } from '../../types/warehouse';
import './Sidebar.css';

interface SidebarProps {
  governorates: GovernorateFeature[];
  countsById: Record<string, number>;
  selectedGovernorateId?: string;
  onSelectGovernorate: (governorateId: string) => void;
  warehouses: Warehouse[];
  onSelectWarehouse: (warehouse: Warehouse) => void;
}

const MAX_SEARCH_RESULTS = 8;

export function Sidebar({
  governorates,
  countsById,
  selectedGovernorateId,
  onSelectGovernorate,
  warehouses,
  onSelectWarehouse,
}: SidebarProps) {
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const matches = trimmed.length === 0 ? [] : warehouses.filter((w) => w.name.includes(trimmed)).slice(0, MAX_SEARCH_RESULTS);

  const rankedGovernorates = [...governorates].sort(
    (a, b) => (countsById[b.properties.id] ?? 0) - (countsById[a.properties.id] ?? 0),
  );
  const maxCount = Math.max(0, ...rankedGovernorates.map((g) => countsById[g.properties.id] ?? 0));

  return (
    <aside className="sidebar">
      <input
        className="sidebar__search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ابحث عن مخزن بالاسم..."
        aria-label="ابحث عن مخزن بالاسم"
      />
      {trimmed.length > 0 && matches.length === 0 && <p className="sidebar__empty">لا توجد نتائج</p>}
      {matches.length > 0 && (
        <ul className="sidebar__search-results">
          {matches.map((w) => (
            <li key={w.id}>
              <button onClick={() => onSelectWarehouse(w)}>{w.name}</button>
            </li>
          ))}
        </ul>
      )}
      <ul className="sidebar__list">
        {rankedGovernorates.map((g) => {
          const count = countsById[g.properties.id] ?? 0;
          const barPercent = maxCount === 0 ? 0 : (count / maxCount) * 100;
          return (
            <li key={g.properties.id}>
              <button
                className={g.properties.id === selectedGovernorateId ? 'sidebar__item sidebar__item--active' : 'sidebar__item'}
                onClick={() => onSelectGovernorate(g.properties.id)}
              >
                <span className="sidebar__item-bar" style={{ width: `${barPercent}%` }} />
                <span className="sidebar__item-name">{g.properties.name}</span>
                <span className="sidebar__item-count">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
