// "Pedidos": live orders on top + three months of history, filters, CSV export, order drawer.
import { CLIENTS, MONTHS, PRODUCTS, PROVINCES } from '../../data/dataset';
import { SELLERS } from '../../data/catalog';
import { clientIndexes } from '../../data/selectors';
import { monthsOrders, orderDate, orderItems } from '../../data/history';
import { clockLabel, dateOf, type LiveOrder, type OrderItem } from '../../data/live';
import { formatCompact, formatInt, formatMoney } from '../../lib/format';
import { store } from '../store';
import { engine } from '../engine';
import { createTable, esc } from '../table';
import { downloadCSV } from '../csv';
import { toast } from '../notify';
import { openDrawer } from '../drawer';

interface Row {
  key: string;
  id: number;
  client: number;
  sellerId: string;
  provinceId: string;
  total: number;
  lines: number;
  status: string;
  /** Sort key: yyyymmddhhmm. */
  when: number;
  dateText: string;
  month: number | 'today';
  live?: LiveOrder;
}

const LAST3 = MONTHS.slice(-3).map((m) => m.index);
const sellerName = (id: string) => SELLERS.find((s) => s.id === id)?.name ?? id;
const provinceName = (id: string) => PROVINCES.find((p) => p.id === id)?.name ?? id;

const liveRow = (o: LiveOrder): Row => {
  const d = dateOf(o.day);
  return {
    key: `L${o.id}`,
    id: o.id,
    client: o.client,
    sellerId: o.sellerId,
    provinceId: o.provinceId,
    total: o.total,
    lines: o.items.length,
    status: 'Nuevo',
    when: (d.getFullYear() * 10_000 + (d.getMonth() + 1) * 100 + d.getDate()) * 10_000 + Math.floor(o.minute),
    dateText: `Hoy ${clockLabel(o.minute)}`,
    month: 'today',
    live: o,
  };
};

