import { curveMonotoneX, line } from 'd3-shape';
import { DAY_END, DAY_START } from '../data/live';
import { formatTick } from '../lib/format';

export interface CurvePoint {
  minute: number;
  value: number;
}

/** "Hoy vs ayer": cumulative revenue through the business day, at real pixel size. */
export function liveCurveSVG(today: CurvePoint[], yesterday: CurvePoint[], width: number, height: number): string {
  const compact = width < 560;
  const m = { top: 24, right: compact ? 12 : 96, bottom: 36, left: 8 };
  const max = Math.max(1, ...yesterday.map((p) => p.value), ...today.map((p) => p.value)) * 1.08;
  const x = (min: number) => m.left + ((min - DAY_START) / (DAY_END - DAY_START)) * (width - m.left - m.right);
  const y = (v: number) => height - m.bottom - (v / max) * (height - m.top - m.bottom);
  const mk = line<CurvePoint>()
    .x((p) => x(p.minute))
    .y((p) => y(p.value))
    .curve(curveMonotoneX);

  const ticks = [0.25, 0.5, 0.75, 1].map((t) => t * max * 0.92);
  const grid = ticks
    .map((t) => `<line class="lc-grid" x1="${m.left}" x2="${width - m.right}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text class="lc-tick" x="${m.left}" y="${(y(t) - 6).toFixed(1)}">${formatTick(Math.round(t / 1e5) * 1e5)}</text>`)
    .join('');
  const hours = [];
  for (let h = 8; h <= 20; h += compact ? 4 : 2) hours.push(`<text class="lc-hour" x="${x(h * 60).toFixed(1)}" y="${height - 10}" text-anchor="middle">${h} h</text>`);

  const head = today[today.length - 1];
  const yEnd = yesterday[yesterday.length - 1];
  const hx = head ? x(head.minute) : 0;
  const hy = head ? y(head.value) : 0;
  // Yesterday at the same time of day, for the live comparison marker.
  const ySame = head ? [...yesterday].reverse().find((p) => p.minute <= head.minute) : undefined;
  const labels = compact
    ? ''
    : `${yEnd ? `<text class="lc-end lc-end--y" x="${x(yEnd.minute) + 10}" y="${y(yEnd.value) + 6}">Ayer</text>` : ''}`;
  return `<svg class="lc-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Facturación acumulada de hoy contra ayer" data-export="Hoy contra ayer">
  ${grid}${hours.join('')}
  <path class="lc-line lc-line--y" d="${mk(yesterday) ?? ''}"/>
  <path class="lc-line lc-line--t" d="${mk(today) ?? ''}"/>
  ${ySame ? `<circle class="lc-same" cx="${hx.toFixed(1)}" cy="${y(ySame.value).toFixed(1)}" r="5"/>` : ''}
  ${head ? `<line class="lc-now" x1="${hx.toFixed(1)}" x2="${hx.toFixed(1)}" y1="${m.top}" y2="${height - m.bottom}"/><circle class="lc-head-ring" cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="12"/><circle class="lc-head" cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="6"/>` : ''}
  ${labels}${!compact && head ? `<text class="lc-end lc-end--t" x="${hx + 14}" y="${hy - 12}">Hoy</text>` : ''}
</svg>`;
}
