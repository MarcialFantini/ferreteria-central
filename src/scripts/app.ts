// App shell controller. Runs once; the ClientRouter keeps it (and the simulation) alive across views.
import { navigate } from 'astro:transitions/client';
import { CLIENTS } from '../data/dataset';
import { dayLabel, clockLabel } from '../data/live';
import { NAV } from '../data/nav';
import { periodTitle, segmentLabel, PERIOD_LABEL, type Filters } from '../data/selectors';
import { formatInt } from '../lib/format';
import { gsap, reducedMotion } from './motion';
import { app, uid, type Speed } from './state';
import { store } from './store';
import { engine } from './engine';
import { startAlerts } from './alerts';
import { toast, unreadCount } from './notify';
import { mountFilters } from './filters';
import { disposeView } from './lifecycle';
import { viewActions } from './view-actions';
import { exportChart } from './export';

const root = document.documentElement;
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);

type ViewModule = { mount: (main: HTMLElement) => void | Promise<void> };
const VIEWS: Record<string, () => Promise<ViewModule>> = {
  resumen: () => import('./views/resumen'),
  'en-vivo': () => import('./views/live'),
  clientes: () => import('./views/clients'),
  cliente: () => import('./views/client'),
  productos: () => import('./views/products'),
  vendedores: () => import('./views/sellers'),
  vendedor: () => import('./views/seller'),
  pedidos: () => import('./views/orders'),
  objetivos: () => import('./views/goals'),
  alertas: () => import('./views/alerts'),
};

// ---------- Theme ----------
function applyTheme(): void {
  let theme = 'night';
  try {
    theme = localStorage.getItem('mc-theme') === 'paper' ? 'paper' : 'night';
  } catch {
    /* storage unavailable */
  }
  root.dataset['theme'] = theme;
  $('meta[name="theme-color"]')?.setAttribute('content', theme === 'paper' ? '#f1ede4' : '#07090e');
  $('[data-action="theme"]')?.setAttribute('aria-label', theme === 'paper' ? 'Cambiar a vista noche' : 'Cambiar a vista papel');
}

export function toggleTheme(): void {
  const next = root.dataset['theme'] === 'paper' ? 'night' : 'paper';
  try {
    localStorage.setItem('mc-theme', next);
  } catch {
    /* the choice lasts for this visit only */
  }
  applyTheme();
  // Storage may be blocked: apply the choice directly too.
  root.dataset['theme'] = next;
}

