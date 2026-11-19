import { line, curveMonotoneX } from 'd3-shape';

export const SPARK_W = 1000;
export const SPARK_H = 200;

export interface SparkGeometry {
  d: string;
  /** Points as percentages of the box, for HTML markers that must not distort. */
  points: { x: number; y: number }[];
}

export function sparkGeometry(values: readonly number[], width = SPARK_W, height = SPARK_H, pad = 0.08): SparkGeometry {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  // Plain linear maps: keeps d3-scale out of the first bundle.
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * width;
  const span = max - min || 1;
  const y = (v: number) => height * (1 - pad) - ((v - min) / span) * height * (1 - 2 * pad);
  const pts = values.map((v, i) => [x(i), y(v)] as [number, number]);
  const d = line().curve(curveMonotoneX)(pts) ?? '';
  return {
    d,
    points: pts.map(([px, py]) => ({ x: (px / width) * 100, y: (py / height) * 100 })),
  };
}

/** Tiny inline sparkline used inside tooltips and table cells. */
export function miniSpark(values: readonly number[], highlight?: number, w = 160, h = 40): string {
  const { d, points } = sparkGeometry(values, w, h, 0.12);
  const hp = highlight !== undefined ? points[highlight] : undefined;
  const dot = hp
    ? `<circle cx="${((hp.x / 100) * w).toFixed(1)}" cy="${((hp.y / 100) * h).toFixed(1)}" r="3.5" fill="var(--accent)"/>`
    : '';
  return `<svg class="mini-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.75"/>${dot}</svg>`;
}
