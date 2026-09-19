#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * DatosPyme — Deterministic sales mock generator.
 *
 * Produces TWO artifacts:
 *
 *   src/data/sales-daily.json   (~1 MB)  — raw daily transactions, kept as
 *                                          source-of-truth. Demonstrates
 *                                          daily granularity. NOT imported
 *                                          by the dashboard bundle.
 *
 *   src/data/dashboard-data.json (~25 KB) — pre-aggregated monthly slices
 *                                          plus the product catalog. This
 *                                          is the only file the dashboard
 *                                          imports. Same numbers as the
 *                                          raw file, just summarised.
 *
 * Same seed → same numbers on every build, so the bar chart, line chart,
 * donut and table stay consistent.
 *
 * Run:  node scripts/generate-sales.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- Deterministic PRNG (Mulberry32) ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20240917); // fixed seed → reproducible dataset
const gauss = () => {
  // Box–Muller
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// ---------- Catalog ----------
const PRODUCTS = [
  { sku: 'P-001', name: 'Cuaderno universitario 100h',     category: 'Cuadernos y papelería', price: 4500,  weight: 1.30 },
  { sku: 'P-002', name: 'Cuaderno escolar 50h',            category: 'Cuadernos y papelería', price: 2800,  weight: 1.20 },
  { sku: 'P-003', name: 'Resma A4 500h',                   category: 'Cuadernos y papelería', price: 9800,  weight: 0.75 },
  { sku: 'P-004', name: 'Carpeta N°3',                     category: 'Cuadernos y papelería', price: 1900,  weight: 0.90 },

  { sku: 'P-005', name: 'Bolígrafo azul BIC x12',          category: 'Útiles escolares',      price: 3600,  weight: 1.45 },
  { sku: 'P-006', name: 'Lápiz negro Faber x12',           category: 'Útiles escolares',      price: 4200,  weight: 1.20 },
  { sku: 'P-007', name: 'Set marcadores Faber x10',        category: 'Útiles escolares',      price: 6800,  weight: 0.85 },
  { sku: 'P-008', name: 'Calculadora científica Casio FX', category: 'Útiles escolares',      price: 38500, weight: 0.30 },
  { sku: 'P-009', name: 'Mochila escolar reforzada',       category: 'Útiles escolares',      price: 32000, weight: 0.45 },
  { sku: 'P-010', name: 'Stickers pack x100',              category: 'Útiles escolares',      price: 2400,  weight: 0.55 },

  { sku: 'P-011', name: 'Acuarelas x12',                   category: 'Arte y manualidades',   price: 5800,  weight: 0.50 },
  { sku: 'P-012', name: 'Temperas x6',                     category: 'Arte y manualidades',   price: 4900,  weight: 0.40 },
  { sku: 'P-013', name: 'Lápices de colores x24',          category: 'Arte y manualidades',   price: 8200,  weight: 0.55 },

  { sku: 'P-014', name: 'Diccionario escolar',             category: 'Libros',                price: 14500, weight: 0.35 },
  { sku: 'P-015', name: 'Atlas escolar',                   category: 'Libros',                price: 11800, weight: 0.25 },
  { sku: 'P-016', name: '"Cuentos para dormir"',           category: 'Libros',                price: 7900,  weight: 0.55 },
  { sku: 'P-017', name: '"El Quijote" — edición escolar',  category: 'Libros',                price: 8900,  weight: 0.40 },
  { sku: 'P-018', name: '"Rayuela" — Cortázar',            category: 'Libros',                price: 12500, weight: 0.25 },
  { sku: 'P-019', name: 'Manual Lengua 6° grado',          category: 'Libros',                price: 10200, weight: 0.90 },
  { sku: 'P-020', name: 'Manual Matemática 6° grado',      category: 'Libros',                price: 10200, weight: 0.95 },
];

const CATEGORIES = ['Cuadernos y papelería', 'Útiles escolares', 'Arte y manualidades', 'Libros'];

// ---------- Date range: last 14 months through a fixed "yesterday" ----------
// We pin "yesterday" to a fixed date so the dataset is stable across runs.
const today = new Date('2025-10-15T12:00:00Z');
today.setUTCHours(12, 0, 0, 0);
const yesterday = new Date(today);
yesterday.setUTCDate(yesterday.getUTCDate() - 1);

const start = new Date(yesterday);
start.setUTCMonth(start.getUTCMonth() - 14); // 14 months back

const DAY_MS = 24 * 60 * 60 * 1000;
const totalDays = Math.round((yesterday - start) / DAY_MS) + 1;

// ---------- Seasonality (Argentine school calendar) ----------
function seasonalMultiplier(date, product) {
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const isTextbook = product.sku === 'P-019' || product.sku === 'P-020';
  const isSchoolSupply =
    product.category === 'Cuadernos y papelería' || product.category === 'Útiles escolares';

  if (isTextbook) {
    if (m === 1 && d >= 20) return 5.0;   // late Feb textbook rush
    if (m === 2 && d <= 15) return 4.5;
    if (m === 2) return 2.0;
    if (m === 6 || m === 7) return 0.4;   // summer break
    return 0.9;
  }

  if (isSchoolSupply) {
    if (m === 1 && d >= 20) return 3.5;
    if (m === 2 && d <= 15) return 3.2;
    if (m === 2) return 1.8;
    if (m === 1) return 1.5;
    if (m === 6 || m === 7) return 0.5;
    return 1.0;
  }

  if (m === 6 || m === 7) return 1.4;     // winter holidays
  if (m === 11 && d >= 15) return 1.8;    // Christmas gifting
  return 1.0;
}

function dayOfWeekMultiplier(date) {
  const dow = date.getUTCDay();
  if (dow === 0) return 0.30;             // closed on Sundays
  if (dow === 6) return 1.55;             // Saturdays are busy
  if (dow === 5) return 1.20;
  return 1.0;
}

// ---------- Generation ----------
const dailyRows = [];
const monthlyTotals = new Map();   // monthStart -> { revenue, units, orders, productSet, daySet }
const productMonthly = new Map();  // `${monthStart}|${sku}` -> { monthStart, sku, revenue, units }
const categoryMonthly = new Map(); // `${monthStart}|${category}` -> { monthStart, category, revenue, units }
const weeklyTotals = new Map();    // weekStart (Monday) -> { revenue, units, orders, productSet, daySet }
const productWeekly = new Map();   // `${weekStart}|${sku}` -> { ... }
const categoryWeekly = new Map();  // `${weekStart}|${category}` -> { ... }

let totalUnits = 0;

for (let i = 0; i < totalDays; i++) {
  const date = new Date(start.getTime() + i * DAY_MS);
  const dateStr = date.toISOString().slice(0, 10);
  const monthStart = dateStr.slice(0, 7) + '-01';
  const dowMult = dayOfWeekMultiplier(date);

  // ISO week starts Monday — get Monday of the current week
  const dow = date.getUTCDay(); // 0 = Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(date);
  monday.setUTCDate(monday.getUTCDate() + mondayOffset);
  const weekStart = monday.toISOString().slice(0, 10);

  const wt = weeklyTotals.get(weekStart) ?? {
    weekStart,
    revenue: 0,
    units: 0,
    orders: 0,
    productSet: new Set(),
    daySet: new Set(),
  };
  wt.daySet.add(dateStr);

  // Touch monthly totals so empty months still appear with zero values.
  const mt = monthlyTotals.get(monthStart) ?? {
    monthStart,
    revenue: 0,
    units: 0,
    orders: 0,
    productSet: new Set(),
    daySet: new Set(),
  };
  mt.daySet.add(dateStr);

  for (const product of PRODUCTS) {
    const season = seasonalMultiplier(date, product);
    const noise = 1 + 0.35 * gauss();
    const lambda = product.weight * season * dowMult * noise;

    let units = Math.max(0, Math.round(lambda + gauss() * Math.sqrt(lambda + 0.5)));
    if (units === 0 && rand() < lambda * 0.18) units = 1; // keep tail alive

    if (units > 0) {
      const revenue = units * product.price;

      dailyRows.push({
        date: dateStr,
        sku: product.sku,
        name: product.name,
        category: product.category,
        units,
        unitPrice: product.price,
        revenue,
      });

      mt.revenue += revenue;
      mt.units += units;
      mt.orders += 1;
      mt.productSet.add(product.sku);

      wt.revenue += revenue;
      wt.units += units;
      wt.orders += 1;
      wt.productSet.add(product.sku);

      const pmKey = `${monthStart}|${product.sku}`;
      const pm = productMonthly.get(pmKey) ?? {
        monthStart,
        sku: product.sku,
        name: product.name,
        category: product.category,
        revenue: 0,
        units: 0,
      };
      pm.revenue += revenue;
      pm.units += units;
      productMonthly.set(pmKey, pm);

      const cmKey = `${monthStart}|${product.category}`;
      const cm = categoryMonthly.get(cmKey) ?? {
        monthStart,
        category: product.category,
        revenue: 0,
        units: 0,
      };
      cm.revenue += revenue;
      cm.units += units;
      categoryMonthly.set(cmKey, cm);

      // Weekly slices
      const pwKey = `${weekStart}|${product.sku}`;
      const pw = productWeekly.get(pwKey) ?? {
        weekStart,
        sku: product.sku,
        name: product.name,
        category: product.category,
        revenue: 0,
        units: 0,
      };
      pw.revenue += revenue;
      pw.units += units;
      productWeekly.set(pwKey, pw);

      const cwKey = `${weekStart}|${product.category}`;
      const cw = categoryWeekly.get(cwKey) ?? {
        weekStart,
        category: product.category,
        revenue: 0,
        units: 0,
      };
      cw.revenue += revenue;
      cw.units += units;
      categoryWeekly.set(cwKey, cw);

      totalUnits += units;
    }
  }

  monthlyTotals.set(monthStart, mt);
  weeklyTotals.set(weekStart, wt);
}

// Finalise monthly totals: drop Set objects, replace with counts.
const monthlyTotalsList = Array.from(monthlyTotals.values())
  .sort((a, b) => (a.monthStart < b.monthStart ? -1 : 1))
  .map(({ monthStart, revenue, units, orders, productSet, daySet }) => ({
    monthStart,
    revenue,
    units,
    orders,
    uniqueProducts: productSet.size,
    uniqueDays: daySet.size,
  }));

const productMonthlyList = Array.from(productMonthly.values()).sort((a, b) => {
  if (a.monthStart !== b.monthStart) return a.monthStart < b.monthStart ? -1 : 1;
  return b.revenue - a.revenue;
});

const categoryMonthlyList = Array.from(categoryMonthly.values()).sort((a, b) => {
  if (a.monthStart !== b.monthStart) return a.monthStart < b.monthStart ? -1 : 1;
  return b.revenue - a.revenue;
});

const weeklyTotalsList = Array.from(weeklyTotals.values())
  .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))
  .map(({ weekStart, revenue, units, orders, productSet, daySet }) => ({
    weekStart,
    revenue,
    units,
    orders,
    uniqueProducts: productSet.size,
    uniqueDays: daySet.size,
  }));

