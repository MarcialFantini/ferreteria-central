// Seller detail: live goal ring, editable goal, today's orders landing on the territory map.
import { monthProgress } from '../../data/sellers';
import { ringSVG, setRing } from '../../render/ring';
import { dropOrder } from '../../render/live-drop';
import { formatCompact, formatMoney } from '../../lib/format';
import { engine } from '../engine';
import { app } from '../state';
import { store } from '../store';
import { onDispose } from '../lifecycle';
import { toast } from '../notify';

export function mount(main: HTMLElement): void {
  const q = <T extends Element = HTMLElement>(sel: string) => main.querySelector<T>(sel);
  const id = q('[data-seller-id]')?.dataset['sellerId'] ?? '';
  const ringHost = q('[data-ring]');
  const input = q<HTMLInputElement>('[data-goal-input]');
  const drops = q<SVGGElement>('[data-live-drops]');
  if (!id) return;
  ringHost?.insertAdjacentHTML('afterbegin', ringSVG(0, 180, 14));

  const set = (sel: string, text: string) => {
    const n = q(sel);
    if (n) n.textContent = text;
  };

  const render = () => {
    const goal = app.get().goals[id] ?? 0;
    const mtd = engine.monthToDate(id);
    const pct = goal ? mtd / goal : 0;
    const progress = monthProgress(engine.day, engine.minute);
    const projection = progress > 0 ? mtd / progress : 0;
    setRing(ringHost?.querySelector('svg.ring') ?? null, pct);
    set('[data-pct]', `${Math.round(pct * 100)} %`);
    set('[data-mtd]', formatCompact(mtd));
    set('[data-projection]', `Proyección de cierre: ${formatCompact(projection)}`);
    set(
      '[data-goal-status]',
      projection >= goal
        ? `Al ritmo actual supera el objetivo por ${formatCompact(projection - goal)}.`
        : `Al ritmo actual le faltarían ${formatCompact(goal - projection)}.`,
    );
    const today = engine.todayOrders().filter((o) => o.sellerId === id);
    set('[data-today]', formatCompact(today.reduce((s, o) => s + o.total, 0)));
    set('[data-today-note]', `${today.length} pedidos hoy`);
    if (input && document.activeElement !== input) input.value = String(goal);
  };

  q('[data-goal-form]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = Math.max(0, Math.round(Number(input?.value ?? 0)));
    if (!value) return;
    app.update('goals', (g) => ({ ...g, [id]: value }));
    toast('Objetivo actualizado', `Nuevo objetivo: ${formatMoney(value)}`, { tone: 'success' });
  });
  q('[data-filter-seller]')?.addEventListener('click', () => store.set({ seller: id }));

  engine.on('order', (o) => {
    if (o.sellerId !== id) return;
    render();
    if (drops) dropOrder(drops, o.x, o.y, { big: o.total > 400_000, scale: 1.3 });
  });
  engine.on('day', render);
  onDispose(app.on('goals', render));
  render();
}
