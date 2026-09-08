import type { Feature, Geometry } from 'geojson';
import { fitProjection } from '../../map/projection';
import { colorForCount, makeCountColorScale } from '../../map/colorScale';
import { useElementSize } from '../../map/useElementSize';
import { ChoroplethLegend } from './ChoroplethLegend';
import './ChoroplethLevel.css';

interface FeatureWithIdName {
  id: string;
  name: string;
}

interface ChoroplethLevelProps<P extends FeatureWithIdName> {
  features: Feature<Geometry, P>[];
  countsById: Record<string, number>;
  onSelectFeature: (id: string) => void;
}

export function ChoroplethLevel<P extends FeatureWithIdName>({
  features,
  countsById,
  onSelectFeature,
}: ChoroplethLevelProps<P>) {
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();

  const { path } = fitProjection(features, size.width, size.height);
  const counts = features.map((f) => countsById[f.properties.id] ?? 0);
  const colorScale = makeCountColorScale(counts);
  const maxCount = Math.max(0, ...counts);

  return (
    <div className="choropleth-level" ref={containerRef} data-testid="choropleth-level">
      <svg width={size.width} height={size.height} role="img" aria-label="خريطة">
        {features.map((feature) => {
          const count = countsById[feature.properties.id] ?? 0;
          const centroid = path.centroid(feature);
          return (
            <g
              key={feature.properties.id}
              className="choropleth-level__feature"
              onClick={() => onSelectFeature(feature.properties.id)}
              data-testid={`feature-${feature.properties.id}`}
            >
              <path d={path(feature) ?? undefined} fill={colorForCount(count, colorScale)} stroke="#faf9f6" strokeWidth={2} />
              <text x={centroid[0]} y={centroid[1]} textAnchor="middle" className="choropleth-level__label">
                {feature.properties.name}
                <tspan x={centroid[0]} dy="1.2em">
                  {count} مخزن
                </tspan>
              </text>
            </g>
          );
        })}
      </svg>
      <ChoroplethLegend maxCount={maxCount} />
    </div>
  );
}
