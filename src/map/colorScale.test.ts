import { describe, expect, it } from 'vitest';
import { colorForCount, makeCountColorScale, NEUTRAL_FILL } from './colorScale';

describe('colorForCount', () => {
  it('returns the neutral fill for a zero count', () => {
    const scale = makeCountColorScale([0, 5, 10]);
    expect(colorForCount(0, scale)).toBe(NEUTRAL_FILL);
  });

  it('returns a color from the scale for a positive count', () => {
    const scale = makeCountColorScale([0, 5, 10]);
    const color = colorForCount(5, scale);
    expect(color).not.toBe(NEUTRAL_FILL);
    expect(color).toMatch(/^#|^rgb/);
  });

  it('handles an all-zero counts array without throwing', () => {
    const scale = makeCountColorScale([0, 0, 0]);
    expect(() => colorForCount(0, scale)).not.toThrow();
  });
});
