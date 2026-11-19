import { scalePow } from 'd3-scale';
import type { ProvinceDatum } from '../data/selectors';

export const MIN_OPACITY = 0.07;

/** Province fill-opacity by revenue (gentle power curve: the leader clearly lights up). */
export function provinceOpacity(rows: readonly ProvinceDatum[]): Map<string, number> {
  const max = Math.max(...rows.map((r) => r.revenue), 1);
  const scale = scalePow().exponent(0.75).domain([0, max]).range([MIN_OPACITY, 1]);
  return new Map(rows.map((r) => [r.id, +scale(r.revenue).toFixed(3)]));
}

export const topProvinces = (rows: readonly ProvinceDatum[], n: number): ProvinceDatum[] =>
  [...rows].sort((a, b) => b.revenue - a.revenue).slice(0, n);
