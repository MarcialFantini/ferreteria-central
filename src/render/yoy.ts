import { scaleLinear } from 'd3-scale';
import { curveMonotoneX, line } from 'd3-shape';
import type { YoyData } from '../data/selectors';
import { formatTick } from '../lib/format';

export interface YoyGeometry {
  svg: string;
  /** X pixel per month index, for the cursor. */
  xs: number[];
  ysCurrent: number[];
  ysPrevious: number[];
  crossings: { x: number; y: number; month: number }[];
  plotTop: number;
  plotBottom: number;
}

/** Renders the year-over-year chart at real pixel size so labels stay large on any screen. */
export function yoyChart(data: YoyData, width: number, height: number): YoyGeometry {
  const compact = width < 640;
  const m = { top: 28, right: compact ? 16 : 150, bottom: compact ? 40 : 52, left: compact ? 8 : 12 };
  const all = [...data.current, ...data.previous];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const padY = (hi - lo) * 0.12;
  const x = scaleLinear()
    .domain([0, data.labels.length - 1])
    .range([m.left + 8, width - m.right]);
  const y = scaleLinear()
    .domain([lo - padY, hi + padY])
    .range([height - m.bottom, m.top])
    .nice(4);
  const mk = line<number>()
    .x((_, i) => x(i))
    .y((v) => y(v))
    .curve(curveMonotoneX);

  const xs = data.labels.map((_, i) => x(i));
  const ysCurrent = data.current.map((v) => y(v));
  const ysPrevious = data.previous.map((v) => y(v));

  // Where the curves cross: sign changes of (current - previous), linearly interpolated.
  const crossings: YoyGeometry['crossings'] = [];
  for (let i = 0; i < data.current.length - 1; i++) {
    const d0 = (data.current[i] ?? 0) - (data.previous[i] ?? 0);
    const d1 = (data.current[i + 1] ?? 0) - (data.previous[i + 1] ?? 0);
    if (d0 === 0 || Math.sign(d0) === Math.sign(d1)) continue;
    const t = d0 / (d0 - d1);
    const cx = (xs[i] ?? 0) + ((xs[i + 1] ?? 0) - (xs[i] ?? 0)) * t;
    const cy = (ysCurrent[i] ?? 0) + ((ysCurrent[i + 1] ?? 0) - (ysCurrent[i] ?? 0)) * t;
    crossings.push({ x: cx, y: cy, month: i + t });
  }

  const ticks = y.ticks(4);
  const grid = ticks
    .map(
      (t) =>
        `<g class="yoy-tick"><line x1="${m.left}" x2="${width - m.right}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text x="${m.left}" y="${(y(t) - 8).toFixed(1)}">${formatTick(t)}</text></g>`,
    )
    .join('');
  const step = compact ? 2 : 1;
  const months = data.labels
    .map((l, i) =>
      i % step === 0 || i === data.labels.length - 1
        ? `<text class="yoy-month" data-month="${i}" x="${(xs[i] ?? 0).toFixed(1)}" y="${height - 12}" text-anchor="middle">${l}</text>`
        : '',
    )
    .join('');

  const lastX = xs[xs.length - 1] ?? 0;
  const endLabels = compact
    ? ''
    : `<text class="yoy-end yoy-end--current" x="${lastX + 14}" y="${(ysCurrent[ysCurrent.length - 1] ?? 0) + 6}">Este año</text>
       <text class="yoy-end yoy-end--previous" x="${lastX + 14}" y="${(ysPrevious[ysPrevious.length - 1] ?? 0) + 6}">Año anterior</text>`;

  const crossMarks = crossings
    .map(
      (c, i) =>
        `<g class="yoy-cross" data-cross="${i}" transform="translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})"><circle r="7"/><text y="-16" text-anchor="middle">cruce</text></g>`,
    )
    .join('');

  const svg = `<svg class="yoy-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Facturación mensual: últimos 12 meses contra los 12 anteriores">
  <defs><clipPath id="yoy-clip"><rect data-yoy-clip x="0" y="0" width="${width}" height="${height}"/></clipPath></defs>
  <g class="yoy-grid">${grid}</g>
  <g clip-path="url(#yoy-clip)">
    <path class="yoy-line yoy-line--previous" d="${mk(data.previous) ?? ''}"/>
    <path class="yoy-line yoy-line--current" d="${mk(data.current) ?? ''}"/>
    ${crossMarks}
  </g>
  ${endLabels}
  <g class="yoy-months">${months}</g>
  <g class="yoy-cursor" data-yoy-cursor>
    <line y1="${m.top - 10}" y2="${height - m.bottom}"/>
    <circle class="yoy-dot yoy-dot--previous" r="6" data-dot-previous/>
    <circle class="yoy-dot yoy-dot--current" r="8" data-dot-current/>
  </g>
</svg>`;
  return { svg, xs, ysCurrent, ysPrevious, crossings, plotTop: m.top, plotBottom: height - m.bottom };
}
