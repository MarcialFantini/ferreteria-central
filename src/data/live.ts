// Live day generator: every business day of the live month has a deterministic stream of orders.
// The simulation engine reveals them minute by minute, so "today" is reproducible and resumable.
import { createRng } from './rng';
import { AVG_TICKET, CLIENTS, CLIENT_MONTH_REVENUE, MONTHS, PRODUCTS, PRODUCT_PRICE, PRODUCT_SHARE, SEED } from './dataset';
import { SELLERS } from './catalog';

/** Live month: the one right after the 24-month window (November 2026). */
export const LIVE_YEAR = 2026;
export const LIVE_MONTH = 10;
export const LIVE_DAYS = 30;
/** Business hours, in minutes since midnight. */
export const DAY_START = 8 * 60;
export const DAY_END = 20 * 60;
/** Day the demo opens on (0-based: 17 = 18 Nov). */
export const FIRST_LIVE_DAY = 17;

export interface OrderItem {
  product: number;
  qty: number;
  price: number;
}

export interface LiveOrder {
  id: number;
  day: number;
  minute: number;
  client: number;
  sellerId: string;
  provinceId: string;
  city: string;
  x: number;
  y: number;
  items: OrderItem[];
  total: number;
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export const dateOf = (day: number): Date => new Date(LIVE_YEAR, LIVE_MONTH, day + 1);

export function dayLabel(day: number): string {
  const d = dateOf(day);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${d.toLocaleDateString('es-AR', { month: 'long' })}`;
}

export const clockLabel = (minute: number): string => {
  const m = Math.max(0, Math.floor(minute));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** Intraday profile: morning restock peak and an afternoon one. */
function intraday(minute: number): number {
  const h = minute / 60;
  return 0.25 + Math.exp(-((h - 10.5) ** 2) / 2.2) + 0.8 * Math.exp(-((h - 16.5) ** 2) / 2.6);
}

const last = MONTHS.length - 1;
const clientWeights = CLIENTS.map((_, i) => {
  const a = CLIENT_MONTH_REVENUE[i]?.[last] ?? 0;
  const b = CLIENT_MONTH_REVENUE[i]?.[last - 1] ?? 0;
  return a > 0 ? a : b * 0.3;
});
const weightTotal = clientWeights.reduce((s, w) => s + w, 0);
const lastMonthTotal = CLIENT_MONTH_REVENUE.reduce((s, row) => s + (row[last] ?? 0), 0);

/** Expected live-month revenue: last month with a small seasonal lift. */
export const LIVE_MONTH_TARGET = Math.round(lastMonthTotal * 1.05);

function weekdayFactor(day: number): number {
  const wd = dateOf(day).getDay();
  return wd === 0 ? 0.15 : wd === 6 ? 0.55 : wd === 1 ? 1.15 : 1;
}
const factorSum = Array.from({ length: LIVE_DAYS }, (_, d) => weekdayFactor(d)).reduce((s, v) => s + v, 0);

const cache = new Map<number, LiveOrder[]>();

function pickClient(r: () => number): number {
  let t = r() * weightTotal;
  for (let i = 0; i < clientWeights.length; i++) {
    t -= clientWeights[i] ?? 0;
    if (t <= 0) return i;
  }
  return clientWeights.length - 1;
}

export function generateDay(day: number): LiveOrder[] {
  const hit = cache.get(day);
  if (hit) return hit;
  const rng = createRng(SEED ^ ((day + 1) * 7919));
  const target = (LIVE_MONTH_TARGET * weekdayFactor(day)) / factorSum;
  const count = Math.max(4, Math.round((target / AVG_TICKET) * (0.9 + rng.next() * 0.2)));

  // Minutes from the intraday profile (rejection sampling keeps it simple and deterministic).
  const minutes: number[] = [];
  while (minutes.length < count) {
    const m = DAY_START + rng.next() * (DAY_END - DAY_START);
    if (rng.next() * 1.3 < intraday(m)) minutes.push(m);
  }
  minutes.sort((a, b) => a - b);

  const orders = minutes.map((minute, i) => {
    const client = pickClient(rng.next);
    const c = CLIENTS[client];
    const si = Math.max(
      0,
      SELLERS.findIndex((s) => s.id === c?.sellerId),
    );
    const share = PRODUCT_SHARE[si] ?? [];
    const ticket = AVG_TICKET * Math.exp(rng.normal() * 0.55) * 0.86;
    const lines = rng.int(1, 4);
    const items: OrderItem[] = [];
    for (let k = 0; k < lines; k++) {
      let t = rng.next();
      let product = 0;
      for (let p = 0; p < PRODUCTS.length; p++) {
        t -= share[p] ?? 0;
        if (t <= 0) {
          product = p;
          break;
        }
      }
      if (items.some((it) => it.product === product)) continue;
      const price = PRODUCT_PRICE[product] ?? 10_000;
      items.push({ product, qty: Math.max(1, Math.round(ticket / lines / price)), price });
    }
    const total = items.reduce((s, it) => s + it.qty * it.price, 0);
    return {
      id: 61_000 + day * 400 + i,
      day,
      minute,
      client,
      sellerId: c?.sellerId ?? 'lf',
      provinceId: c?.provinceId ?? 'cordoba',
      city: c?.city ?? '',
      x: c?.x ?? 0,
      y: c?.y ?? 0,
      items,
      total,
    };
  });
  cache.set(day, orders);
  return orders;
}

/** Orders of a day placed up to (and including) a minute. */
export const ordersUntil = (day: number, minute: number): LiveOrder[] => generateDay(day).filter((o) => o.minute <= minute);

/** Cumulative revenue sampled every `step` minutes from DAY_START to `until`. */
export function cumulativeCurve(day: number, until: number, step = 10): { minute: number; value: number }[] {
  const orders = generateDay(day);
  const out: { minute: number; value: number }[] = [];
  let acc = 0;
  let k = 0;
  for (let m = DAY_START; m <= until + 0.001; m += step) {
    while (k < orders.length && (orders[k]?.minute ?? Infinity) <= m) acc += orders[k++]?.total ?? 0;
    out.push({ minute: m, value: acc });
  }
  return out;
}

export const sumTotals = (orders: readonly LiveOrder[]): number => orders.reduce((s, o) => s + o.total, 0);
