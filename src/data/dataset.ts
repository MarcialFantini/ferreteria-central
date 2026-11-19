// Deterministic fictional dataset: 24 months, 200 clients, 80 products, 6 sellers.
// Everything derives from SEED, so server render and browser hydrate see identical numbers.
import { createRng } from './rng';
import { CITY_POINTS, PROVINCE_LIST } from './argentina-geo';
import {
  CATEGORIES,
  CLIENT_KINDS,
  CLIENT_NAMES,
  PRODUCT_NAMES,
  PROVINCE_WEIGHTS,
  SELLERS,
  TERRITORY,
  type Category,
} from './catalog';

export const SEED = 20261018;
export const MONTH_COUNT = 24;
export const CLIENT_COUNT = 200;
const LEGACY = 116;

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

export interface Month {
  index: number;
  year: number;
  /** 0-based calendar month. */
  month: number;
  key: string;
  name: string;
  short: string;
  label: string;
  days: number;
}

export interface Province {
  id: string;
  name: string;
}

export interface Client {
  id: number;
  name: string;
  provinceId: string;
  city: string;
  sellerId: string;
  /** Month index of first purchase; -1 = client from before the window. */
  cohort: number;
  /** Map position (projected SVG coordinates). */
  x: number;
  y: number;
}

export interface Product {
  id: number;
  name: string;
  category: Category;
}

// Window: nov 2024 .. oct 2026 (24 closed months).
const START_YEAR = 2024;
const START_MONTH = 10;

export const MONTHS: readonly Month[] = Array.from({ length: MONTH_COUNT }, (_, index) => {
  const abs = START_MONTH + index;
  const year = START_YEAR + Math.floor(abs / 12);
  const month = abs % 12;
  const name = MONTH_NAMES[month] ?? '';
  return {
    index,
    year,
    month,
    key: `${year}-${String(month + 1).padStart(2, '0')}`,
    name,
    short: name.slice(0, 3),
    label: `${name} ${year}`,
    days: new Date(year, month + 1, 0).getDate(),
  };
});

export const PROVINCES: readonly Province[] = PROVINCE_LIST.map(({ id, name }) => ({ id, name }));

/** Seasonality by calendar month (mass consumption wholesaler: December peak, summer dip, mid-year bonus). */
const SEASON = [0.86, 0.84, 0.97, 0.96, 1.0, 1.03, 1.08, 1.0, 0.98, 1.02, 1.05, 1.24];

/** One-off events in the window so this-year and last-year curves cross. */
const EVENTS: Readonly<Record<number, number>> = {
  1: 1.16, // dic 2024: strong holiday promo
  4: 0.93, // mar 2025: supply issue
  7: 1.12, // jun 2025: aguinaldo campaign
  14: 0.9, // ene 2026: soft summer
  20: 1.06, // jul 2026
};

const rng = createRng(SEED);

