import { yoyData, type YoyData } from '../../data/selectors';
import { yoyChart, type YoyGeometry } from '../../render/yoy';
import { miniSpark } from '../../render/sparkline';
import { formatCompact, formatMoney, formatSignedPercent } from '../../lib/format';
import { ScrollTrigger } from '../scroll';
import { gsap, dur, isPresenting, isShowcase, reducedMotion, type Scene } from '../motion';
import { store } from '../store';
import { observeResize, onDispose } from '../lifecycle';
import { hideTip, showTip } from '../tooltip';

export function mountYoy(el: HTMLElement): Scene {
  const q = <T extends Element = HTMLElement>(sel: string) => el.querySelector<T>(sel);
  const host = q('[data-yoy-chart]');
  const slider = q<HTMLInputElement>('[data-yoy-slider]');
  let data: YoyData = yoyData(store.get());
  let geo: YoyGeometry | null = null;
  const state = { cursor: data.labels.length - 1 };
  const last = () => data.labels.length - 1;

  const interp = (arr: number[], c: number) => {
    const i = Math.floor(c);
    const t = c - i;
    const a = arr[i] ?? 0;
    const b = arr[Math.min(i + 1, arr.length - 1)] ?? a;
    return a + (b - a) * t;
  };

  const paint = () => {
    if (!geo || !host) return;
    const c = Math.max(0, Math.min(last(), state.cursor));
    const x = interp(geo.xs, c);
    host.querySelector('[data-yoy-clip]')?.setAttribute('width', String(x + 10));
    const cursor = host.querySelector<SVGGElement>('[data-yoy-cursor]');
    cursor?.setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
    host.querySelector('[data-dot-current]')?.setAttribute('cy', interp(geo.ysCurrent, c).toFixed(1));
    host.querySelector('[data-dot-previous]')?.setAttribute('cy', interp(geo.ysPrevious, c).toFixed(1));

    const i = Math.round(c);
    host.querySelectorAll('.yoy-month').forEach((m) => m.classList.toggle('is-active', m.getAttribute('data-month') === String(i)));
    const cur = data.current[i] ?? 0;
    const prev = data.previous[i] ?? 0;
    const delta = prev ? cur / prev - 1 : 0;
    const set = (sel: string, text: string) => {
      const n = q(sel);
      if (n) n.textContent = text;
    };
    set('[data-yoy-month]', data.labels[i] ?? '');
    set('[data-yoy-current]', formatCompact(cur));
    set('[data-yoy-previous]', formatCompact(prev));
    set('[data-yoy-delta]', formatSignedPercent(delta));
    q('[data-yoy-delta]')?.setAttribute('data-positive', String(delta >= 0));
    if (slider && document.activeElement !== slider) slider.value = String(i);
    slider?.setAttribute('aria-valuetext', `${data.labels[i] ?? ''}: ${formatMoney(cur)}`);
  };

  const render = () => {
    if (!host) return;
    const { width, height } = host.getBoundingClientRect();
    if (width < 10) return;
    geo = yoyChart(data, Math.round(width), Math.round(height));
    host.innerHTML = geo.svg;
    paint();
  };

  const tween = (to: number, seconds: number, ease = 'power2.inOut') =>
    gsap.to(state, { cursor: to, duration: dur(seconds), ease, overwrite: true, onUpdate: paint });

  // Tooltip: hovering the chart snaps to the nearest month.
  host?.addEventListener('pointermove', (e) => {
    if (!geo) return;
    const r = host.getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = 0;
    geo.xs.forEach((x, i) => {
      if (Math.abs(x - px) < Math.abs((geo?.xs[best] ?? 0) - px)) best = i;
    });
    state.cursor = best;
    paint();
    const cur = data.current[best] ?? 0;
    const prev = data.previous[best] ?? 0;
    showTip(
      {
        title: `${data.labels[best] ?? ''} · este año`,
        value: formatCompact(cur),
        chart: miniSpark(data.current, best, 220, 56),
        rows: [
          ['Año anterior', formatCompact(prev)],
          ['Variación', formatSignedPercent(prev ? cur / prev - 1 : 0)],
        ],
      },
      e.clientX,
      e.clientY,
    );
  });
  host?.addEventListener('pointerleave', hideTip);

  slider?.addEventListener('input', () => {
    tween(Number(slider.value), 0.35, 'power2.out');
  });

  observeResize(host ?? el, render);

  // Scroll scrub: the curves draw as the scene scrolls into place.
  const scrub = ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    end: 'top 15%',
    onUpdate: (self) => {
      if (reducedMotion() || isPresenting() || isShowcase()) return;
      state.cursor = self.progress * last();
      paint();
    },
  });

  onDispose(() => scrub.kill());

  store.subscribe((next, prev) => {
    if (next.seller === prev.seller && next.province === prev.province) return;
    data = yoyData(next);
    render();
    const target = state.cursor;
    state.cursor = 0;
    tween(target, 1.2);
  });

  render();

  return {
    id: 'yoy',
    el,
    enter() {
      if (reducedMotion()) {
        state.cursor = last();
        paint();
        return;
      }
      // In normal scrolling the scrub drives the draw; elsewhere, play it.
      if (isPresenting() || isShowcase()) {
        state.cursor = 0;
        paint();
        tween(last(), 2.6, 'power1.inOut');
      }
    },
    exportTarget: () => {
      const svg = host?.querySelector('svg');
      return svg ? { el: svg, title: 'Facturación: este año contra el anterior' } : null;
    },
  };
}
