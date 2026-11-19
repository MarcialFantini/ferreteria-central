// "Clientes": searchable, sortable list that follows the global filters.
import { clientRows, RISK_ORDER, type ClientRow, type Risk } from '../../data/clients';
import { orderDate } from '../../data/history';
import { periodTitle } from '../../data/selectors';
import { miniSpark } from '../../render/sparkline';
import { formatCompact, formatInt, formatSignedPercent } from '../../lib/format';
import { store } from '../store';
import { createTable, esc } from '../table';
import { downloadCSV } from '../csv';
import { toast } from '../notify';

export const riskTag = (r: Risk): string => {
  const cls = r === 'Alto' ? 'tag tag--solid' : r === 'Medio' ? 'tag tag--hot' : r === 'Perdido' ? 'tag tag--muted' : 'tag';
  return `<span class="${cls}">${r === 'Nuevo' || r === 'Perdido' ? r : `Riesgo ${r.toLowerCase()}`}</span>`;
};

export function mount(main: HTMLElement): void {
  const q = <T extends Element = HTMLElement>(sel: string) => main.querySelector<T>(sel);
  const host = q('[data-client-table]');
  const search = q<HTMLInputElement>('[data-search]');
  const riskSel = q<HTMLSelectElement>('[data-risk]');
  if (!host) return;

  // Deep link: /clientes?riesgo=Alto
  const params = new URLSearchParams(location.search);
  const riskParam = params.get('riesgo');
  if (riskSel && riskParam) riskSel.value = riskParam;

  const table = createTable<ClientRow>({
    host,
    caption: 'Clientes con su facturación, tendencia y riesgo de abandono',
    initialSort: { key: 'revenue', dir: 'desc' },
    columns: [
      {
        key: 'name',
        label: 'Cliente',
        sort: (r) => r.client.name,
        cell: (r) => `<a class="row-link" href="/clientes/${r.client.id}">${esc(r.client.name)}</a><span class="c-sub">${esc(r.client.city)}</span>`,
      },
      { key: 'province', label: 'Provincia', wide: true, sort: (r) => r.provinceName, cell: (r) => esc(r.provinceName) },
      { key: 'seller', label: 'Vendedor', wide: true, sort: (r) => r.sellerName, cell: (r) => esc(r.sellerName) },
      { key: 'revenue', label: 'Facturación', num: true, sort: (r) => r.revenue, cell: (r) => formatCompact(r.revenue) },
      {
        key: 'change',
        label: 'Variación',
        num: true,
        wide: true,
        sort: (r) => r.change ?? -9,
        cell: (r) => (r.change === null ? '<span class="muted">—</span>' : `<span class="${r.change >= 0 ? 'k-up' : 'muted'}">${formatSignedPercent(r.change)}</span>`),
      },
      { key: 'trend', label: 'Últimos 12 meses', wide: true, cell: (r) => miniSpark(r.trend, r.trend.length - 1, 96, 28) },
      { key: 'last', label: 'Última compra', wide: true, sort: (r) => r.lastOrder?.dateKey ?? 0, cell: (r) => (r.lastOrder ? orderDate(r.lastOrder) : '—') },
      { key: 'risk', label: 'Riesgo', sort: (r) => -RISK_ORDER[r.risk], cell: (r) => riskTag(r.risk) },
    ],
  });

  let all: ClientRow[] = [];
  const apply = () => {
    const term = (search?.value ?? '').trim().toLocaleLowerCase('es');
    const risk = riskSel?.value ?? 'all';
    const rows = all.filter(
      (r) =>
        (risk === 'all' || r.risk === risk) &&
        (!term || r.client.name.toLocaleLowerCase('es').includes(term) || r.client.city.toLocaleLowerCase('es').includes(term)),
    );
    table.set(rows);
  };

  const load = () => {
    all = clientRows(store.get());
    const set = (k: string, v: string) => {
      const el = q(`[data-k="${k}"]`);
      if (el) el.textContent = v;
    };
    set('count', formatInt(all.length));
    set('revenue', formatCompact(all.reduce((s, r) => s + r.revenue, 0)));
    set('risk', String(all.filter((r) => r.risk === 'Alto').length));
    set('new', String(all.filter((r) => r.risk === 'Nuevo').length));
    apply();
  };

  search?.addEventListener('input', apply);
  riskSel?.addEventListener('change', apply);
  store.subscribe(load);

  q('[data-export-csv]')?.addEventListener('click', () => {
    const rows = table.sorted();
    downloadCSV(
      `clientes-${store.get().period}.csv`,
      ['Cliente', 'Ciudad', 'Provincia', 'Vendedor', `Facturación (${periodTitle(store.get().period)})`, 'Variación %', 'Última compra', 'Riesgo'],
      rows.map((r) => [
        r.client.name,
        r.client.city,
        r.provinceName,
        r.sellerName,
        r.revenue,
        r.change === null ? '' : Math.round(r.change * 1000) / 10,
        r.lastOrder ? orderDate(r.lastOrder) : '',
        r.risk,
      ]),
    );
    toast('CSV exportado', `${rows.length} clientes`, { tone: 'success' });
  });

  // Let the skeleton paint first, then compute.
  requestAnimationFrame(() => load());
}
