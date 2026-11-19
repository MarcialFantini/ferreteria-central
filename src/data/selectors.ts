// Pure query functions over the in-memory dataset. Every scene reads through these.
import { hashNoise } from './rng';
import {
  AVG_TICKET,
  CLIENTS,
  CLIENT_MONTH_REVENUE,
  DAY_WEIGHTS,
  MONTHS,
  PRODUCTS,
  PRODUCT_MOMENTUM,
  PRODUCT_SHARE,
  PROVINCES,
  type Client,
} from './dataset';
import { SELLERS } from './catalog';
import { CITY_POINTS } from './argentina-geo';

export type Period = 'mes' | 'trimestre' | 'anio';
export type SellerFilter = 'all' | string;

export interface Filters {
  period: Period;
  seller: SellerFilter;
  /** Province id or 'all'. */
  province: string;
}

/** Who is being looked at: a seller and/or a province. */
export interface Segment {
  seller: SellerFilter;
  province: string;
}

export const DEFAULT_FILTERS: Filters = { period: 'mes', seller: 'all', province: 'all' };

export const PERIOD_LABEL: Readonly<Record<Period, string>> = {
  mes: 'Mes',
  trimestre: 'Trimestre',
  anio: 'Año',
};

const LAST = MONTHS.length - 1;
const PERIOD_LENGTH: Readonly<Record<Period, number>> = { mes: 1, trimestre: 3, anio: 12 };

export function periodMonths(period: Period): number[] {
  const n = PERIOD_LENGTH[period];
  return Array.from({ length: n }, (_, i) => LAST - n + 1 + i);
}

export function periodTitle(period: Period): string {
  const months = periodMonths(period);
  const first = MONTHS[months[0] ?? 0];
  const last = MONTHS[months[months.length - 1] ?? 0];
  if (!first || !last) return '';
  if (period === 'mes') return last.label;
  return `${first.short} ${first.year} – ${last.short} ${last.year}`;
}

export const clientIndexes = ({ seller, province }: Segment): number[] =>
  CLIENTS.flatMap((c, i) =>
    (seller === 'all' || c.sellerId === seller) && (province === 'all' || c.provinceId === province) ? [i] : [],
  );

const cell = (clientIdx: number, month: number): number => CLIENT_MONTH_REVENUE[clientIdx]?.[month] ?? 0;

export function monthlyRevenue(segment: Segment): number[] {
  const idx = clientIndexes(segment);
  return MONTHS.map((m) => idx.reduce((s, i) => s + cell(i, m.index), 0));
}

export function sumMonths(series: readonly number[], months: readonly number[]): number {
  return months.reduce((s, m) => s + (series[m] ?? 0), 0);
}

export interface HeroData {
  total: number;
  previousYear: number;
  yoy: number;
  orders: number;
  activeClients: number;
  series: number[];
  seriesLabels: string[];
  seriesUnit: string;
  peakIndex: number;
}

/** Daily revenue across the selected months, oldest first. */
function dailySeries(segment: Segment, months: readonly number[]): { value: number; label: string }[] {
  const monthly = monthlyRevenue(segment);
  return months.flatMap((m) => {
    const month = MONTHS[m];
    const weights = DAY_WEIGHTS[m] ?? [];
    return weights.map((w, d) => ({ value: (monthly[m] ?? 0) * w, label: `${d + 1} ${month?.short ?? ''}` }));
  });
}

function chunkWeeks(days: { value: number; label: string }[]): { value: number; label: string }[] {
  const weeks: { value: number; label: string }[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const slice = days.slice(i, i + 7);
    weeks.push({ value: slice.reduce((s, d) => s + d.value, 0), label: slice[0]?.label ?? '' });
  }
  return weeks;
}

export function heroData(filters: Filters): HeroData {
  const { period } = filters;
  const months = periodMonths(period);
  const monthly = monthlyRevenue(filters);
  const total = sumMonths(monthly, months);
  const previousYear = sumMonths(
    monthly,
    months.map((m) => m - 12),
  );
  const idx = clientIndexes(filters);
  const activeClients = idx.filter((i) => months.some((m) => cell(i, m) > 0)).length;

  let points: { value: number; label: string }[];
  let seriesUnit: string;
  if (period === 'mes') {
    points = dailySeries(filters, months);
    seriesUnit = 'por día';
  } else if (period === 'trimestre') {
    points = chunkWeeks(dailySeries(filters, months));
    seriesUnit = 'por semana';
  } else {
    points = months.map((m) => ({ value: monthly[m] ?? 0, label: MONTHS[m]?.short ?? '' }));
    seriesUnit = 'por mes';
  }
  const series = points.map((p) => p.value);
  const peak = Math.max(...series);
  return {
    total,
    previousYear,
    yoy: previousYear > 0 ? total / previousYear - 1 : 0,
    orders: Math.round(total / AVG_TICKET),
    activeClients,
    series,
    seriesLabels: points.map((p) => p.label),
    seriesUnit,
    peakIndex: series.indexOf(peak),
  };
}

export interface ProvinceDatum {
  id: string;
  name: string;
  revenue: number;
  clients: number;
  share: number;
  /** Monthly revenue over the 24-month window, for tooltip minis. */
  trend: number[];
}

