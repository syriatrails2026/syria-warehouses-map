import { describe, expect, it } from 'vitest';
import { fitProjection } from './projection';

const SQUARE: GeoJSON.Feature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'Polygon', coordinates: [[[36, 34], [37, 34], [37, 35], [36, 35], [36, 34]]] },
};

describe('fitProjection', () => {
  it('produces a path generator that renders a non-empty "d" attribute for the feature', () => {
    const { path } = fitProjection([SQUARE], 600, 400);
    const d = path(SQUARE);
    expect(d).toBeTruthy();
    expect(d).toMatch(/^M/);
  });

  it('projects a coordinate from the feature into the given pixel bounds', () => {
    const { projection } = fitProjection([SQUARE], 600, 400);
    const projected = projection([36.5, 34.5]);
    expect(projected).not.toBeNull();
    const [x, y] = projected!;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(600);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(400);
  });
});
