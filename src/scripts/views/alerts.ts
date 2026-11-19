// "Alertas": create, toggle and delete rules; see them fire against the live stream.
import { SELLERS } from '../../data/catalog';
import { PROVINCES } from '../../data/dataset';
import { clockLabel } from '../../data/live';
import { formatMoney } from '../../lib/format';
import { app, uid, METRIC_LABEL, type AlertRule, type Metric } from '../state';
import { engine } from '../engine';
import { onDispose } from '../lifecycle';
import { toast } from '../notify';
import { esc } from '../table';

const describe = (r: AlertRule): string => {
  const value = r.metric === 'province_orders' ? `${r.threshold} pedidos` : r.metric === 'seller_goal' ? `${r.threshold} %` : formatMoney(r.threshold);
  const scope = [
    r.seller !== 'all' ? SELLERS.find((s) => s.id === r.seller)?.name : '',
    r.province !== 'all' ? PROVINCES.find((p) => p.id === r.province)?.name : '',
  ].filter(Boolean);
  return `${METRIC_LABEL[r.metric]} ${value}${scope.length ? ` · ${scope.join(' · ')}` : ''}`;
};

export function mount(main: HTMLElement): void {
  const q = <T extends Element = HTMLElement>(sel: string) => main.querySelector<T>(sel);
  const list = q('[data-rules]');
  const fired = q('[data-fired]');
  const form = q<HTMLFormElement>('[data-rule-form]');
  let prevFires = new Map(app.get().rules.map((r) => [r.id, r.fires]));

  const renderRules = () => {
    if (!list) return;
    const rules = app.get().rules;
    list.innerHTML = rules.length
      ? rules
          .map((r) => {
            const justFired = (prevFires.get(r.id) ?? 0) < r.fires;
            return `<li class="${justFired ? 'is-fired' : ''}"><button type="button" class="switch" role="switch" aria-checked="${r.enabled}" data-toggle="${r.id}" aria-label="Activar ${esc(r.name)}"></button>
              <span><span class="r-name">${esc(r.name)}</span><span class="r-desc" style="display:block">${esc(describe(r))}</span></span>
              <span class="r-meta"><span class="tag${r.fires ? ' tag--hot' : ' tag--muted'}">${r.fires} ${r.fires === 1 ? 'disparo' : 'disparos'}</span><button type="button" class="r-del" data-del="${r.id}" aria-label="Eliminar ${esc(r.name)}">Eliminar</button></span></li>`;
          })
          .join('')
      : '<li class="muted">No hay reglas. Creá la primera con el formulario.</li>';
    prevFires = new Map(rules.map((r) => [r.id, r.fires]));
  };

  const renderFired = () => {
    if (!fired) return;
    const items = app.get().notices.filter((n) => n.tone === 'alert');
    fired.innerHTML = items.length
      ? items.map((n) => `<li><span class="f-time">${clockLabel(n.minute)}</span><span>${esc(n.title)}</span><span class="f-body">${esc(n.body)}</span></li>`).join('')
      : '<li class="muted">Todavía no se disparó ninguna regla hoy. Probá "Simular 1 hora a 10x".</li>';
  };

  list?.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const toggle = t.closest<HTMLElement>('[data-toggle]');
    const del = t.closest<HTMLElement>('[data-del]');
    if (toggle) {
      const id = toggle.dataset['toggle'];
      app.update('rules', (rules) => rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
    }
    if (del) {
      const rule = app.get().rules.find((r) => r.id === del.dataset['del']);
      app.update('rules', (rules) => rules.filter((r) => r.id !== del.dataset['del']));
      if (rule) toast(`Regla "${rule.name}" eliminada`, '', { action: { label: 'Deshacer', run: () => app.update('rules', (rs) => [...rs, rule]) } });
    }
  });

  const thresholdLabel = q('[data-threshold-label]');
  form?.querySelector('[name="metric"]')?.addEventListener('change', (e: Event) => {
    const m = (e.target as HTMLSelectElement).value as Metric;
    const input = form.elements.namedItem('threshold') as HTMLInputElement;
    if (thresholdLabel) thresholdLabel.textContent = m === 'province_orders' ? 'Umbral (pedidos)' : m === 'seller_goal' ? 'Umbral (%)' : 'Umbral (ARS)';
    input.value = m === 'province_orders' ? '20' : m === 'seller_goal' ? '75' : m === 'today_revenue' ? '10000000' : '300000';
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const rule: AlertRule = {
      id: uid('r'),
      name: String(data.get('name') ?? '').trim() || 'Regla nueva',
      metric: data.get('metric') as Metric,
      threshold: Math.max(1, Number(data.get('threshold'))),
      seller: String(data.get('seller')),
      province: String(data.get('province')),
      enabled: true,
      firedOn: null,
      fires: 0,
    };
    app.update('rules', (rules) => [rule, ...rules]);
    toast('Regla creada', describe(rule), { tone: 'success' });
    form.reset();
  });

  // Fast-forward one simulated hour so the user sees rules fire right away.
  q('[data-test-alerts]')?.addEventListener('click', () => {
    const steps = 30;
    let i = 0;
    const id = window.setInterval(() => {
      engine.advance(2);
      if (++i >= steps) window.clearInterval(id);
    }, 60);
    onDispose(() => window.clearInterval(id));
    toast('Simulando una hora', 'Los pedidos entran a toda velocidad. Mirá cómo se disparan las reglas.');
  });

  onDispose(app.on('rules', renderRules));
  onDispose(app.on('notices', renderFired));
  renderRules();
  renderFired();
}
