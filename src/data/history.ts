// Order-level history derived from the monthly client revenue (sums match the monthly figures).
// Generated on demand: views ask only for the months or clients they show.
import { createRng, hashNoise } from './rng';
import { AVG_TICKET, CLIENTS, CLIENT_MONTH_REVENUE, MONTHS, PRODUCTS, PRODUCT_PRICE, PRODUCT_SHARE, SEED } from './dataset';
import { SELLERS } from './catalog';
import type { OrderItem } from './live';

export type OrderStatus = 'Entregado' | 'En camino' | 'Preparando' | 'Facturado';

export interface HistoryOrder {
  id: number;
  month: number;
  dayOfMonth: number;
  client: number;
  sellerId: string;
  provinceId: string;
  total: number;
  lines: number;
  status: OrderStatus;
  /** Sortable key: yyyymmdd. */
  dateKey: number;
}

const perClientMonth = new Map<string, HistoryOrder[]>();

export function clientMonthOrders(client: number, month: number): HistoryOrder[] {
  const key = `${client}:${month}`;
  const hit = perClientMonth.get(key);
  if (hit) return hit;
  const revenue = CLIENT_MONTH_REVENUE[client]?.[month] ?? 0;
  const c = CLIENTS[client];
  const m = MONTHS[month];
  if (revenue <= 0 || !c || !m) {
    perClientMonth.set(key, []);
    return [];
  }
  const rng = createRng(SEED ^ (client * 92821 + month * 613));
  const n = Math.max(1, Math.min(40, Math.round((revenue / AVG_TICKET) * (0.85 + rng.next() * 0.3))));
  const weights = Array.from({ length: n }, () => 0.4 + rng.next());
  const wsum = weights.reduce((s, w) => s + w, 0);
  const days = Array.from({ length: n }, () => rng.int(1, m.days)).sort((a, b) => a - b);
  const recent = month >= MONTHS.length - 1;
  const orders = weights.map((w, i) => {
    const dayOfMonth = days[i] ?? 1;
    const status: OrderStatus = recent && dayOfMonth > m.days - 3 ? (rng.next() < 0.5 ? 'En camino' : 'Preparando') : 'Entregado';
    return {
      id: 10_000 + month * 2_000 + client * 9 + i,
      month,
      dayOfMonth,
      client,
      sellerId: c.sellerId,
      provinceId: c.provinceId,
      total: Math.round((revenue * w) / wsum),
      lines: rng.int(1, 5),
      status,
      dateKey: m.year * 10_000 + (m.month + 1) * 100 + dayOfMonth,
    };
  });
  perClientMonth.set(key, orders);
  return orders;
}

export function monthsOrders(months: readonly number[], clients?: readonly number[]): HistoryOrder[] {
  const list = clients ?? CLIENTS.map((_, i) => i);
  const out: HistoryOrder[] = [];
  for (const m of months) for (const c of list) out.push(...clientMonthOrders(c, m));
  return out;
}

/** Line items for a historical order (stable per order id, priced from the catalogue). */
export function orderItems(order: Pick<HistoryOrder, 'id' | 'sellerId' | 'total' | 'lines'>): OrderItem[] {
  const si = Math.max(
    0,
    SELLERS.findIndex((s) => s.id === order.sellerId),
  );
  const share = PRODUCT_SHARE[si] ?? [];
  const items: OrderItem[] = [];
  for (let k = 0; k < order.lines; k++) {
    let t = hashNoise(order.id, k, 7);
    let product = 0;
    for (let p = 0; p < PRODUCTS.length; p++) {
      t -= share[p] ?? 0;
      if (t <= 0) {
        product = p;
        break;
      }
    }
    if (items.some((it) => it.product === product)) continue;
    items.push({ product, qty: 1, price: PRODUCT_PRICE[product] ?? 10_000 });
  }
  // Spread the order total across lines, rounding quantities to whole bulk units.
  const per = order.total / Math.max(1, items.length);
  return items.map((it) => ({ ...it, qty: Math.max(1, Math.round(per / it.price)) }));
}

export const orderDate = (o: Pick<HistoryOrder, 'month' | 'dayOfMonth'>): string => {
  const m = MONTHS[o.month];
  return m ? `${String(o.dayOfMonth).padStart(2, '0')}/${String(m.month + 1).padStart(2, '0')}/${m.year}` : '';
};