const productWeeklyList = Array.from(productWeekly.values()).sort((a, b) => {
  if (a.weekStart !== b.weekStart) return a.weekStart < b.weekStart ? -1 : 1;
  return b.revenue - a.revenue;
});

const categoryWeeklyList = Array.from(categoryWeekly.values()).sort((a, b) => {
  if (a.weekStart !== b.weekStart) return a.weekStart < b.weekStart ? -1 : 1;
  return b.revenue - a.revenue;
});

// Trim weekly slices to cover only the last ~16 weeks (longer than the
// "last quarter" view), so older history ships only as monthly aggregates.
// This keeps the dashboard bundle lean.
const WEEKLY_KEEP_WEEKS = 16;
const sortedWeeks = weeklyTotalsList.map((w) => w.weekStart).sort();
const keptWeeks = new Set(sortedWeeks.slice(-WEEKLY_KEEP_WEEKS));

const weeklyTotalsTrimmed = weeklyTotalsList.filter((w) => keptWeeks.has(w.weekStart));
const productWeeklyTrimmed = productWeeklyList.filter((p) => keptWeeks.has(p.weekStart));
const categoryWeeklyTrimmed = categoryWeeklyList.filter((c) => keptWeeks.has(c.weekStart));

const productsCatalog = PRODUCTS.map(({ sku, name, category, price }) => ({
  sku,
  name,
  category,
  price,
}));