// ---------- Live chrome: today ticker, clock, pill ----------
const todayValue = { n: 0 };
function mountLiveChrome(): void {
  const valueEl = $('[data-today-value]');
  const clock = $('[data-sim-clock]');
  const dayEl = $('[data-sim-day]');
  const render = () => {
    if (valueEl) valueEl.textContent = `$ ${formatInt(todayValue.n)}`;
  };
  const setTarget = (animate: boolean) => {
    const target = engine.todayTotal();
    if (!animate || reducedMotion()) {
      todayValue.n = target;
      render();
      return;
    }
    gsap.to(todayValue, { n: target, duration: 0.9, ease: 'power2.out', onUpdate: render, overwrite: true });
    valueEl?.classList.remove('is-bump');
    void valueEl?.offsetWidth;
    valueEl?.classList.add('is-bump');
  };
  const tick = () => {
    if (clock) clock.textContent = clockLabel(engine.minute);
    if (dayEl) dayEl.textContent = dayLabel(engine.day);
  };
  const syncState = () => {
    const paused = engine.paused;
    root.classList.toggle('is-paused', paused);
    const label = $('[data-live-label]');
    if (label) label.textContent = paused ? 'En pausa' : 'En vivo';
    const btn = $('[data-action="pause"]');
    btn?.setAttribute('aria-pressed', String(paused));
    btn?.setAttribute('aria-label', paused ? 'Reanudar simulación' : 'Pausar simulación');
    $('[data-icon-pause]')?.toggleAttribute('hidden', paused);
    $('[data-icon-play]')?.toggleAttribute('hidden', !paused);
    document.querySelectorAll<HTMLElement>('[data-speed]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset['speed']) === engine.speed)));
  };
  engine.on('order', () => setTarget(true), { persistent: true });
  engine.on('day', () => setTarget(false), { persistent: true });
  engine.on('tick', tick, { persistent: true });
  engine.on('state', syncState, { persistent: true });
  setTarget(false);
  tick();
  syncState();

  $('[data-action="pause"]')?.addEventListener('click', () => engine.togglePause());
  document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((b) =>
    b.addEventListener('click', () => engine.setSpeed(Number(b.dataset['speed']) as Speed)),
  );
}

// ---------- Notifications centre ----------
function mountNotices(): void {
  const panel = $('[data-notices]');
  const list = $('[data-notices-list]');
  const badge = $('[data-unread]');
  const navBadge = $('[data-alert-badge]');
  const btn = $<HTMLButtonElement>('[data-action="notices"]');
  let lastCount = unreadCount();

  const render = () => {
    const n = unreadCount();
    if (badge) {
      badge.hidden = n === 0;
      badge.textContent = n > 9 ? '9+' : String(n);
    }
    if (navBadge) {
      navBadge.hidden = n === 0;
      navBadge.textContent = String(n);
    }
    btn?.setAttribute('aria-label', n ? `Notificaciones, ${n} sin leer` : 'Notificaciones');
    if (n > lastCount && btn && !reducedMotion()) {
      btn.classList.remove('is-ringing');
      void btn.offsetWidth;
      btn.classList.add('is-ringing');
    }
    lastCount = n;
    if (!list || panel?.hidden) return;
    const notices = app.get().notices;
    list.innerHTML = notices.length
      ? notices
          .map((x) => {
            const tag = x.href ? 'a' : 'div';
            return `<li><${tag} class="notice${x.read ? '' : ' is-unread'}"${x.href ? ` href="${x.href}"` : ''}><span class="notice-dot"></span><span class="notice-title"></span><span class="notice-time">${clockLabel(x.minute)}</span><span class="notice-body"></span></${tag}></li>`;
          })
          .join('')
      : '<li class="notices-empty">Sin notificaciones por ahora.</li>';
    // Text via textContent (notice text can include client names).
    list.querySelectorAll('.notice').forEach((el, i) => {
      const x = notices[i];
      if (!x) return;
      const t = el.querySelector('.notice-title');
      const b = el.querySelector('.notice-body');
      if (t) t.textContent = x.title;
      if (b) b.textContent = x.body;
    });
  };

  const close = () => {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    btn?.setAttribute('aria-expanded', 'false');
    app.update('notices', (l) => l.map((x) => ({ ...x, read: true })));
  };
  const open = () => {
    if (!panel) return;
    panel.hidden = false;
    btn?.setAttribute('aria-expanded', 'true');
    render();
    panel.querySelector<HTMLElement>('button, a')?.focus();
  };
  btn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (panel?.hidden) open();
    else close();
  });
  $('[data-action="read-all"]')?.addEventListener('click', () => {
    app.update('notices', (l) => l.map((x) => ({ ...x, read: true })));
    render();
  });
  document.addEventListener('click', (e) => {
    if (panel && !panel.hidden && !panel.contains(e.target as Node)) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel && !panel.hidden) {
      close();
      btn?.focus();
    }
  });
  panel?.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a')) close();
  });
  app.on('notices', render);
  render();
  shell.toggleNotices = () => (panel?.hidden ? open() : close());
}

// ---------- Saved views ----------
const sameFilters = (a: Filters, b: Filters) => a.period === b.period && a.seller === b.seller && a.province === b.province;