const ROMAN: Readonly<Record<number, string>> = { 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI" };

function buildClients(): Client[] {
  const provinceIds = PROVINCES.map((p) => p.id);
  const weights = provinceIds.map((id) => PROVINCE_WEIGHTS[id] ?? 1);
  const used = new Set<string>();
  const clients: Client[] = [];

  for (let i = 0; i < CLIENT_COUNT; i++) {
    // First 24 clients guarantee one per province; the rest follow the weights.
    const provinceId = i < provinceIds.length ? (provinceIds[i] as string) : rng.weighted(provinceIds, weights);
    const cities = CITY_POINTS.filter((c) => c.provinceId === provinceId);
    const cityWeights = cities.map((_, k) => (k === 0 ? 3 : 1));
    const city = rng.weighted(cities, cityWeights);

    let name = `${rng.pick(CLIENT_KINDS)} ${rng.pick(CLIENT_NAMES)}`;
    // Same trade name in another branch: number it like real chains do (II, III, ...).
    const base = name;
    for (let n = 2; used.has(name); n++) name = `${base} ${ROMAN[n] ?? n}`;
    used.add(name);

    let sellerId = TERRITORY[provinceId] ?? 'lf';
    if (provinceId === 'cordoba' && city.name !== 'Córdoba') sellerId = 'mb';
    if (provinceId === 'cordoba' && city.name === 'Córdoba' && rng.next() < 0.3) sellerId = 'mb';

    // Legacy clients first, then ~3-4 new clients per month across the window.
    const cohort = i < LEGACY ? -1 : Math.floor(((i - LEGACY) / (CLIENT_COUNT - LEGACY)) * MONTH_COUNT);

    const spread = provinceId === 'caba' ? 1.2 : 4.5;
    clients.push({
      id: i + 1,
      name,
      provinceId,
      city: city.name,
      sellerId,
      cohort,
      x: +(city.x + rng.normal() * spread).toFixed(1),
      y: +(city.y + rng.normal() * spread).toFixed(1),
    });
  }
  return clients;
}

export const CLIENTS: readonly Client[] = buildClients();

export const PRODUCTS: readonly Product[] = CATEGORIES.flatMap((category, c) =>
  PRODUCT_NAMES[category].map((name, k) => ({ id: c * 10 + k + 1, name, category })),
);

/** Revenue (ARS) per client per month: CLIENT_MONTH_REVENUE[clientIndex][monthIndex]. */
function buildRevenue(): number[][] {
  const raw = CLIENTS.map((client) => {
    const size = Math.exp(rng.normal() * 0.7); // lognormal client size
    const churnRisk = rng.range(0.006, 0.034);
    let churned = false;
    return MONTHS.map((m) => {
      if (client.cohort > m.index || churned) return 0;
      const tenure = client.cohort < 0 ? 99 : m.index - client.cohort;
      // New clients churn more in their first months (the classic cohort decay).
      const hazard = tenure <= 4 ? churnRisk + 0.07 : churnRisk;
      if (client.cohort !== m.index && rng.next() < hazard) {
        churned = true;
        return 0;
      }
      const age = client.cohort < 0 ? 99 : m.index - client.cohort;
      const ramp = age === 0 ? 0.92 : age < 6 ? 1 - age * 0.025 : 0.88;
      const trend = 1 + m.index * 0.006;
      const season = SEASON[m.month] ?? 1;
      const event = EVENTS[m.index] ?? 1;
      const noise = 1 + rng.normal() * 0.08;
      return size * ramp * trend * season * event * Math.max(0.6, noise);
    });
  });

  // Scale so the last 12 months average ~ ARS 465 M per month.
  let lastYear = 0;
  for (const row of raw) for (let m = 12; m < 24; m++) lastYear += row[m] ?? 0;
  const k = (465_000_000 * 12) / lastYear;
  return raw.map((row) => row.map((v) => Math.round(v * k)));
}

export const CLIENT_MONTH_REVENUE: readonly (readonly number[])[] = buildRevenue();

/** Share of each day within each month (weekday pattern + noise), sums to 1 per month. */
export const DAY_WEIGHTS: readonly (readonly number[])[] = MONTHS.map((m) => {
  const raw = Array.from({ length: m.days }, (_, d) => {
    const weekday = new Date(m.year, m.month, d + 1).getDay();
    const base = weekday === 0 ? 0.12 : weekday === 6 ? 0.5 : weekday === 1 ? 1.18 : 1;
    const payday = d < 6 ? 1.12 : 1; // first-week restock
    return base * payday * (0.82 + rng.next() * 0.36);
  });
  const total = raw.reduce((s, v) => s + v, 0);
  return raw.map((v) => v / total);
});

/** Product mix per seller: PRODUCT_SHARE[sellerIndex][productIndex], sums to 1 per seller. */
export const PRODUCT_SHARE: readonly (readonly number[])[] = (() => {
  const popularity = PRODUCTS.map((_, i) => Math.pow(rng.range(0.15, 1), 2.2) * (i % 10 === 0 ? 2.2 : 1));
  return SELLERS.map(() => {
    const raw = popularity.map((p) => p * rng.range(0.6, 1.5));
    const total = raw.reduce((s, v) => s + v, 0);
    return raw.map((v) => v / total);
  });
})();

/** Per-product momentum for the bar race (-0.45 .. +0.7 over a period). */
export const PRODUCT_MOMENTUM: readonly number[] = PRODUCTS.map(() => rng.range(-0.45, 0.7));

/** Average order value (ARS). Order counts everywhere derive from it. */
export const AVG_TICKET = 165_000;

// ---------- Prices and margins (separate stream so the series above never change) ----------
const priceRng = createRng(SEED + 1);

const CATEGORY_ECONOMICS: Readonly<Record<Category, { min: number; max: number; margin: number }>> = {
  Almacén: { min: 9_000, max: 28_000, margin: 0.17 },
  Bebidas: { min: 12_000, max: 36_000, margin: 0.22 },
  Lácteos: { min: 10_000, max: 30_000, margin: 0.14 },
  Limpieza: { min: 8_000, max: 30_000, margin: 0.28 },
  Perfumería: { min: 10_000, max: 40_000, margin: 0.31 },
  Golosinas: { min: 6_000, max: 24_000, margin: 0.29 },
  Desayuno: { min: 9_000, max: 38_000, margin: 0.2 },
  Congelados: { min: 14_000, max: 45_000, margin: 0.24 },
};

/** Price per bulk unit (ARS). */
export const PRODUCT_PRICE: readonly number[] = PRODUCTS.map((p) => {
  const e = CATEGORY_ECONOMICS[p.category];
  return Math.round(priceRng.range(e.min, e.max) / 50) * 50;
});

/** Gross margin ratio per product. */
export const PRODUCT_MARGIN: readonly number[] = PRODUCTS.map((p) =>
  Math.max(0.06, CATEGORY_ECONOMICS[p.category].margin + priceRng.normal() * 0.035),
);