// ---------- Outputs ----------
const dataDir = resolve(__dirname, '..', 'src', 'data');
await mkdir(dataDir, { recursive: true });

// 1) Daily source-of-truth — kept for reference, NOT bundled.
const dailyPayload = {
  generatedAt: today.toISOString(),
  rangeStart: start.toISOString().slice(0, 10),
  rangeEnd: yesterday.toISOString().slice(0, 10),
  totalDays,
  totalRows: dailyRows.length,
  totalUnits,
  categories: CATEGORIES,
  products: productsCatalog,
  sales: dailyRows,
};
const dailyPath = resolve(dataDir, 'sales-daily.json');
await writeFile(dailyPath, JSON.stringify(dailyPayload, null, 2));

// 2) Pre-aggregated dashboard payload — the only file imported by the app.
const dashboardPayload = {
  generatedAt: today.toISOString(),
  rangeStart: start.toISOString().slice(0, 10),
  rangeEnd: yesterday.toISOString().slice(0, 10),
  totalDays,
  totalUnits,
  categories: CATEGORIES,
  products: productsCatalog,
  monthlyTotals: monthlyTotalsList,
  productMonthly: productMonthlyList,
  categoryMonthly: categoryMonthlyList,
  weeklyTotals: weeklyTotalsTrimmed,
  productWeekly: productWeeklyTrimmed,
  categoryWeekly: categoryWeeklyTrimmed,
};
const dashboardPath = resolve(dataDir, 'dashboard-data.json');
await writeFile(dashboardPath, JSON.stringify(dashboardPayload, null, 2));

console.log(`Wrote ${dailyPath}`);
console.log(`  range: ${dashboardPayload.rangeStart} → ${dashboardPayload.rangeEnd} (${totalDays} days)`);
console.log(`  rows:  ${dailyRows.length}  units: ${totalUnits.toLocaleString('es-AR')}`);
console.log(`Wrote ${dashboardPath}`);
console.log(`  monthly slices:     ${monthlyTotalsList.length}`);
console.log(`  product × month:    ${productMonthlyList.length}`);
console.log(`  category × month:   ${categoryMonthlyList.length}`);
console.log(`  weekly slices (kept): ${weeklyTotalsTrimmed.length}`);
console.log(`  product × week (kept): ${productWeeklyTrimmed.length}`);
console.log(`  category × week (kept): ${categoryWeeklyTrimmed.length}`);
