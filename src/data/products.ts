// Product performance: revenue, margin, units and ABC class for the selected filters.
import { MONTHS, PRODUCTS, PRODUCT_MARGIN, PRODUCT_PRICE, PRODUCT_SHARE, type Product } from './dataset';
import { SELLERS } from './catalog';
import { monthlyRevenue, periodMonths, type Filters, type Period } from './selectors';
import { hashNoise } from './rng';

export type AbcClass = 'A' | 'B' | 'C';

export interface ProductRow {
  index: number;
  product: Product;
  revenue: number;
  previous: number;
  change: number | null;
  margin: number;
  marginPct: number;
  units: number;
  price: number;
  trend: number[];
  abc: AbcClass;
  cumShare: number;
  bySeller: { id: string; name: string; revenue: number }[];
}

const SHIFT: Readonly<Record<Period, number>> = { mes: 1, trimestre: 3, anio: 12 };

/** Revenue matrix [product][month] for the filter's sellers/province. */
function productMonthly(filters: Filters): { total: number[][]; bySeller: Map<string, number[][]> } {
  const sellers = SELLERS.filter((s) => filters.seller === 'all' || s.id === filters.seller);
  const total = PRODUCTS.map(() => MONTHS.map(() => 0));
  const bySeller = new Map<string, number[][]>();
  for (const s of sellers) {
    const si = SELLERS.indexOf(s);
    const series = monthlyRevenue({ seller: s.id, province: filters.province });
    const mat = PRODUCTS.map((_, p) =>
      MONTHS.map((m) => {
        // Product-month wobble keeps trends from being identical copies of the seller curve.
        const wobble = 0.82 + hashNoise(p, m.index, si) * 0.36;
        return (series[m.index] ?? 0) * importShare(si, p) * wobble;
      }),
    );
    bySeller.set(s.id, mat);
    mat.forEach((row, p) => row.forEach((v, m) => ((total[p] as number[])[m] = (total[p]?.[m] ?? 0) + v)));
  }
  return { total, bySeller };
}

const importShare = (si: number, p: number) => PRODUCT_SHARE[si]?.[p] ?? 0;

export function productRows(filters: Filters): ProductRow[] {
  const months = periodMonths(filters.period);
  const prev = months.map((m) => m - SHIFT[filters.period]);
  const { total, bySeller } = productMonthly(filters);
  const sum = (row: number[], ms: number[]) => ms.reduce((s, m) => s + (row[m] ?? 0), 0);
  const rows = PRODUCTS.map((product, p) => {
    const row = total[p] ?? [];
    const revenue = sum(row, months);
    const previous = sum(row, prev);
    const marginPct = PRODUCT_MARGIN[p] ?? 0.2;
    const price = PRODUCT_PRICE[p] ?? 10_000;
    return {
      index: p,
      product,
      revenue,
      previous,
      change: previous > 0 ? revenue / previous - 1 : null,
      margin: revenue * marginPct,
      marginPct,
      units: Math.round(revenue / price),
      price,
      trend: row.slice(-12),
      abc: 'C' as AbcClass,
      cumShare: 0,
      bySeller: [...bySeller.entries()].map(([id, mat]) => ({
        id,
        name: SELLERS.find((s) => s.id === id)?.name ?? id,
        revenue: sum(mat[p] ?? [], months),
      })),
    };
  });
  // ABC: cumulative share of revenue, sorted descending (A ≤ 80 %, B ≤ 95 %).
  const grand = rows.reduce((s, r) => s + r.revenue, 0) || 1;
  let acc = 0;
  [...rows]
    .sort((a, b) => b.revenue - a.revenue)
    .forEach((r) => {
      acc += r.revenue;
      r.cumShare = acc / grand;
      r.abc = r.cumShare <= 0.8 ? 'A' : r.cumShare <= 0.95 ? 'B' : 'C';
    });
  return rows;
}