function mountSavedViews(): void {
  const list = $('[data-saved-views]');
  const render = () => {
    if (!list) return;
    const views = app.get().savedViews;
    const now = store.get();
    list.innerHTML = views.length
      ? views
          .map(
            (v) =>
              `<li><button type="button" class="saved-link${sameFilters(v.filters, now) ? ' is-active' : ''}" data-apply-view="${v.id}" title="${PERIOD_LABEL[v.filters.period]} · ${segmentLabel(v.filters)}"></button><button type="button" class="saved-del" data-del-view="${v.id}" aria-label="Eliminar vista">×</button></li>`,
          )
          .join('')
      : '<li class="saved-empty">Guardá combinaciones de filtros para volver a ellas.</li>';
    list.querySelectorAll<HTMLElement>('[data-apply-view]').forEach((b, i) => {
      b.textContent = views[i]?.name ?? '';
    });
  };
  list?.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const apply = t.closest<HTMLElement>('[data-apply-view]');
    const del = t.closest<HTMLElement>('[data-del-view]');
    if (apply) {
      const v = app.get().savedViews.find((x) => x.id === apply.dataset['applyView']);
      if (v) {
        store.set(v.filters);
        toast(`Vista "${v.name}" aplicada`, `${periodTitle(v.filters.period)} · ${segmentLabel(v.filters)}`);
      }
    }
    if (del) {
      const v = app.get().savedViews.find((x) => x.id === del.dataset['delView']);
      app.update('savedViews', (l) => l.filter((x) => x.id !== del.dataset['delView']));
      if (v) toast(`Vista "${v.name}" eliminada`, '', { action: { label: 'Deshacer', run: () => app.update('savedViews', (l) => [...l, v]) } });
    }
  });
  $('[data-action="save-view"]')?.addEventListener('click', () => saveCurrentView());
  app.on('savedViews', render);
  store.subscribe(render, { persistent: true });
  render();
}

export function saveCurrentView(): void {
  const f = store.get();
  const name = `${PERIOD_LABEL[f.period]} · ${segmentLabel(f)}`;
  if (app.get().savedViews.some((v) => sameFilters(v.filters, f))) {
    toast('Esa vista ya está guardada', name);
    return;
  }
  app.update('savedViews', (l) => [...l, { id: uid('v'), name, filters: { ...f } }]);
  toast('Vista guardada', name, { tone: 'success' });
}

// ---------- Menu drawer & filters sheet (mobile) ----------
function mountDrawers(): void {
  const scrim = $('[data-scrim]');
  const setMenu = (open: boolean) => {
    root.classList.toggle('is-menu-open', open);
    if (scrim) scrim.hidden = !open;
    document.querySelectorAll('[data-action="menu"]').forEach((b) => b.setAttribute('aria-expanded', String(open)));
    if (open) $<HTMLElement>('.sidebar .nav-link')?.focus();
  };
  document.querySelectorAll('[data-action="menu"]').forEach((b) =>
    b.addEventListener('click', () => setMenu(!root.classList.contains('is-menu-open'))),
  );
  scrim?.addEventListener('click', () => setMenu(false));
  $('.sidebar')?.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('is-menu-open')) setMenu(false);
  });
  const fbtn = $('[data-action="filters"]');
  fbtn?.addEventListener('click', () => {
    const open = !root.classList.contains('is-filters-open');
    root.classList.toggle('is-filters-open', open);
    fbtn.setAttribute('aria-expanded', String(open));
  });
}

// ---------- Reset ----------
function resetDemo(): void {
  toast('¿Reiniciar la demo?', 'Se borran vistas, objetivos, alertas y notificaciones guardadas.', {
    tone: 'alert',
    ms: 8000,
    action: {
      label: 'Reiniciar',
      run: () => {
        app.reset();
        try {
          localStorage.removeItem('mc-theme');
        } catch {
          /* ignore */
        }
        location.reload();
      },
    },
  });
}

// ---------- Export & presentation (delegated to the mounted view) ----------
async function doExport(): Promise<void> {
  const target =
    viewActions().exportTarget?.() ??
    (() => {
      const el = document.querySelector('main [data-export]');
      return el ? { el, title: el.getAttribute('data-export') ?? 'Gráfico', slug: 'grafico' } : null;
    })();
  if (!target) {
    toast('No hay un gráfico para exportar en esta vista');
    return;
  }
  const svg = target.el instanceof SVGSVGElement ? target.el : target.el.querySelector('svg');
  if (!svg) return;
  await exportChart(svg, target.title, target.slug);
  toast('Imagen exportada', `${target.title} · PNG generado en el navegador`, { tone: 'success' });
}

