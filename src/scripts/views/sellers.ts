// "Vendedores": leaderboard for the period + live goal rings for the live month.
import { initials, sellerStats, type SellerStats } from '../../data/sellers';
import { periodTitle } from '../../data/selectors';
import { ringSVG, setRing } from '../../render/ring';
import { formatCompact, formatInt, formatSignedPercent } from '../../lib/format';
import { store } from '../store';
import { engine } from '../engine';
import { app } from '../state';
import { onDispose } from '../lifecycle';

export function mount(main: HTMLElement): void {
  const list = main.querySelector<HTMLElement>('[data-leaderboard]');
  const bars = main.querySelector<HTMLElement>('[data-seller-bars]');
  if (!list) return;
  let stats: SellerStats[] = [];

  const goalInfo = (id: string) => {
    const goal = app.get().goals[id] ?? 0;
    const mtd = engine.monthToDate(id);
    return { goal, mtd, pct: goal ? mtd / goal : 0 };
  };

  const render = () => {
    stats = sellerStats(store.get());
    list.innerHTML = stats
      .map((s, i) => {
        const g = goalInfo(s.seller.id);
        return `<li class="lb-card${i === 0 ? ' is-first' : ''}" data-seller="${s.seller.id}">
          <div class="lb-top"><span class="lb-rank">${i + 1}</span><span class="avatar${i === 0 ? ' is-lead' : ''}">${initials(s.seller.name)}</span>
            <span><a class="lb-name" href="/vendedores/${s.seller.id}">${s.seller.name}</a><span class="lb-region">${s.seller.region}</span></span></div>
          <div class="lb-ring"><div class="ring-wrap">${ringSVG(g.pct, 96, 9)}<span class="ring-pct" data-pct>${Math.round(g.pct * 100)} %</span></div><small>objetivo nov.</small></div>
          <dl class="lb-stats">
            <div><dt>Facturación</dt><dd>${formatCompact(s.revenue)}</dd></div>
            <div><dt>Variación</dt><dd class="${(s.change ?? 0) >= 0 ? 'k-up' : ''}">${s.change === null ? '—' : formatSignedPercent(s.change)}</dd></div>
            <div><dt>Clientes activos</dt><dd>${formatInt(s.clients)}</dd></div>
            <div><dt>Noviembre a la fecha</dt><dd data-mtd>${formatCompact(g.mtd)}</dd></div>
          </dl>
        </li>`;
      })
      .join('');
    if (bars) {
      const max = Math.max(1, ...stats.map((s) => Math.max(s.revenue, s.previous)));
      bars.innerHTML = `<p class="muted" style="margin-bottom:8px">${periodTitle(store.get().period)} · la línea marca el período anterior</p>${stats
        .map(
          (s) =>
            `<div class="sb-row"><span>${s.seller.name}</span><span class="sb-track"><span class="sb-fill" style="transform:scaleX(${(s.revenue / max).toFixed(3)})"></span><span class="sb-prev" style="left:${((s.previous / max) * 100).toFixed(1)}%"></span></span><span class="sb-value">${formatCompact(s.revenue)}</span></div>`,
        )
        .join('')}`;
    }
  };

  const updateGoals = () => {
    list.querySelectorAll<HTMLElement>('[data-seller]').forEach((card) => {
      const g = goalInfo(card.dataset['seller'] ?? '');
      setRing(card.querySelector('svg.ring'), g.pct);
      const pct = card.querySelector('[data-pct]');
      if (pct) pct.textContent = `${Math.round(g.pct * 100)} %`;
      const mtd = card.querySelector('[data-mtd]');
      if (mtd) mtd.textContent = formatCompact(g.mtd);
    });
  };

  store.subscribe(render);
  engine.on('order', updateGoals);
  onDispose(app.on('goals', updateGoals));
  requestAnimationFrame(render);
}
