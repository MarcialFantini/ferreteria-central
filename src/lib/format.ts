const ars = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const one = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** "482.315.940" (no currency sign; the UI sets "$" as its own glyph). */
export const formatInt = (value: number): string => ars.format(Math.round(value));

export const formatMoney = (value: number): string => `$ ${formatInt(value)}`;

/** "$ 482,3 M" / "$ 5,6 mil M" for labels where space is tight. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$ ${one.format(value / 1e9)} mil M`;
  if (abs >= 1e6) return `$ ${one.format(value / 1e6)} M`;
  if (abs >= 1e3) return `$ ${one.format(value / 1e3)} k`;
  return `$ ${formatInt(value)}`;
}

/** Axis ticks: "$ 400 M" (no decimals). */
export function formatTick(value: number): string {
  if (Math.abs(value) >= 1e6) return `$ ${formatInt(value / 1e6)} M`;
  return `$ ${formatInt(value)}`;
}

export const formatPercent = (ratio: number): string => `${pct.format(ratio * 100)} %`;

export const formatSignedPercent = (ratio: number): string =>
  `${ratio >= 0 ? '+' : '−'}${pct.format(Math.abs(ratio) * 100)} %`;