function doPresent(): void {
  const present = viewActions().present;
  if (present) present();
  else {
    sessionStorage.setItem('mc-present', '1');
    void navigate('/');
  }
}

// ---------- Keyboard shortcuts ----------
let gPending = 0;
const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

async function openPalette(): Promise<void> {
  const m = await import('./palette');
  m.openPalette();
}

function mountShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      void openPalette();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || root.classList.contains('is-presenting')) return;
    if (gPending && Date.now() - gPending < 1200) {
      gPending = 0;
      const item = NAV.find((n) => n.key === e.key.toLowerCase());
      if (item) {
        e.preventDefault();
        void navigate(item.href);
      }
      return;
    }
    switch (e.key) {
      case 'g':
        gPending = Date.now();
        break;
      case '/': {
        e.preventDefault();
        const search = document.querySelector<HTMLInputElement>('main [data-search]');
        if (search) search.focus();
        else void openPalette();
        break;
      }
      case '?':
        void import('./palette').then((m) => m.openHelp());
        break;
      case 't':
        toggleTheme();
        break;
      case 'n':
        shell.toggleNotices();
        break;
      case '.':
        engine.togglePause();
        toast(engine.paused ? 'Simulación en pausa' : 'Simulación en marcha');
        break;
      case '1':
      case '4':
      case '0':
        engine.setSpeed(e.key === '1' ? 1 : e.key === '4' ? 4 : 10);
        toast(`Velocidad ${engine.speed}x`);
        break;
    }
  });
}

// ---------- Views ----------
function syncNav(): void {
  const path = location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((a) => {
    const href = a.dataset['nav'] ?? '';
    const on = href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

async function mountView(): Promise<void> {
  syncNav();
  root.classList.remove('is-menu-open', 'is-filters-open');
  const scrim = $('[data-scrim]');
  if (scrim) scrim.hidden = true;
  const main = $('main[data-view]');
  const name = main?.dataset['view'] ?? '';
  const loader = VIEWS[name];
  if (!main || !loader) return;
  try {
    const mod = await loader();
    await mod.mount(main);
  } catch (err) {
    console.warn('view failed to mount', err);
  }
  root.classList.add('is-ready');
}

export const shell = {
  toggleNotices: () => {},
  toggleTheme,
  saveCurrentView,
  resetDemo,
  doExport,
  doPresent,
  openPalette,
};

function boot(): void {
  applyTheme();
  mountFilters();
  mountLiveChrome();
  mountNotices();
  mountSavedViews();
  mountDrawers();
  mountShortcuts();
  startAlerts();
  engine.start();

  $('[data-action="theme"]')?.addEventListener('click', toggleTheme);
  $('[data-action="reset"]')?.addEventListener('click', resetDemo);
  $('[data-action="export"]')?.addEventListener('click', () => void doExport());
  $('[data-action="present"]')?.addEventListener('click', doPresent);
  $('[data-action="palette"]')?.addEventListener('click', () => void openPalette());

  document.addEventListener('astro:before-swap', () => disposeView());
  document.addEventListener('astro:after-swap', () => {
    applyTheme();
    root.classList.add('js');
    if (sessionStorage.getItem('mc-showcase') === '1') root.classList.add('is-showcase');
  });
  document.addEventListener('astro:page-load', () => void mountView());

  if (root.classList.contains('is-showcase')) void import('./showcase').then((m) => m.startShowcase());
}

// Expose a tiny debugging handle (no globals otherwise).
Object.defineProperty(window, '__mc', { value: { engine, app, clients: CLIENTS.length }, configurable: true });
Object.defineProperty(window, '__mcBooted', { value: true, configurable: true });

boot();
