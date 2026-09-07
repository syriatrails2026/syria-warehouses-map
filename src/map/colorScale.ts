import { scaleLinear, type ScaleLinear } from 'd3-scale';

export const NEUTRAL_FILL = '#e5e2d8';

export function makeCountColorScale(counts: number[]): ScaleLinear<string, string> {
  const max = Math.max(1, ...counts);
  return scaleLinear<string>().domain([0, max]).range(['#dcc27a', '#0f2a1c']);
}

export function colorForCount(count: number, scale: ScaleLinear<string, string>): string {
  if (count === 0) return NEUTRAL_FILL;
  return scale(count);
}
