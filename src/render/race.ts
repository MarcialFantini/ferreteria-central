import { PRODUCTS } from '../data/dataset';
import { formatCompact } from '../lib/format';

export interface RaceBox {
  width: number;
  height: number;
  compact: boolean;
  top: number;
}

export const raceBox = (width: number, height: number): RaceBox => {
  const compact = width < 640;
  return { width, height, compact, top: compact ? 8 : 10 };
};

export interface BarLayout {
  index: number;
  rank: number;
  y: number;
  barWidth: number;
  visible: boolean;
  value: number;
}

export function raceGeometry(box: RaceBox) {
  const rows = box.top;
  const rowH = box.height / (rows + 0.4);
  const labelW = box.compact ? 0 : Math.min(300, box.width * 0.3);
  const valueW = box.compact ? 0 : 120;
  const barX = labelW;
  const barMax = box.width - labelW - valueW - 8;
  const barH = box.compact ? Math.min(16, rowH * 0.3) : Math.min(44, rowH * 0.66);
  return { rows, rowH, labelW, barX, barMax, barH };
}

export function raceLayout(totals: readonly number[], box: RaceBox): BarLayout[] {
  const g = raceGeometry(box);
  const order = totals.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const max = order[0]?.v || 1;
  const rankOf = new Map(order.map((o, r) => [o.i, r]));
  return totals.map((value, index) => {
    const rank = rankOf.get(index) ?? 99;
    const visible = rank < g.rows;
    return {
      index,
      rank,
      y: (visible ? rank + 0.2 : g.rows + 0.8) * g.rowH,
      barWidth: Math.max(2, (value / max) * (box.compact ? box.width - 8 : g.barMax)),
      visible,
      value,
    };
  });
}

/** Static SVG for one frame; the client tweens the same elements between frames. */
export function raceSVG(totals: readonly number[], box: RaceBox): string {
  const g = raceGeometry(box);
  const layout = raceLayout(totals, box);
  const bars = layout
    .map((b) => {
      const p = PRODUCTS[b.index];
      if (!p) return '';
      const name = p.name.replace(/&/g, '&amp;');
      const barY = box.compact ? g.rowH * 0.5 : (g.rowH - g.barH) / 2;
      const nameEl = box.compact
        ? `<text class="race-name" x="0" y="${(g.rowH * 0.36).toFixed(1)}">${name}</text>`
        : `<text class="race-name" x="${g.labelW - 16}" y="${(g.rowH / 2 + 7).toFixed(1)}" text-anchor="end">${name}</text>`;
      const valueX = box.compact ? box.width : g.barX + b.barWidth + 12;
      const valueEl = box.compact
        ? `<text class="race-value" data-value x="${valueX}" y="${(g.rowH * 0.36).toFixed(1)}" text-anchor="end">${formatCompact(b.value)}</text>`
        : `<text class="race-value" data-value x="${valueX.toFixed(1)}" y="${(g.rowH / 2 + 9).toFixed(1)}">${formatCompact(b.value)}</text>`;
      return `<g class="race-bar${b.rank === 0 ? ' is-leader' : ''}" data-bar="${b.index}" transform="translate(0 ${b.y.toFixed(1)})" opacity="${b.visible ? 1 : 0}">
  ${nameEl}<rect x="${g.barX}" y="${barY.toFixed(1)}" height="${g.barH.toFixed(1)}" width="${b.barWidth.toFixed(1)}"/>${valueEl}
</g>`;
    })
    .join('');
  return `<svg class="race-svg" viewBox="0 0 ${box.width} ${box.height}" width="${box.width}" height="${box.height}" role="img" aria-label="Ranking de productos por facturación acumulada">${bars}</svg>`;
}
