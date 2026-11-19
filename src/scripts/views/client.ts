// Client detail: prerendered history + today's live orders for this client, as they arrive.
import { clockLabel, type LiveOrder } from '../../data/live';
import { formatMoney } from '../../lib/format';
import { engine } from '../engine';

export function mount(main: HTMLElement): void {
  const index = Number(main.querySelector<HTMLElement>('[data-client-index]')?.dataset['clientIndex'] ?? -1);
  const list = main.querySelector<HTMLElement>('[data-live-today]');
  const note = main.querySelector<HTMLElement>('[data-live-note]');
  if (index < 0 || !list) return;

  const item = (o: LiveOrder, isNew: boolean) =>
    `<li class="${isNew ? 'is-new' : ''}"><span class="tag tag--solid">Hoy ${clockLabel(o.minute)}</span><span>Pedido N.º ${o.id} · ${o.items.length} ${o.items.length === 1 ? 'producto' : 'productos'}</span><b class="num" style="margin-left:auto">${formatMoney(o.total)}</b></li>`;

  const render = (fresh?: LiveOrder) => {
    const today = engine.todayOrders().filter((o) => o.client === index);
    list.hidden = today.length === 0;
    list.innerHTML = today
      .slice()
      .reverse()
      .map((o) => item(o, o === fresh))
      .join('');
    if (note) note.textContent = today.length ? `y ${today.length} ${today.length === 1 ? 'pedido' : 'pedidos'} hoy en vivo` : '';
  };
  engine.on('order', (o) => {
    if (o.client === index) render(o);
  });
  engine.on('day', () => render());
  render();
}
