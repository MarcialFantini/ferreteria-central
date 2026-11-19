// "Productos": Pareto/ABC chart, sortable catalogue table and a product detail drawer.
import { productRows, type ProductRow } from '../../data/products';
import { periodTitle } from '../../data/selectors';
import { miniSpark } from '../../render/sparkline';
import { formatCompact, formatInt, formatMoney, formatPercent, formatSignedPercent } from '../../lib/format';
import { store } from '../store';
import { createTable, esc } from '../table';
import { downloadCSV } from '../csv';
import { toast } from '../notify';
import { observeResize } from '../lifecycle';
import { openDrawer } from '../drawer';
import { hideTip, showTip } from '../tooltip';
import { setViewActions } from '../view-actions';
import { engine } from '../engine';

const abcTag = (c: string) => `<span class="tag${c === 'A' ? ' tag--solid' : c === 'B' ? ' tag--hot' : ' tag--muted'}">${c}</span>`;

function paretoSVG(rows: ProductRow[], width: number, height: number): string {
  const sorted = [...rows].sort((a, b) => b.revenue - a.revenue);
  const m = { top: 16, right: 44, bottom: 24, left: 4 };
  const w = width - m.left - m.right;
  const h = height - m.top - m.bottom;
  const max = sorted[0]?.revenue || 1;
  const bw = w / sorted.length;
  const bars = sorted
    .map((r, i) => {
      const bh = (r.revenue / max) * h;
      return `<rect class="pa-bar is-${r.abc.toLowerCase()}" data-p="${r.index}" x="${(m.left + i * bw + 1).toFixed(1)}" y="${(m.top + h - bh).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${bh.toFixed(1)}"/>`;
    })
    .join('');
  const pts = sorted.map((r, i) => `${(m.left + i * bw + bw / 2).toFixed(1)},${(m.top + h - r.cumShare * h).toFixed(1)}`).join(' ');
  const guide = (share: number, label: string) =>
    `<line class="pa-guide" x1="${m.left}" x2="${width - m.right}" y1="${(m.top + h - share * h).toFixed(1)}" y2="${(m.top + h - share * h).toFixed(1)}"/><text class="pa-label" x="${width - m.right + 6}" y="${(m.top + h - share * h + 5).toFixed(1)}">${label}</text>`;
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Curva ABC de productos" data-export="Curva ABC de productos">${guide(0.8, '80 %')}${guide(0.95, '95 %')}${bars}<polyline class="pa-line" points="${pts}"/></svg>`;
}

