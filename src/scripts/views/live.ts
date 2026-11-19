// "En vivo": today's revenue ticking, hoy-vs-ayer curve, orders landing on the map, live feed.
import { CLIENTS, PRODUCTS } from '../../data/dataset';
import { SELLERS } from '../../data/catalog';
import { clockLabel, dayLabel, generateDay, type LiveOrder } from '../../data/live';
import { liveCurveSVG } from '../../render/live-curve';
import { dropOrder } from '../../render/live-drop';
import { formatCompact, formatInt, formatSignedPercent } from '../../lib/format';
import { gsap, reducedMotion } from '../motion';
import { engine } from '../engine';
import { observeResize } from '../lifecycle';
import { setViewActions } from '../view-actions';
import type { Speed } from '../state';

const FEED_MAX = 14;

export function mount(main: HTMLElement): void {
  const q = <T extends Element = HTMLElement>(sel: string) => main.querySelector<T>(sel);
  const totalEl = q('[data-live-total]');
  const curveHost = q('[data-live-curve]');
  const feed = q('[data-feed]');
  const drops = q<SVGGElement>('[data-live-drops]');
  const provPaths = [...main.querySelectorAll<SVGPathElement>('[data-prov]')];
  const shown = { total: engine.todayTotal() };

  const set = (sel: string, text: string) => {
    const n = q(sel);
    if (n) n.textContent = text;
  };

  // ---------- KPIs ----------
  const renderKpis = () => {
    const orders = engine.todayOrders();
    const total = orders.reduce((s, o) => s + o.total, 0);
    const yesterday = engine.day > 0 ? generateDay(engine.day - 1).filter((o) => o.minute <= engine.minute) : [];
    const yTotal = yesterday.reduce((s, o) => s + o.total, 0);
    const vs = yTotal ? total / yTotal - 1 : 0;
    set('[data-live-vs]', yTotal ? formatSignedPercent(vs) : '—');
    q('[data-live-vs]')?.classList.toggle('is-up', vs >= 0);
    set('[data-live-orders]', formatInt(orders.length));
    set('[data-live-ticket]', orders.length ? formatCompact(total / orders.length) : '—');
    set('[data-live-clients]', String(new Set(orders.map((o) => o.client)).size));
    set('[data-feed-count]', `${orders.length} hoy`);
    return total;
  };

  const renderTotal = () => {
    if (totalEl) totalEl.textContent = `$ ${formatInt(shown.total)}`;
  };
  const bumpTotal = (target: number) => {
    if (reducedMotion()) {
      shown.total = target;
      renderTotal();
      return;
    }
    gsap.to(shown, { total: target, duration: 0.9, ease: 'power3.out', onUpdate: renderTotal, overwrite: true });
  };

  // ---------- Curve ----------
  let lastCurveMinute = -1;
  const renderCurve = (force = false) => {
    if (!curveHost) return;
    if (!force && Math.floor(engine.minute) === lastCurveMinute) return;
    lastCurveMinute = Math.floor(engine.minute);
    const r = curveHost.getBoundingClientRect();
    if (r.width < 10) return;
    const { today, yesterday } = engine.curves(5);
    curveHost.innerHTML = liveCurveSVG([...today, { minute: engine.minute, value: engine.todayTotal() }], yesterday, Math.round(r.width), Math.round(r.height));
  };

  // ---------- Map ----------
  const renderMap = () => {
    const counts = new Map<string, number>();
    for (const o of engine.todayOrders()) counts.set(o.provinceId, (counts.get(o.provinceId) ?? 0) + 1);
    const max = Math.max(1, ...counts.values());
    provPaths.forEach((p) => {
      const n = counts.get(p.dataset['prov'] ?? '') ?? 0;
      p.setAttribute('fill-opacity', (0.06 + 0.94 * Math.pow(n / max, 0.7)).toFixed(3));
    });
  };

  // ---------- Feed ----------
  const feedItem = (o: LiveOrder, isNew: boolean) => {
    const c = CLIENTS[o.client];
    const li = document.createElement('li');
    li.className = `feed-item${o.total > 400_000 ? ' is-big' : ''}${isNew ? ' is-new' : ''}`;
    li.innerHTML = `<span class="feed-time">${clockLabel(o.minute)}</span><span class="feed-who"><a href="/clientes/${c?.id ?? ''}"></a><span class="feed-meta"></span></span><span class="feed-total">${formatCompact(o.total)}</span>`;
    const a = li.querySelector('a');
    if (a) a.textContent = c?.name ?? '';
    const meta = li.querySelector('.feed-meta');
    if (meta) meta.textContent = `${o.city} · ${o.items.length} ${o.items.length === 1 ? 'producto' : 'productos'} · N.º ${o.id}`;
    return li;
  };
  const renderFeed = () => {
    if (!feed) return;
    const orders = engine.todayOrders().slice(-FEED_MAX).reverse();
    feed.replaceChildren(...orders.map((o) => feedItem(o, false)));
    if (!orders.length) feed.innerHTML = '<li class="feed-item"><span></span><span class="muted">Todavía no entraron pedidos hoy.</span><span></span></li>';
  };
  const pushFeed = (o: LiveOrder) => {
    if (!feed) return;
    if (!feed.querySelector('.feed-time')) feed.replaceChildren();
    feed.prepend(feedItem(o, true));
    while (feed.children.length > FEED_MAX) feed.lastElementChild?.remove();
  };

  // ---------- Side lists ----------
  const barList = (sel: string, rows: { name: string; value: number; href?: string }[]) => {
    const host = q(sel);
    if (!host) return;
    const max = Math.max(1, ...rows.map((r) => r.value));
    host.innerHTML = rows
      .map(
        (r) =>
          `<li><span class="bl-name">${r.href ? `<a class="row-link" href="${r.href}"></a>` : '<span></span>'}</span><span class="bl-value">${formatCompact(r.value)}</span><span class="bl-bar"><span style="transform:scaleX(${(r.value / max).toFixed(3)})"></span></span></li>`,
      )
      .join('');
    host.querySelectorAll('.bl-name > *').forEach((n, i) => {
      n.textContent = rows[i]?.name ?? '';
    });
  };
  const renderSide = () => {
    const orders = engine.todayOrders();
    const byProduct = new Map<number, number>();
    const bySeller = new Map<string, number>();
    for (const o of orders) {
      bySeller.set(o.sellerId, (bySeller.get(o.sellerId) ?? 0) + o.total);
      for (const it of o.items) byProduct.set(it.product, (byProduct.get(it.product) ?? 0) + it.qty * it.price);
    }
    barList(
      '[data-live-products]',
      [...byProduct.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([p, v]) => ({ name: PRODUCTS[p]?.name ?? '', value: v, href: `/productos?p=${(PRODUCTS[p]?.id ?? 0).toString()}` })),
    );
    barList(
      '[data-live-sellers]',
      SELLERS.map((s) => ({ name: s.name, value: bySeller.get(s.id) ?? 0, href: `/vendedores/${s.id}` })).sort((a, b) => b.value - a.value),
    );
  };

  // ---------- Controls (mirror the sidebar ones) ----------
  const syncControls = () => {
    set('[data-live-pause-label]', engine.paused ? 'Reanudar' : 'Pausar');
    main.querySelectorAll<HTMLElement>('[data-live-speed]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset['liveSpeed']) === engine.speed)));
  };
  q('[data-live-pause]')?.addEventListener('click', () => engine.togglePause());
  main.querySelectorAll<HTMLButtonElement>('[data-live-speed]').forEach((b) =>
    b.addEventListener('click', () => engine.setSpeed(Number(b.dataset['liveSpeed']) as Speed)),
  );

  const renderHeader = () => {
    set('[data-live-day]', dayLabel(engine.day));
    set('[data-live-clock]', clockLabel(engine.minute));
  };

  // ---------- Wire to the engine ----------
  engine.on('order', (o) => {
    bumpTotal(renderKpis());
    pushFeed(o);
    renderSide();
    renderMap();
    if (drops) dropOrder(drops, o.x, o.y, { big: o.total > 400_000, scale: 1.2 });
  });
  engine.on('tick', () => {
    renderHeader();
    renderCurve();
  });
  engine.on('day', () => {
    shown.total = 0;
    renderTotal();
    renderAll();
  });
  engine.on('state', syncControls);
  observeResize(curveHost ?? main, () => renderCurve(true));

  const renderAll = () => {
    shown.total = renderKpis();
    renderTotal();
    renderHeader();
    renderCurve(true);
    renderMap();
    renderFeed();
    renderSide();
    syncControls();
  };
  renderAll();

  setViewActions({
    exportTarget: () => {
      const svg = curveHost?.querySelector('svg');
      return svg ? { el: svg, title: `Hoy contra ayer · ${dayLabel(engine.day)}`, slug: 'en-vivo' } : null;
    },
  });
}

