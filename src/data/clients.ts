// Client analytics: period revenue, trend, last purchase, churn risk, top products.
import { CLIENTS, CLIENT_MONTH_REVENUE, MONTHS, PRODUCTS, PROVINCES, type Client } from './dataset';
import { SELLERS } from './catalog';
import { clientIndexes, periodMonths, sumMonths, type Filters, type Period } from './selectors';
import { clientMonthOrders, orderItems, type HistoryOrder } from './history';

export type Risk = 'Alto' | 'Medio' | 'Bajo' | 'Nuevo' | 'Perdido';

export interface ClientRow {
  index: number;
  client: Client;
  provinceName: string;
  sellerName: string;
  revenue: number;
  previous: number;
  change: number | null;
  trend: number[];
  lastOrder: HistoryOrder | null;
  risk: Risk;
}

const LAST = MONTHS.length - 1;

export function churnRisk(index: number): { risk: Risk; reason: string } {
  const row = CLIENT_MONTH_REVENUE[index] ?? [];
  const c = CLIENTS[index];
  const last3 = (row[LAST] ?? 0) + (row[LAST - 1] ?? 0) + (row[LAST - 2] ?? 0);
  const prev3 = (row[LAST - 3] ?? 0) + (row[LAST - 4] ?? 0) + (row[LAST - 5] ?? 0);
  if (last3 === 0 && prev3 === 0 && (c?.cohort ?? -1) < LAST - 5) return { risk: 'Perdido', reason: 'Sin compras en los últimos 6 meses.' };
  if (c && c.cohort >= LAST - 2) return { risk: 'Nuevo', reason: 'Se dio de alta en los últimos 3 meses.' };
  if ((row[LAST] ?? 0) === 0) return { risk: 'Alto', reason: 'No compró el último mes.' };
  if (prev3 > 0 && last3 < prev3 * 0.6) return { risk: 'Alto', reason: `Facturó ${Math.round((1 - last3 / prev3) * 100)} % menos que el trimestre anterior.` };
  if (prev3 > 0 && last3 < prev3 * 0.85) return { risk: 'Medio', reason: `Viene bajando: ${Math.round((1 - last3 / prev3) * 100)} % menos que el trimestre anterior.` };
  return { risk: 'Bajo', reason: 'Compra con regularidad y sostiene su volumen.' };
}

export function lastOrderOf(index: number): HistoryOrder | null {
  for (let m = LAST; m >= 0; m--) {
    const orders = clientMonthOrders(index, m);
    if (orders.length) return orders[orders.length - 1] ?? null;
  }
  return null;
}

const previousMonths = (period: Period) => periodMonths(period).map((m) => m - PERIOD_SHIFT[period]);
const PERIOD_SHIFT: Readonly<Record<Period, number>> = { mes: 1, trimestre: 3, anio: 12 };

export function clientRows(filters: Filters): ClientRow[] {
  const months = periodMonths(filters.period);
  const prev = previousMonths(filters.period);
  return clientIndexes(filters).map((i) => {
    const client = CLIENTS[i] as Client;
    const series = CLIENT_MONTH_REVENUE[i] ?? [];
    const revenue = sumMonths(series, months);
    const previous = sumMonths(series, prev);
    return {
      index: i,
      client,
      provinceName: PROVINCES.find((p) => p.id === client.provinceId)?.name ?? '',
      sellerName: SELLERS.find((s) => s.id === client.sellerId)?.name ?? '',
      revenue,
      previous,
      change: previous > 0 ? revenue / previous - 1 : null,
      trend: series.slice(-12) as number[],
      lastOrder: lastOrderOf(i),
      risk: churnRisk(i).risk,
    };
  });
}

/** Top products for one client over the last 12 months (from its order lines). */
export function clientTopProducts(index: number, n = 6): { product: number; name: string; category: string; revenue: number; units: number }[] {
  const acc = new Map<number, { revenue: number; units: number }>();
  for (let m = LAST - 11; m <= LAST; m++) {
    for (const o of clientMonthOrders(index, m)) {
      for (const it of orderItems(o)) {
        const cur = acc.get(it.product) ?? { revenue: 0, units: 0 };
        cur.revenue += it.qty * it.price;
        cur.units += it.qty;
        acc.set(it.product, cur);
      }
    }
  }
  return [...acc.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, n)
    .map(([product, v]) => ({ product, name: PRODUCTS[product]?.name ?? '', category: PRODUCTS[product]?.category ?? '', ...v }));
}

export function clientHistory(index: number, months = 24): HistoryOrder[] {
  const out: HistoryOrder[] = [];
  for (let m = Math.max(0, LAST - months + 1); m <= LAST; m++) out.push(...clientMonthOrders(index, m));
  return out;
}

export const RISK_ORDER: Readonly<Record<Risk, number>> = { Alto: 0, Medio: 1, Nuevo: 2, Bajo: 3, Perdido: 4 };
