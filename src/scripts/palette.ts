// Command palette (Ctrl/Cmd+K): clients, products, provinces, sellers, views and actions.
// Loaded on first use so it never weighs on the first paint.
import { navigate } from 'astro:transitions/client';
import { CLIENTS, PRODUCTS, PROVINCES } from '../data/dataset';
import { SELLERS } from '../data/catalog';
import { NAV } from '../data/nav';
import { store } from './store';
import { engine } from './engine';
import { shell } from './app';
import { toast } from './notify';
import { esc } from './table';

interface Item {
  group: string;
  label: string;
  hint?: string;
  keys: string;
  run: () => void;
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const go = (href: string) => () => void navigate(href);

function buildItems(): Item[] {
  const items: Item[] = [];
  const action = (label: string, hint: string, run: () => void) => items.push({ group: 'Acciones', label, hint, keys: norm(`${label} ${hint}`), run });
  action(engine.paused ? 'Reanudar la simulación' : 'Pausar la simulación', 'Tecla .', () => engine.togglePause());
  action('Velocidad 1x', 'Tecla 1', () => engine.setSpeed(1));
  action('Velocidad 4x', 'Tecla 4', () => engine.setSpeed(4));
  action('Velocidad 10x', 'Tecla 0', () => engine.setSpeed(10));
  action('Cambiar vista noche / papel', 'Tecla t', () => shell.toggleTheme());
  action('Guardar la vista actual', 'Filtros', () => shell.saveCurrentView());
  action('Exportar imagen del gráfico', 'PNG', () => void shell.doExport());
  action('Modo presentación', 'Pantalla completa', () => shell.doPresent());
  action('Crear una alerta', 'Alertas', go('/alertas'));
  action('Ver notificaciones', 'Tecla n', () => shell.toggleNotices());
  action('Atajos de teclado', 'Tecla ?', () => openHelp());
  action('Reiniciar demo', 'Borra lo guardado', () => shell.resetDemo());
  action('Quitar filtros', 'Período mes, todo el equipo', () => store.set({ period: 'mes', seller: 'all', province: 'all' }));
  for (const p of [['mes', 'Período: mes'], ['trimestre', 'Período: trimestre'], ['anio', 'Período: año']] as const)
    action(p[1], 'Filtro global', () => store.set({ period: p[0] }));

  for (const n of NAV) items.push({ group: 'Ir a', label: n.label, hint: `g ${n.key}`, keys: norm(`ir ${n.label}`), run: go(n.href) });
  for (const s of SELLERS)
    items.push({ group: 'Vendedores', label: s.name, hint: s.region, keys: norm(`${s.name} ${s.region} vendedor`), run: go(`/vendedores/${s.id}`) });
  for (const p of PROVINCES)
    items.push({
      group: 'Provincias',
      label: p.name,
      hint: 'Filtrar todo por esta provincia',
      keys: norm(`${p.name} provincia`),
      run: () => {
        store.set({ province: p.id });
        toast(`Filtro: ${p.name}`, 'Todas las vistas se actualizaron.');
      },
    });
  for (const c of CLIENTS) items.push({ group: 'Clientes', label: c.name, hint: c.city, keys: norm(`${c.name} ${c.city}`), run: go(`/clientes/${c.id}`) });
  for (const p of PRODUCTS) items.push({ group: 'Productos', label: p.name, hint: p.category, keys: norm(`${p.name} ${p.category}`), run: go(`/productos?p=${p.id}`) });
  return items;
}

function score(item: Item, terms: string[]): number {
  let total = 0;
  for (const t of terms) {
    const i = item.keys.indexOf(t);
    if (i < 0) return -1;
    total += i === 0 ? 30 : item.keys[i - 1] === ' ' ? 20 : 8;
  }
  return total - item.label.length * 0.05;
}

let dialog: HTMLDialogElement | null = null;
let items: Item[] = [];
let results: Item[] = [];
let active = 0;

function ensureDialog(): HTMLDialogElement {
  if (dialog?.isConnected) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'palette';
  dialog.setAttribute('aria-label', 'Buscar o ejecutar una acción');
  dialog.innerHTML = `<div class="pal-box">
    <label class="pal-input"><span class="sr-only">Buscar</span><input type="text" placeholder="Buscá clientes, productos, provincias o acciones…" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" autocomplete="off" spellcheck="false"></label>
    <ul class="pal-list" id="pal-list" role="listbox"></ul>
    <p class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> moverse</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> cerrar</span></p>
  </div>`;
  document.body.append(dialog);
  const input = dialog.querySelector('input') as HTMLInputElement;
  const list = dialog.querySelector('ul') as HTMLUListElement;

  const render = () => {
    const terms = norm(input.value).split(/\s+/).filter(Boolean);
    results = terms.length
      ? items
          .map((it) => ({ it, s: score(it, terms) }))
          .filter((x) => x.s >= 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, 40)
          .map((x) => x.it)
      : items.filter((it) => it.group === 'Acciones' || it.group === 'Ir a').slice(0, 24);
    active = Math.min(active, Math.max(0, results.length - 1));
    let lastGroup = '';
    list.innerHTML = results.length
      ? results
          .map((it, i) => {
            const head = it.group !== lastGroup ? `<li class="pal-group" role="presentation">${esc(it.group)}</li>` : '';
            lastGroup = it.group;
            return `${head}<li class="pal-item${i === active ? ' is-active' : ''}" role="option" id="pal-${i}" aria-selected="${i === active}" data-i="${i}"><span>${esc(it.label)}</span><small>${esc(it.hint ?? '')}</small></li>`;
          })
          .join('')
      : '<li class="pal-empty">Sin resultados.</li>';
    input.setAttribute('aria-activedescendant', results.length ? `pal-${active}` : '');
    list.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
  };

  const run = (i: number) => {
    const it = results[i];
    if (!it) return;
    dialog?.close();
    it.run();
  };

  input.addEventListener('input', () => {
    active = 0;
    render();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % Math.max(1, results.length);
      render();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      run(active);
    }
  });
  list.addEventListener('click', (e) => {
    const li = (e.target as Element).closest<HTMLElement>('[data-i]');
    if (li) run(Number(li.dataset['i']));
  });
  list.addEventListener('pointermove', (e) => {
    const li = (e.target as Element).closest<HTMLElement>('[data-i]');
    if (li && Number(li.dataset['i']) !== active) {
      active = Number(li.dataset['i']);
      render();
    }
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog?.close();
  });
  (dialog as HTMLDialogElement & { render?: () => void }).render = render;
  return dialog;
}