export function mount(main: HTMLElement): void {
  const q = <T extends Element = HTMLElement>(sel: string) => main.querySelector<T>(sel);
  const host = q('[data-order-table]');
  const search = q<HTMLInputElement>('[data-search]');
  const when = q<HTMLSelectElement>('[data-when]');
  const status = q<HTMLSelectElement>('[data-status]');
  const amount = q<HTMLSelectElement>('[data-amount]');
  const clientTag = q('[data-client-filter]');
  if (!host) return;

  const clientId = Number(new URLSearchParams(location.search).get('cliente') ?? 0);
  let clientIdx = clientId ? CLIENTS.findIndex((c) => c.id === clientId) : -1;
  const renderClientTag = () => {
    if (!clientTag) return;
    clientTag.hidden = clientIdx < 0;
    if (clientIdx >= 0) {
      clientTag.innerHTML = `<span></span><button type="button" aria-label="Quitar filtro de cliente">×</button>`;
      const s = clientTag.querySelector('span');
      if (s) s.textContent = `Cliente: ${CLIENTS[clientIdx]?.name ?? ''}`;
      clientTag.querySelector('button')?.addEventListener('click', () => {
        clientIdx = -1;
        history.replaceState(history.state, '', location.pathname);
        renderClientTag();
        load();
      });
    }
  };

  const table = createTable<Row>({
    host,
    caption: 'Pedidos de hoy y de los últimos tres meses',
    initialSort: { key: 'when', dir: 'desc' },
    rowKey: (r) => r.key,
    columns: [
      { key: 'id', label: 'Pedido', sort: (r) => r.id, cell: (r) => `<button type="button" class="row-link link-like" data-order="${r.key}">N.º ${r.id}</button>` },
      { key: 'when', label: 'Fecha', sort: (r) => r.when, cell: (r) => (r.month === 'today' ? `<b class="k-up">${r.dateText}</b>` : r.dateText) },
      {
        key: 'client',
        label: 'Cliente',
        sort: (r) => CLIENTS[r.client]?.name ?? '',
        cell: (r) => `<a class="row-link" href="/clientes/${CLIENTS[r.client]?.id ?? ''}">${esc(CLIENTS[r.client]?.name ?? '')}</a><span class="c-sub">${esc(CLIENTS[r.client]?.city ?? '')}</span>`,
      },
      { key: 'province', label: 'Provincia', wide: true, sort: (r) => provinceName(r.provinceId), cell: (r) => esc(provinceName(r.provinceId)) },
      { key: 'seller', label: 'Vendedor', wide: true, sort: (r) => sellerName(r.sellerId), cell: (r) => esc(sellerName(r.sellerId)) },
      {
        key: 'status',
        label: 'Estado',
        sort: (r) => r.status,
        cell: (r) => `<span class="tag${r.status === 'Nuevo' ? ' tag--solid' : r.status === 'Entregado' ? ' tag--muted' : ' tag--hot'}">${r.status}</span>`,
      },
      { key: 'lines', label: 'Líneas', num: true, wide: true, sort: (r) => r.lines, cell: (r) => String(r.lines) },
      { key: 'total', label: 'Total', num: true, sort: (r) => r.total, cell: (r) => formatMoney(r.total) },
    ],
  });

  let history_: Row[] = [];
  let all: Row[] = [];

  const filtered = () => {
    const term = (search?.value ?? '').trim().toLocaleLowerCase('es');
    const w = when?.value ?? 'all';
    const st = status?.value ?? 'all';
    const min = Number(amount?.value ?? 0);
    return all.filter((r) => {
      if (w === 'today' && r.month !== 'today') return false;
      if (w !== 'all' && w !== 'today' && String(r.month) !== w) return false;
      if (st !== 'all' && r.status !== st) return false;
      if (r.total < min) return false;
      if (term) {
        const c = CLIENTS[r.client];
        const hay = `${c?.name ?? ''} ${c?.city ?? ''} ${r.id}`.toLocaleLowerCase('es');
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  };

  const renderKpis = (rows: Row[]) => {
    const total = rows.reduce((s, r) => s + r.total, 0);
    const set = (k: string, v: string) => {
      const el = q(`[data-k="${k}"]`);
      if (el) el.textContent = v;
    };
    set('count', formatInt(rows.length));
    set('total', formatCompact(total));
    set('avg', rows.length ? formatCompact(total / rows.length) : '—');
    const today = all.filter((r) => r.month === 'today');
    set('today', formatInt(today.length));
    set('todayNote', today.length ? `${formatCompact(today.reduce((s, r) => s + r.total, 0))} facturados` : 'todavía sin pedidos');
  };

  const apply = (opts: { keepPage?: boolean; newKeys?: string[] } = {}) => {
    const rows = filtered();
    renderKpis(rows);
    table.set(rows, opts);
  };

  const inSegment = (client: number) => {
    const f = store.get();
    const c = CLIENTS[client];
    if (!c) return false;
    if (clientIdx >= 0) return client === clientIdx;
    return (f.seller === 'all' || c.sellerId === f.seller) && (f.province === 'all' || c.provinceId === f.province);
  };

  const load = () => {
    const f = store.get();
    const clients = clientIdx >= 0 ? [clientIdx] : clientIndexes(f);
    history_ = monthsOrders(LAST3, clients).map((o) => ({
      key: `H${o.id}`,
      id: o.id,
      client: o.client,
      sellerId: o.sellerId,
      provinceId: o.provinceId,
      total: o.total,
      lines: o.lines,
      status: o.status,
      when: o.dateKey * 10_000 + ((o.id * 37) % 720) + 480,
      dateText: orderDate(o),
      month: o.month,
    }));
    all = [...engine.todayOrders().filter((o) => inSegment(o.client)).map(liveRow), ...history_];
    apply();
  };

  const showOrder = (key: string) => {
    const r = all.find((x) => x.key === key);
    if (!r) return;
    const items: OrderItem[] = r.live ? r.live.items : orderItems({ id: r.id, sellerId: r.sellerId, total: r.total, lines: r.lines });
    const sum = items.reduce((s, it) => s + it.qty * it.price, 0);
    const c = CLIENTS[r.client];
    openDrawer(
      `<p class="eyebrow">${r.dateText} · ${esc(r.status)}</p>
       <h2 class="drawer-title">Pedido N.º ${r.id}</h2>
       <p><a class="row-link" href="/clientes/${c?.id ?? ''}">${esc(c?.name ?? '')}</a> · ${esc(c?.city ?? '')}, ${esc(provinceName(r.provinceId))}</p>
       <p class="muted">Vendedor: ${esc(sellerName(r.sellerId))}</p>
       <h3 class="drawer-sub">Detalle</h3>
       <ol class="drawer-lines">${items
         .map((it) => `<li><span>${esc(PRODUCTS[it.product]?.name ?? '')}<br><small>${it.qty} × ${formatMoney(it.price)}</small></span><b>${formatMoney(it.qty * it.price)}</b></li>`)
         .join('')}</ol>
       <p class="drawer-total"><span>Total</span><span>${formatMoney(r.live ? r.total : sum)}</span></p>`,
      `Pedido ${r.id}`,
    );
  };

  host.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-order]');
    if (b?.dataset['order']) showOrder(b.dataset['order']);
  });
  search?.addEventListener('input', () => apply());
  when?.addEventListener('change', () => apply());
  status?.addEventListener('change', () => apply());
  amount?.addEventListener('change', () => apply());
  store.subscribe(() => load());

  // Live: new orders slide in at the top (keeping the user's page and sort).
  engine.on('order', (o) => {
    if (!inSegment(o.client)) return;
    const row = liveRow(o);
    all = [row, ...all];
    apply({ keepPage: true, newKeys: [row.key] });
  });
  engine.on('day', () => load());

  q('[data-export-csv]')?.addEventListener('click', () => {
    const rows = table.sorted();
    downloadCSV(
      'pedidos.csv',
      ['Pedido', 'Fecha', 'Cliente', 'Ciudad', 'Provincia', 'Vendedor', 'Estado', 'Líneas', 'Total'],
      rows.map((r) => [
        r.id,
        r.dateText,
        CLIENTS[r.client]?.name ?? '',
        CLIENTS[r.client]?.city ?? '',
        provinceName(r.provinceId),
        sellerName(r.sellerId),
        r.status,
        r.lines,
        Math.round(r.total),
      ]),
    );
    toast('CSV exportado', `${formatInt(rows.length)} pedidos`, { tone: 'success' });
  });

  renderClientTag();
  requestAnimationFrame(() => load());
}
