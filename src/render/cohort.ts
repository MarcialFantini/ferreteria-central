import { scaleLinear } from 'd3-scale';
import type { CohortRow } from '../data/selectors';

const pct = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

export const cohortOpacity = scaleLinear().domain([0.2, 1.05]).range([0.08, 1]).clamp(true);

/** Heatmap at real pixel size. Mobile keeps the first 6 months so cells stay finger-sized. */
export function cohortSVG(rows: readonly CohortRow[], width: number, height: number): string {
  const compact = width < 640;
  const cols = compact ? 6 : 12;
  const labelW = compact ? 64 : 92;
  const headH = 34;
  const gap = compact ? 3 : 4;
  const cell = Math.floor(Math.min((width - labelW) / cols, (height - headH) / rows.length)) - gap;
  const showText = cell >= 40;
  const gridW = labelW + cols * (cell + gap);

  const head = Array.from({ length: cols }, (_, c) => {
    const x = labelW + c * (cell + gap) + cell / 2;
    return `<text class="coh-col" x="${x.toFixed(1)}" y="20" text-anchor="middle">${c === 0 ? 'Mes 0' : `+${c}`}</text>`;
  }).join('');

  const body = rows
    .map((row, r) => {
      const y = headH + r * (cell + gap);
      const label = `<text class="coh-row" x="${labelW - 12}" y="${(y + cell / 2 + 6).toFixed(1)}" text-anchor="end">${row.label}</text>`;
      const cells = row.cells
        .slice(0, cols)
        .map((c) => {
          const x = labelW + c.age * (cell + gap);
          const empty = c.retention === null;
          const op = empty ? 0 : cohortOpacity(c.retention ?? 0);
          const text =
            showText && !empty
              ? `<text class="coh-val${op > 0.55 ? ' is-on' : ''}" x="${(x + cell / 2).toFixed(1)}" y="${(y + cell / 2 + 6).toFixed(1)}" text-anchor="middle">${pct.format((c.retention ?? 0) * 100)}</text>`
              : '';
          return `<g class="coh-cell${empty ? ' is-empty' : ''}" data-row="${r}" data-age="${c.age}"><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cell}" height="${cell}" fill-opacity="${op.toFixed(3)}"/>${text}</g>`;
        })
        .join('');
      return label + cells;
    })
    .join('');

  return `<svg class="coh-svg" viewBox="0 0 ${gridW} ${height}" width="${gridW}" height="${height}" role="img" aria-label="Heatmap de cohortes: retención de facturación por mes de alta">${head}${body}</svg>`;
}