export function mount(main: HTMLElement): void {
  const q = <T extends Element = HTMLElement>(sel: string) => main.querySelector<T>(sel);
  const host = q('[data-product-table]');
  const pareto = q('[data-pareto]');
  const search = q<HTMLInputElement>('[data-search]');
  const catSel = q<HTMLSelectElement>('[data-category]');
  const abcSel = q<HTMLSelectElement>('[data-abc]');
  if (!host) return;
  let all: ProductRow[] = [];

  const openProduct = (index: number) => {
    const r = all.find((x) => x.index === index);
    if (!r) return;
    const maxSeller = Math.max(1, ...r.bySeller.map((s) => s.revenue));
    const todayUnits = engine
      .todayOrders()
      .flatMap((o) => o.items)
      .filter((it) => it.product === index)
      .reduce((s, it) => s + it.qty, 0);
    openDrawer(
      `<p class="eyebrow">${esc(r.product.category)} · Clase ${r.abc}</p>
       <h2 class="drawer-title">${esc(r.product.name)}</h2>
       <dl class="drawer-kpis">
         <div><dt>Facturación</dt><dd>${formatCompact(r.revenue)}</dd></div>
         <div><dt>Variación</dt><dd>${r.change === null ? '—' : formatSignedPercent(r.change)}</dd></div>
         <div><dt>Margen</dt><dd>${formatPercent(r.marginPct)}</dd></div>
         <div><dt>Precio por bulto</dt><dd>${formatMoney(r.price)}</dd></div>
         <div><dt>Bultos en el período</dt><dd>${formatInt(r.units)}</dd></div>
         <div><dt>Bultos hoy (en vivo)</dt><dd>${formatInt(todayUnits)}</dd></div>
       </dl>
       <h3 class="drawer-sub">Últimos 12 meses</h3>
       <div class="drawer-chart">${miniSpark(r.trend, r.trend.length - 1, 400, 110)}</div>
       <h3 class="drawer-sub">Por vendedor</h3>
       <ol class="drawer-bars">${r.bySeller
         .sort((a, b) => b.revenue - a.revenue)
         .map((s) => `<li><a class="row-link" href="/vendedores/${s.id}">${esc(s.name)}</a><b>${formatCompact(s.revenue)}</b><span><i style="transform:scaleX(${(s.revenue / maxSeller).toFixed(3)})"></i></span></li>`)
         .join('')}</ol>`,
      `Detalle de ${r.product.name}`,
    );
    const url = new URL(location.href);
    url.searchParams.set('p', String(r.product.id));
    history.replaceState(history.state, '', url);
  };

  const table = createTable<ProductRow>({
    host,
    caption: 'Rendimiento de productos: facturación, margen y clase ABC',
    initialSort: { key: 'revenue', dir: 'desc' },
    pageSize: 20,
    columns: [
      {
        key: 'name',
        label: 'Producto',
        sort: (r) => r.product.name,
        cell: (r) => `<button type="button" class="row-link link-like" data-open="${r.index}">${esc(r.product.name)}</button><span class="c-sub">${esc(r.product.category)}</span>`,
      },
      { key: 'abc', label: 'ABC', sort: (r) => r.cumShare * -1, cell: (r) => abcTag(r.abc) },
      { key: 'revenue', label: 'Facturación', num: true, sort: (r) => r.revenue, cell: (r) => formatCompact(r.revenue) },
      {
        key: 'change',
        label: 'Variación',
        num: true,
        wide: true,
        sort: (r) => r.change ?? -9,
        cell: (r) => (r.change === null ? '—' : `<span class="${r.change >= 0 ? 'k-up' : 'muted'}">${formatSignedPercent(r.change)}</span>`),
      },
      { key: 'marginPct', label: 'Margen %', num: true, sort: (r) => r.marginPct, cell: (r) => formatPercent(r.marginPct) },
      { key: 'margin', label: 'Margen $', num: true, wide: true, sort: (r) => r.margin, cell: (r) => formatCompact(r.margin) },
      { key: 'units', label: 'Bultos', num: true, wide: true, sort: (r) => r.units, cell: (r) => formatInt(r.units) },
      { key: 'trend', label: '12 meses', wide: true, cell: (r) => miniSpark(r.trend, r.trend.length - 1, 96, 28) },
    ],
  });

  const apply = () => {
    const term = (search?.value ?? '').trim().toLocaleLowerCase('es');
    const cat = catSel?.value ?? 'all';
    const abc = abcSel?.value ?? 'all';
    table.set(
      all.filter(
        (r) => (cat === 'all' || r.product.category === cat) && (abc === 'all' || r.abc === abc) && (!term || r.product.name.toLocaleLowerCase('es').includes(term)),
      ),
    );
  };

  const renderPareto = () => {
    if (!pareto || !all.length) return;
    const b = pareto.getBoundingClientRect();
    if (b.width < 10) return;
    pareto.innerHTML = paretoSVG(all, Math.round(b.width), Math.round(b.height));
  };

  const load = () => {
    all = productRows(store.get());
    const revenue = all.reduce((s, r) => s + r.revenue, 0);
    const margin = all.reduce((s, r) => s + r.margin, 0);
    const set = (k: string, v: string) => {
      const el = q(`[data-k="${k}"]`);
      if (el) el.textContent = v;
    };
    set('revenue', formatCompact(revenue));
    set('margin', formatCompact(margin));
    set('marginPct', `${formatPercent(revenue ? margin / revenue : 0)} sobre ventas`);
    set('a', String(all.filter((r) => r.abc === 'A').length));
    set('units', formatInt(all.reduce((s, r) => s + r.units, 0)));
    renderPareto();
    apply();
  };

  main.addEventListener('click', (e) => {
    const t = (e.target as Element).closest<HTMLElement>('[data-open], .pa-bar');
    if (t) openProduct(Number(t.dataset['open'] ?? t.dataset['p']));
  });
  pareto?.addEventListener('pointermove', (e) => {
    const bar = (e.target as Element).closest<SVGRectElement>('.pa-bar');
    if (!bar) return hideTip();
    const r = all.find((x) => x.index === Number(bar.dataset['p']));
    if (!r) return;
    showTip(
      {
        title: `${r.product.name} · Clase ${r.abc}`,
        value: formatCompact(r.revenue),
        chart: miniSpark(r.trend, r.trend.length - 1, 220, 56),
        rows: [
          ['Margen', formatPercent(r.marginPct)],
          ['Acumulado', formatPercent(r.cumShare)],
        ],
        hint: 'Clic para ver el detalle',
      },
      e.clientX,
      e.clientY,
    );
  });
  pareto?.addEventListener('pointerleave', hideTip);
  search?.addEventListener('input', apply);
  catSel?.addEventListener('change', apply);
  abcSel?.addEventListener('change', apply);
  store.subscribe(load);
  if (pareto) observeResize(pareto, renderPareto);

  q('[data-export-csv]')?.addEventListener('click', () => {
    const rows = table.sorted();
    downloadCSV(
      `productos-${store.get().period}.csv`,
      ['Producto', 'Categoría', 'Clase ABC', `Facturación (${periodTitle(store.get().period)})`, 'Variación %', 'Margen %', 'Margen $', 'Bultos'],
      rows.map((r) => [
        r.product.name,
        r.product.category,
        r.abc,
        Math.round(r.revenue),
        r.change === null ? '' : Math.round(r.change * 1000) / 10,
        Math.round(r.marginPct * 1000) / 10,
        Math.round(r.margin),
        r.units,
      ]),
    );
    toast('CSV exportado', `${rows.length} productos`, { tone: 'success' });
  });

  setViewActions({
    exportTarget: () => {
      const svg = pareto?.querySelector('svg');
      return svg ? { el: svg, title: 'Curva ABC de productos', slug: 'productos-abc' } : null;
    },
  });

  requestAnimationFrame(() => {
    load();
    const p = Number(new URLSearchParams(location.search).get('p'));
    if (p) openProduct(p - 1);
  });
}
