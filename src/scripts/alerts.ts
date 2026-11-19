// Alert rules evaluated against the live order stream. Fired rules become notices + toasts.
import type { LiveOrder } from '../data/live';
import { CLIENTS, PROVINCES } from '../data/dataset';
import { SELLERS } from '../data/catalog';
import { formatCompact, formatMoney } from '../lib/format';
import { app, type AlertRule } from './state';
import { engine } from './engine';
import { notice } from './notify';

const provinceName = (id: string) => PROVINCES.find((p) => p.id === id)?.name ?? id;
const sellerShort = (id: string) => SELLERS.find((s) => s.id === id)?.name ?? id;

const inScope = (r: AlertRule, o: LiveOrder) =>
  (r.seller === 'all' || r.seller === o.sellerId) && (r.province === 'all' || r.province === o.provinceId);

function fire(rule: AlertRule, title: string, body: string, href?: string): void {
  app.update('rules', (rules) =>
    rules.map((r) => (r.id === rule.id ? { ...r, firedOn: engine.day, fires: r.fires + 1 } : r)),
  );
  notice({ title, body, tone: 'alert', ...(href ? { href } : {}) });
}

/** Evaluate every enabled rule for one incoming order. Exported for "Probar regla". */
export function evaluate(o: LiveOrder): void {
  const rules = app.get().rules.filter((r) => r.enabled);
  if (!rules.length) return;
  let today: LiveOrder[] | null = null;
  const todays = () => (today ??= engine.todayOrders());

  for (const r of rules) {
    const firedToday = r.firedOn === engine.day;
    switch (r.metric) {
      case 'order_total': {
        if (inScope(r, o) && o.total >= r.threshold) {
          const client = CLIENTS[o.client];
          fire(r, `${r.name}: ${formatCompact(o.total)}`, `${client?.name ?? ''} · ${o.city} · pedido N.º ${o.id}`, `/clientes/${client?.id ?? ''}`);
        }
        break;
      }
      case 'today_revenue': {
        if (firedToday || !inScope(r, o)) break;
        const total = todays()
          .filter((x) => inScope(r, x))
          .reduce((s, x) => s + x.total, 0);
        if (total >= r.threshold) fire(r, `${r.name}: ${formatCompact(total)} hoy`, `Superó el umbral de ${formatMoney(r.threshold)}.`, '/en-vivo');
        break;
      }
      case 'province_orders': {
        if (firedToday || !inScope(r, o)) break;
        const n = todays().filter((x) => inScope(r, x)).length;
        if (n >= r.threshold)
          fire(r, `${r.name}: ${n} pedidos`, `${r.province === 'all' ? 'Todas las provincias' : provinceName(r.province)} superó ${r.threshold} pedidos hoy.`, '/en-vivo');
        break;
      }
      case 'seller_goal': {
        if (firedToday || (r.seller !== 'all' && r.seller !== o.sellerId)) break;
        const goal = r.seller === 'all' ? Object.values(app.get().goals).reduce((s, g) => s + g, 0) : (app.get().goals[r.seller] ?? 0);
        if (!goal) break;
        const pct = (engine.monthToDate(r.seller) / goal) * 100;
        if (pct >= r.threshold)
          fire(r, `${r.name}: ${Math.floor(pct)} %`, `${r.seller === 'all' ? 'El equipo' : sellerShort(r.seller)} llegó al ${Math.floor(pct)} % del objetivo de noviembre.`, '/objetivos');
        break;
      }
    }
  }
}

export function startAlerts(): void {
  engine.on('order', evaluate, { persistent: true });
  engine.on(
    'day',
    ({ closedTotal }) =>
      notice({ title: 'Cierre del día', body: `Se facturaron ${formatMoney(closedTotal)}. Arranca un nuevo día hábil.`, tone: 'success', href: '/en-vivo' }),
    { persistent: true },
  );
}