export function provinceData(filters: Filters): ProvinceDatum[] {
  const months = periodMonths(filters.period);
  const idx = clientIndexes(filters);
  const rows = PROVINCES.map((p) => {
    const members = idx.filter((i) => CLIENTS[i]?.provinceId === p.id);
    const trend = MONTHS.map((m) => members.reduce((s, i) => s + cell(i, m.index), 0));
    return {
      id: p.id,
      name: p.name,
      revenue: sumMonths(trend, months),
      clients: members.filter((i) => months.some((m) => cell(i, m) > 0)).length,
      share: 0,
      trend,
    };
  });
  const total = rows.reduce((s, r) => s + r.revenue, 0) || 1;
  return rows.map((r) => ({ ...r, share: r.revenue / total }));
}

export interface CityOrders {
  name: string;
  provinceId: string;
  x: number;
  y: number;
  orders: number;
}

export function cityOrders(filters: Filters): CityOrders[] {
  const months = periodMonths(filters.period);
  const idx = clientIndexes(filters);
  return CITY_POINTS.map((city) => {
    const revenue = idx
      .filter((i) => CLIENTS[i]?.city === city.name && CLIENTS[i]?.provinceId === city.provinceId)
      .reduce((s, i) => s + months.reduce((t, m) => t + cell(i, m), 0), 0);
    return { ...city, orders: Math.round(revenue / AVG_TICKET) };
  }).filter((c) => c.orders > 0);
}

export interface ClientDatum extends Client {
  revenue: number;
  trend: number[];
}

export function provinceClients(provinceId: string, { period, seller }: Filters): ClientDatum[] {
  const months = periodMonths(period);
  return clientIndexes({ seller, province: 'all' })
    .filter((i) => CLIENTS[i]?.provinceId === provinceId)
    .map((i) => {
      const client = CLIENTS[i] as Client;
      const trend = MONTHS.map((m) => cell(i, m.index));
      return { ...client, trend, revenue: sumMonths(trend, months) };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export interface YoyData {
  labels: string[];
  current: number[];
  previous: number[];
  currentYearLabel: string;
  previousYearLabel: string;
}

export function yoyData(segment: Segment): YoyData {
  const monthly = monthlyRevenue(segment);
  return {
    labels: MONTHS.slice(12).map((m) => m.short),
    current: monthly.slice(12),
    previous: monthly.slice(0, 12),
    currentYearLabel: 'Últimos 12 meses',
    previousYearLabel: '12 meses anteriores',
  };
}

export interface RaceFrame {
  label: string;
  /** Cumulative revenue per product index up to this week. */
  totals: number[];
}

export function productRace({ period, seller, province }: Filters): RaceFrame[] {
  const months = periodMonths(period);
  // Daily totals per seller, so each seller's mix contributes separately.
  const sellers = seller === 'all' ? SELLERS.map((_, i) => i) : [SELLERS.findIndex((s) => s.id === seller)];
  const weeksBySeller = sellers.map((si) => ({
    si,
    weeks: chunkWeeks(dailySeries({ seller: SELLERS[si]?.id ?? 'all', province }, months)),
  }));
  const weekCount = weeksBySeller[0]?.weeks.length ?? 0;
  const running = PRODUCTS.map(() => 0);
  const frames: RaceFrame[] = [];
  for (let w = 0; w < weekCount; w++) {
    const progress = weekCount > 1 ? w / (weekCount - 1) : 1;
    for (const { si, weeks } of weeksBySeller) {
      const weekTotal = weeks[w]?.value ?? 0;
      const share = PRODUCT_SHARE[si] ?? [];
      PRODUCTS.forEach((_, p) => {
        const momentum = 1 + (PRODUCT_MOMENTUM[p] ?? 0) * (progress - 0.5) * 2;
        const noise = 0.7 + hashNoise(p, w, si) * 0.6;
        running[p] = (running[p] ?? 0) + weekTotal * (share[p] ?? 0) * Math.max(0.2, momentum) * noise;
      });
    }
    frames.push({ label: `Semana ${w + 1} · ${weeksBySeller[0]?.weeks[w]?.label ?? ''}`, totals: running.slice() });
  }
  return frames;
}

export interface CohortCell {
  /** Months since acquisition. */
  age: number;
  /** Revenue retention vs. the cohort's first month (1 = 100%). */
  retention: number | null;
  active: number;
  size: number;
  revenue: number;
}

export interface CohortRow {
  month: number;
  label: string;
  size: number;
  cells: CohortCell[];
}

export const COHORT_ROWS = 12;

export function cohortData(segment: Segment): CohortRow[] {
  const idx = clientIndexes(segment);
  const first = MONTHS.length - COHORT_ROWS;
  return Array.from({ length: COHORT_ROWS }, (_, r) => {
    const month = first + r;
    const members = idx.filter((i) => CLIENTS[i]?.cohort === month);
    const base = members.reduce((s, i) => s + cell(i, month), 0);
    const ages = MONTHS.length - month;
    const cells = Array.from({ length: ages }, (_, age) => {
      const revenue = members.reduce((s, i) => s + cell(i, month + age), 0);
      return {
        age,
        retention: base > 0 ? revenue / base : null,
        active: members.filter((i) => cell(i, month + age) > 0).length,
        size: members.length,
        revenue,
      };
    });
    const m = MONTHS[month];
    return { month, label: m ? `${m.short} ${String(m.year).slice(2)}` : '', size: members.length, cells };
  });
}

export function segmentLabel({ seller, province }: Segment): string {
  const p = province === 'all' ? '' : PROVINCES.find((x) => x.id === province)?.name;
  return p ? `${sellerName(seller)} · ${p}` : sellerName(seller);
}

export function sellerName(seller: SellerFilter): string {
  return seller === 'all' ? 'Todo el equipo' : (SELLERS.find((s) => s.id === seller)?.name ?? '');
}

export { PRODUCTS, SELLERS, MONTHS };