export function openPalette(): void {
  const d = ensureDialog();
  items = buildItems();
  active = 0;
  const input = d.querySelector('input') as HTMLInputElement;
  input.value = '';
  (d as HTMLDialogElement & { render?: () => void }).render?.();
  if (!d.open) d.showModal();
  input.focus();
}

let help: HTMLDialogElement | null = null;

export function openHelp(): void {
  if (!help?.isConnected) {
    help = document.createElement('dialog');
    help.className = 'palette help';
    help.setAttribute('aria-labelledby', 'help-title');
    const rows: [string, string][] = [
      ['Ctrl / ⌘ + K', 'Buscar o ejecutar una acción'],
      ['/', 'Buscar en la vista (o abrir el buscador)'],
      ['g, luego r · l · c · p · v · o · g · a', 'Ir a Resumen, En vivo, Clientes, Productos, Vendedores, Pedidos, Objetivos, Alertas'],
      ['.', 'Pausar o reanudar la simulación'],
      ['1 · 4 · 0', 'Velocidad 1x, 4x o 10x'],
      ['t', 'Vista noche / papel'],
      ['n', 'Notificaciones'],
      ['← →', 'En modo presentación: escena anterior o siguiente'],
      ['?', 'Esta ayuda'],
    ];
    help.innerHTML = `<div class="pal-box help-box"><h2 id="help-title">Atajos de teclado</h2><dl>${rows.map(([k, v]) => `<div><dt><kbd>${esc(k)}</kbd></dt><dd>${esc(v)}</dd></div>`).join('')}</dl><button type="button" class="btn" data-close>Cerrar</button></div>`;
    document.body.append(help);
    help.querySelector('[data-close]')?.addEventListener('click', () => help?.close());
    help.addEventListener('click', (e) => {
      if (e.target === help) help?.close();
    });
  }
  help.showModal();
}
