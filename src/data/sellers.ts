// Seller analytics for the leaderboard and the per-seller page.
import { CLIENTS, CLIENT_MONTH_REVENUE, MONTHS, PROVINCES } from './dataset';
import { SELLERS, type Seller } from './catalog';
import { AVG_TICKET } from './dataset';
import { clientIndexes, monthlyRevenue, periodMonths, sumMonths, type Filters, type Period } from './selectors';
import { DAY_END, DAY_START, LIVE_DAYS, dateOf } from './live';

const SHIFT: Readonly<Record<Period, number>> = { mes: 1, trimestre: 3, anio: 12 };

export interface SellerStats {
  seller: Seller;
  revenue: number;
  previous: number;
  change: number | null;
  clients: number;
  orders: number;
  series: number[];
  provinces: string[];
}

export function sellerStats(filters: Filters): SellerStats[] {
  const months = periodMonths(filters.period);
  const prev = months.map((m) => m - SHIFT[filters.period]);
  return SELLERS.map((seller) => {
    const seg = { seller: seller.id, province: filters.province };
    const series = monthlyRevenue(seg);
    const revenue = sumMonths(series, months);
    const previous = sumMonths(series, prev);
    const idx = clientIndexes(seg);
    return {
      seller,
      revenue,
      previous,
      change: previous > 0 ? revenue / previous - 1 : null,
      clients: idx.filter((i) => months.some((m) => (CLIENT_MONTH_REVENUE[i]?.[m] ?? 0) > 0)).length,
      orders: Math.round(revenue / AVG_TICKET),
      series,
      provinces: [...new Set(idx.map((i) => CLIENTS[i]?.provinceId ?? ''))],
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

export function sellerTopClients(sellerId: string, n = 8) {
  const last = MONTHS.length - 1;
  return clientIndexes({ seller: sellerId, province: 'all' })
    .map((i) => {
      const row = CLIENT_MONTH_REVENUE[i] ?? [];
      return {
        index: i,
        client: CLIENTS[i]!,
        revenue: row.slice(last - 11).reduce((s, v) => s + v, 0),
        lastMonth: row[last] ?? 0,
        province: PROVINCES.find((p) => p.id === CLIENTS[i]?.provinceId)?.name ?? '',
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, n);
}

/** Business-day progress of the live month at (day, minute): elapsed / total weighted days. */
export function monthProgress(day: number, minute: number): number {
  const weight = (d: number) => {
    const wd = dateOf(d).getDay();
    return wd === 0 ? 0.15 : wd === 6 ? 0.55 : 1;
  };
  let total = 0;
  let elapsed = 0;
  for (let d = 0; d < LIVE_DAYS; d++) {
    total += weight(d);
    if (d < day) elapsed += weight(d);
    if (d === day) elapsed += weight(d) * Math.max(0, Math.min(1, (minute - DAY_START) / (DAY_END - DAY_START)));
  }
  return elapsed / total;
}

export const initials = (name: string): string =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
