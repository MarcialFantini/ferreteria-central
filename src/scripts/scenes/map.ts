import { cityOrders, PERIOD_LABEL, provinceClients, provinceData, type Filters, type ProvinceDatum } from '../../data/selectors';
import { MONTHS } from '../../data/dataset';
import { provinceOpacity, topProvinces } from '../../render/map';
import { miniSpark } from '../../render/sparkline';
import { formatCompact, formatMoney, formatPercent } from '../../lib/format';
import { gsap, dur, reducedMotion, type Scene } from '../motion';
import { store } from '../store';
import { engine } from '../engine';
import { dropOrder } from '../../render/live-drop';
import { hideTip, showTip } from '../tooltip';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MAX_DROPS = 140;

export function mountMap(el: HTMLElement): Scene {
  const q = <T extends Element = HTMLElement>(sel: string) => el.querySelector<T>(sel);
  const svg = q<SVGSVGElement>('[data-map-svg]');
  const provincesG = q<SVGGElement>('[data-provinces]');
  const rainG = q<SVGGElement>('[data-rain]');
  const clientsG = q<SVGGElement>('[data-clients]');
  const labelsG = q<SVGGElement>('[data-labels]');
  const panelCountry = q('[data-panel-country]');
  const panelDrill = q('[data-panel-drill]');
  const baseViewBox = svg?.dataset['baseViewbox'] ?? '0 0 420 860';
  const paths = [...el.querySelectorAll<SVGPathElement>('[data-province]')];
  let rows: ProvinceDatum[] = provinceData(store.get());
  let drilled: string | null = null;

  // Silhouette under the choropleth so dim provinces still read as land.
  if (provincesG) {
    const base = provincesG.cloneNode(true) as SVGGElement;
    base.removeAttribute('data-provinces');
    base.setAttribute('aria-hidden', 'true');
    base.querySelectorAll('path').forEach((p) => {
      p.removeAttribute('data-province');
      p.removeAttribute('fill-opacity');
      p.setAttribute('class', 'province-base');
    });
    provincesG.before(base);
  }

  const rowById = (id: string) => rows.find((r) => r.id === id);

  const provinceTip = (row: ProvinceDatum, x: number, y: number) => {
    const months = MONTHS.length;
    showTip(
      {
        title: row.name,
        value: formatCompact(row.revenue),
        chart: miniSpark(row.trend, months - 1, 220, 56),
        rows: [
          ['Participación', formatPercent(row.share)],
          ['Clientes activos', String(row.clients)],
        ],
        hint: 'Últimos 24 meses · clic para ver clientes',
      },
      x,
      y,
    );
  };

  paths.forEach((p) => {
    const id = p.dataset['province'] ?? '';
    p.addEventListener('pointermove', (e) => {
      if (drilled) return;
      const row = rowById(id);
      if (row) provinceTip(row, e.clientX, e.clientY);
    });
    p.addEventListener('pointerleave', hideTip);
    p.addEventListener('click', () => drill(id));
  });

  const applyColors = (animate: boolean) => {
    const opacity = provinceOpacity(rows);
    paths.forEach((p) => {
      const value = opacity.get(p.dataset['province'] ?? '') ?? 0.07;
      gsap.to(p, { attr: { 'fill-opacity': value }, duration: animate ? dur(0.8) : 0, ease: 'power2.out' });
    });
  };

  const renderPanel = (filters: Filters) => {
    const top = topProvinces(rows, 6);
    const maxShare = top[0]?.share ?? 1;
    const list = q('[data-prov-rank]');
    const period = q('[data-map-period]');
    if (period) period.textContent = PERIOD_LABEL[filters.period];
    if (list) {
      list.innerHTML = top
        .map(
          (p, i) => `<li><button type="button" class="prov-btn" data-drill="${p.id}">
            <span class="prov-pos num">${String(i + 1).padStart(2, '0')}</span>
            <span class="prov-name">${p.name}</span>
            <span class="prov-value num">${formatCompact(p.revenue)}</span>
            <span class="prov-bar" aria-hidden="true"><span style="transform:scaleX(${(p.share / maxShare).toFixed(3)})"></span></span>
          </button></li>`,
        )
        .join('');
      gsap.from(list.querySelectorAll('.prov-bar span'), { scaleX: 0, duration: dur(0.7), ease: 'power3.out', stagger: 0.05 });
    }
    const tbody = q('[data-map-table] tbody');
    if (tbody) {
      tbody.innerHTML = [...rows]
        .sort((a, b) => b.revenue - a.revenue)
        .map((r) => `<tr><th scope="row">${r.name}</th><td>${formatMoney(r.revenue)}</td><td>${formatPercent(r.share)}</td><td>${r.clients}</td></tr>`)
        .join('');
    }
    // Labels follow the current top 3.
    if (labelsG) {
      const shapes = new Map(paths.map((p) => [p.dataset['province'] ?? '', p]));
      labelsG.innerHTML = top
        .slice(0, 1)
        .map((p) => {
          const path = shapes.get(p.id);
          if (!path) return '';
          const b = path.getBBox();
          return `<g transform="translate(${(b.x + b.width / 2).toFixed(1)} ${(b.y + b.height / 2).toFixed(1)})"><text class="map-label-name" y="-8" text-anchor="middle">${p.name}</text><text class="map-label-value" y="32" text-anchor="middle">${formatCompact(p.revenue)}</text></g>`;
        })
        .join('');
    }
  };

  const rain = () => {
    if (!rainG) return;
    rainG.innerHTML = '';
    const cities = cityOrders(store.get());
    const totalOrders = cities.reduce((s, c) => s + c.orders, 0) || 1;
    const drops: SVGCircleElement[] = [];
    for (const city of cities) {
      const n = Math.max(1, Math.round((city.orders / totalOrders) * MAX_DROPS));
      for (let i = 0; i < n; i++) {
        const c = document.createElementNS(SVG_NS, 'circle');
        c.setAttribute('cx', String(city.x + (Math.random() - 0.5) * 6));
        c.setAttribute('cy', String(city.y + (Math.random() - 0.5) * 6));
        c.setAttribute('r', '2.2');
        rainG.append(c);
        drops.push(c);
      }
    }
    if (reducedMotion()) return;
    gsap.fromTo(
      drops,
      { y: () => -120 - Math.random() * 260, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.9,
        ease: 'bounce.out',
        stagger: { each: 0.012, from: 'random' },
      },
    );
  };

  const lightUp = () => {
    const opacity = provinceOpacity(rows);
    // North-to-south sweep: sort by vertical position.
    const ordered = [...paths].sort((a, b) => a.getBBox().y - b.getBBox().y);
    gsap.fromTo(
      ordered,
      { attr: { 'fill-opacity': 0.02 } },
      {
        attr: { 'fill-opacity': (_i: number, t: SVGPathElement) => opacity.get(t.dataset['province'] ?? '') ?? 0.07 },
        duration: dur(0.9),
        ease: 'power2.out',
        stagger: dur(0.045),
      },
    );
    if (labelsG) gsap.fromTo(labelsG, { opacity: 0 }, { opacity: 1, duration: dur(0.6), delay: dur(1.1) });
  };

  const clientTip = (name: string, city: string, revenue: number, trend: number[], x: number, y: number) =>
    showTip(
      {
        title: `${name} · ${city}`,
        value: formatCompact(revenue),
        chart: miniSpark(trend, trend.length - 1, 220, 56),
        hint: 'Facturación mensual, últimos 24 meses',
      },
      x,
      y,
    );

  function drill(id: string): void {
    if (!svg) return;
    drilled = id;
    hideTip();
    const filters = store.get();
    const row = rowById(id);
    const clients = provinceClients(id, filters);
    const path = paths.find((p) => p.dataset['province'] === id);
    if (!path || !row) return;

    // Zoom: tween the viewBox to the province bounds.
    const b = path.getBBox();
    const size = Math.max(b.width, b.height * 0.75, 36);
    const w = size * 1.35;
    const h = w * 1.35;
    const vb = `${(b.x + b.width / 2 - w / 2).toFixed(1)} ${(b.y + b.height / 2 - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
    gsap.to(svg, { attr: { viewBox: vb }, duration: dur(0.9), ease: 'power3.inOut' });
    paths.forEach((p) => {
      p.classList.toggle('is-active', p === path);
      gsap.to(p, { opacity: p === path ? 1 : 0.18, duration: dur(0.5) });
    });
    gsap.to([rainG, labelsG], { opacity: 0, duration: dur(0.3) });

    // Client dots sized by revenue.
    if (clientsG) {
      const max = Math.max(...clients.map((c) => c.revenue), 1);
      const unit = w / 120;
      clientsG.innerHTML = '';
      clients.forEach((c) => {
        const dot = document.createElementNS(SVG_NS, 'circle');
        dot.setAttribute('cx', String(c.x));
        dot.setAttribute('cy', String(c.y));
        dot.setAttribute('r', (unit * (0.8 + 2.6 * Math.sqrt(c.revenue / max))).toFixed(2));
        dot.style.strokeWidth = String(unit * 0.4);
        dot.addEventListener('pointermove', (e) => clientTip(c.name, c.city, c.revenue, c.trend, e.clientX, e.clientY));
        dot.addEventListener('pointerleave', hideTip);
        clientsG.append(dot);
      });
      gsap.fromTo(
        clientsG.children,
        { scale: 0, transformOrigin: 'center', opacity: 0 },
        { scale: 1, opacity: 1, duration: dur(0.5), ease: 'back.out(2)', stagger: dur(0.02), delay: dur(0.7) },
      );
    }

    // Side panel: client list.
    const title = q('[data-drill-title]');
    const total = q('[data-drill-total]');
    const list = q('[data-client-list]');
    if (title) title.textContent = row.name;
    if (total) total.textContent = `${formatMoney(row.revenue)} · ${clients.filter((c) => c.revenue > 0).length} clientes activos`;
    if (list) {
      list.innerHTML = clients
        .slice(0, 12)
        .map(
          (c) =>
            `<li><span class="c-name">${c.name}<span class="c-city">${c.city}</span></span><span class="c-value">${formatCompact(c.revenue)}</span>${miniSpark(c.trend, c.trend.length - 1, 96, 28)}</li>`,
        )
        .join('');
    }
    if (panelCountry) panelCountry.hidden = true;
    if (panelDrill) {
      panelDrill.hidden = false;
      gsap.from(panelDrill.children, { opacity: 0, y: 16, duration: dur(0.4), stagger: dur(0.05) });
    }
    // Move focus for keyboard users without yanking the zoomed map out of view.
    (title as HTMLElement | null)?.focus({ preventScroll: true });
  }

  function undrill(): void {
    if (!svg || !drilled) return;
    drilled = null;
    gsap.to(svg, { attr: { viewBox: baseViewBox }, duration: dur(0.8), ease: 'power3.inOut' });
    paths.forEach((p) => {
      p.classList.remove('is-active');
      gsap.to(p, { opacity: 1, duration: dur(0.5) });
    });
    gsap.to(clientsG?.children ?? [], { opacity: 0, duration: dur(0.2), onComplete: () => clientsG?.replaceChildren() });
    gsap.to([rainG, labelsG], { opacity: 1, duration: dur(0.4), delay: dur(0.6) });
    if (panelDrill) panelDrill.hidden = true;
    if (panelCountry) panelCountry.hidden = false;
    q<HTMLButtonElement>('.prov-btn')?.focus({ preventScroll: true });
  }

  el.addEventListener('click', (e) => {
    const target = (e.target as Element).closest<HTMLElement>('[data-drill]');
    if (target?.dataset['drill']) drill(target.dataset['drill']);
    if ((e.target as Element).closest('[data-drill-back]')) undrill();
  });
  q<HTMLSelectElement>('[data-drill-select]')?.addEventListener('change', (e) => {
    const value = (e.target as HTMLSelectElement).value;
    if (value) drill(value);
    (e.target as HTMLSelectElement).value = '';
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drilled) undrill();
  });

  // Live orders land on the map as the simulation streams them.
  const liveG = q<SVGGElement>('[data-live-layer]');
  engine.on('order', (o) => {
    const f = store.get();
    if (!liveG || drilled) return;
    if ((f.seller !== 'all' && f.seller !== o.sellerId) || (f.province !== 'all' && f.province !== o.provinceId)) return;
    dropOrder(liveG, o.x, o.y, { big: o.total > 400_000 });
  });

  store.subscribe((next) => {
    rows = provinceData(next);
    applyColors(true);
    renderPanel(next);
    if (drilled) drill(drilled);
    else rain();
  });

  return {
    id: 'map',
    el,
    enter() {
      if (drilled) undrill();
      lightUp();
      rain();
    },
    showcase() {
      this.enter();
      const leader = topProvinces(rows, 1)[0];
      if (leader) gsap.delayedCall(2, () => drill(leader.id));
    },
    reset() {
      if (drilled) undrill();
    },
    exportTarget: () => (svg ? { el: svg, title: drilled ? `Clientes en ${rowById(drilled)?.name ?? ''}` : 'Facturación por provincia' } : null),
  };
}
