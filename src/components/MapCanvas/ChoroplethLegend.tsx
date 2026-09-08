import './ChoroplethLegend.css';

interface ChoroplethLegendProps {
  maxCount: number;
}

export function ChoroplethLegend({ maxCount }: ChoroplethLegendProps) {
  return (
    <div className="choropleth-legend">
      <div className="choropleth-legend__title">عدد المخازن</div>
      <div className="choropleth-legend__bar" />
      <div className="choropleth-legend__scale">
        <span>{(0).toLocaleString('ar-SY')}</span>
        <span>{maxCount.toLocaleString('ar-SY')}</span>
      </div>
    </div>
  );
}
