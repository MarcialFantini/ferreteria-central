// "Resumen": the five cinematic scenes, presentation mode and per-scene export.
import { gsap, isShowcase, reducedMotion, type Scene } from '../motion';
import { mountHero } from '../scenes/hero';
import { hideTip } from '../tooltip';
import { listen, onDispose } from '../lifecycle';
import { setViewActions } from '../view-actions';
import { store } from '../store';
import { DEFAULT_FILTERS } from '../../data/selectors';

type Mounter = (el: HTMLElement) => Scene;

const LOADERS: Record<string, () => Promise<Mounter>> = {
  hero: async () => mountHero,
  map: () => import('../scenes/map').then((m) => m.mountMap),
  yoy: () => import('../scenes/yoy').then((m) => m.mountYoy),
  race: () => import('../scenes/race').then((m) => m.mountRace),
  cohort: () => import('../scenes/cohort').then((m) => m.mountCohort),
};

const root = document.documentElement;
const idle = () =>
  new Promise<void>((resolve) => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => resolve(), { timeout: 600 });
    else setTimeout(resolve, 1);
  });

export async function mount(main: HTMLElement): Promise<void> {
  const scenes: Scene[] = [];
  const hud = document.querySelector<HTMLElement>('[data-hud]');
  let disposed = false;
  onDispose(() => {
    disposed = true;
    stopPresenting();
  });

  const activeIndex = () => {
    const mid = window.innerHeight / 2;
    const i = scenes.findIndex((s) => {
      const r = s.el.getBoundingClientRect();
      return r.top <= mid && r.bottom > mid;
    });
    return Math.max(0, i);
  };

  const goToScene = (i: number, replay: boolean) => {
    const scene = scenes[(i + scenes.length) % scenes.length];
    if (!scene) return;
    hideTip();
    window.scrollTo({ top: scene.el.offsetTop, behavior: reducedMotion() || isShowcase() ? 'auto' : 'smooth' });
    if (hud) hud.textContent = `${scenes.indexOf(scene) + 1} / ${scenes.length}`;
    if (!replay) return;
    gsap.delayedCall(isShowcase() ? 0.05 : 0.45, () => {
      if (isShowcase() && scene.showcase) scene.showcase();
      else scene.enter();
    });
  };

  // ---------- Presentation ----------
  const presentBtn = document.querySelector<HTMLButtonElement>('[data-action="present"]');
  const startPresenting = async () => {
    root.classList.add('is-presenting');
    presentBtn?.setAttribute('aria-pressed', 'true');
    try {
      await root.requestFullscreen?.();
    } catch {
      /* fullscreen can be refused; presentation still works in the window */
    }
    goToScene(activeIndex(), true);
  };
  function stopPresenting() {
    if (!root.classList.contains('is-presenting')) return;
    root.classList.remove('is-presenting');
    presentBtn?.setAttribute('aria-pressed', 'false');
    if (document.fullscreenElement) void document.exitFullscreen();
  }
  listen(document, 'fullscreenchange', () => {
    if (!document.fullscreenElement) stopPresenting();
  });
  listen(document, 'keydown', (ev) => {
    const e = ev as KeyboardEvent;
    if (!root.classList.contains('is-presenting')) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'SELECT') return;
    if (e.key === 'Escape') return stopPresenting();
    const next = ['ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key);
    const prev = ['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key);
    if (!next && !prev) return;
    e.preventDefault();
    const i = activeIndex();
    const to = next ? Math.min(scenes.length - 1, i + 1) : Math.max(0, i - 1);
    if (to !== i) goToScene(to, true);
  });

  setViewActions({
    present: () => (root.classList.contains('is-presenting') ? stopPresenting() : void startPresenting()),
    exportTarget: () => {
      const scene = scenes[activeIndex()];
      const t = scene?.exportTarget();
      return scene && t ? { el: t.el, title: t.title, slug: scene.id } : null;
    },
    scenes: { count: 5, go: (i) => goToScene(i, true) },
  });

  // ---------- Scenes ----------
  const els = [...main.querySelectorAll<HTMLElement>('[data-scene]')];
  const [first, ...rest] = els;
  if (first) {
    const hero = mountHero(first);
    scenes.push(hero);
    if (!isShowcase()) hero.enter();
  }
  await idle();
  if (disposed) return;
  const mounters = await Promise.all(rest.map((el) => LOADERS[el.dataset['scene'] ?? '']?.() ?? null));
  if (disposed) return;
  rest.forEach((el, i) => {
    const m = mounters[i];
    if (m) scenes.push(m(el));
  });
  // Pages are prerendered with default filters: bring every scene to the saved filters.
  store.replay(DEFAULT_FILTERS);

  if (sessionStorage.getItem('mc-present') === '1') {
    sessionStorage.removeItem('mc-present');
    void startPresenting();
  }
  if (isShowcase()) return;

  const { ScrollTrigger } = await import('../scroll');
  if (disposed) return;
  const triggers = scenes.slice(1).map((scene) =>
    ScrollTrigger.create({ trigger: scene.el, start: 'top 70%', once: true, onEnter: () => scene.enter() }),
  );
  onDispose(() => {
    triggers.forEach((t) => t.kill());
    ScrollTrigger.getAll().forEach((t) => t.kill());
  });
}
