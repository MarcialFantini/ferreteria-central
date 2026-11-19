import { productRace, type RaceFrame } from '../../data/selectors';
import { PRODUCTS } from '../../data/dataset';
import { raceBox, raceGeometry, raceLayout, raceSVG, type RaceBox } from '../../render/race';
import { miniSpark } from '../../render/sparkline';
import { formatCompact, formatMoney } from '../../lib/format';
import { gsap, dur, reducedMotion, type Scene } from '../motion';
import { store } from '../store';
import { observeResize, onDispose } from '../lifecycle';
import { hideTip, showTip } from '../tooltip';

export function mountRace(el: HTMLElement): Scene {
  const q = <T extends Element = HTMLElement>(sel: string) => el.querySelector<T>(sel);
  const host = q('[data-race-chart]');
  const toggle = q<HTMLButtonElement>('[data-race-toggle]');
  const progress = q('[data-race-progress]');
  let frames: RaceFrame[] = productRace(store.get());
  let index = frames.length - 1;
  let box: RaceBox = raceBox(1100, 560);
  let playing = false;
  let timer: gsap.core.Tween | null = null;

  const frameSeconds = () => Math.min(0.9, Math.max(0.28, 7 / Math.max(1, frames.length)));

  const setPlaying = (on: boolean) => {
    playing = on;
    toggle?.setAttribute('aria-pressed', String(on));
    const label = q('[data-race-label]');
    if (label) label.textContent = on ? 'Pausa' : index >= frames.length - 1 ? 'Reproducir' : 'Seguir';
    q('[data-icon-play]')?.toggleAttribute('hidden', on);
    q('[data-icon-pause]')?.toggleAttribute('hidden', !on);
    if (!on) timer?.kill();
  };

  const updateChrome = () => {
    const week = q('[data-race-week]');
    if (week) week.textContent = frames[index]?.label ?? '';
    if (progress) progress.style.transform = `scaleX(${frames.length > 1 ? index / (frames.length - 1) : 1})`;
  };

  const render = () => {
    if (!host) return;
    const r = host.getBoundingClientRect();
    if (r.width < 10) return;
    box = raceBox(Math.round(r.width), Math.round(r.height));
    host.innerHTML = raceSVG(frames[index]?.totals ?? [], box);
    updateChrome();
  };

  const goTo = (i: number, seconds: number) => {
    index = Math.max(0, Math.min(frames.length - 1, i));
    const totals = frames[index]?.totals ?? [];
    const layout = raceLayout(totals, box);
    const g = raceGeometry(box);
    // Bars settle before the next week starts, so labels never stay overlapped.
    const d = dur(seconds * 0.7);
    host?.querySelectorAll<SVGGElement>('[data-bar]').forEach((bar) => {
      const b = layout[Number(bar.dataset['bar'])];
      if (!b) return;
      bar.classList.toggle('is-leader', b.rank === 0);
      // Off-screen bars skip tweening (cheap frames, only ~11 bars move).
      const wasVisible = bar.getAttribute('opacity') !== '0';
      if (!b.visible && !wasVisible) return;
      gsap.to(bar, { y: b.y, opacity: b.visible ? 1 : 0, duration: d, ease: 'power2.inOut', overwrite: 'auto' });
      const rect = bar.querySelector('rect');
      if (rect) gsap.to(rect, { attr: { width: b.barWidth }, duration: d, ease: 'power2.inOut', overwrite: 'auto' });
      const value = bar.querySelector<SVGTextElement>('[data-value]');
      if (value) {
        value.textContent = formatCompact(b.value);
        if (!box.compact) gsap.to(value, { attr: { x: g.barX + b.barWidth + 12 }, duration: d, ease: 'power2.inOut', overwrite: 'auto' });
      }
      bar.setAttribute('opacity', b.visible ? '1' : '0');
    });
    updateChrome();
  };

  const tick = () => {
    if (!playing) return;
    if (index >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    goTo(index + 1, frameSeconds());
    timer = gsap.delayedCall(frameSeconds(), tick);
  };

  const play = (fromStart: boolean) => {
    if (fromStart || index >= frames.length - 1) {
      index = 0;
      render();
    }
    setPlaying(true);
    if (reducedMotion()) {
      // Static version: jump to the final standings.
      goTo(frames.length - 1, 0);
      setPlaying(false);
      return;
    }
    timer = gsap.delayedCall(0.2, tick);
  };

  toggle?.addEventListener('click', () => (playing ? setPlaying(false) : play(false)));
  q('[data-race-restart]')?.addEventListener('click', () => play(true));

  host?.addEventListener('pointermove', (e) => {
    const bar = (e.target as Element).closest<SVGGElement>('[data-bar]');
    if (!bar) return hideTip();
    const i = Number(bar.dataset['bar']);
    const product = PRODUCTS[i];
    const series = frames.map((f, k) => (f.totals[i] ?? 0) - (frames[k - 1]?.totals[i] ?? 0));
    showTip(
      {
        title: `${product?.name ?? ''} · ${product?.category ?? ''}`,
        value: formatCompact(frames[index]?.totals[i] ?? 0),
        chart: miniSpark(series, index, 220, 56),
        hint: 'Facturación semanal del período',
      },
      e.clientX,
      e.clientY,
    );
  });
  host?.addEventListener('pointerleave', hideTip);

  observeResize(host ?? el, render);
  onDispose(() => timer?.kill());

  const renderTable = () => {
    const tbody = q('[data-race-table] tbody');
    const totals = frames[frames.length - 1]?.totals ?? [];
    if (!tbody) return;
    tbody.innerHTML = totals
      .map((v, i) => ({ v, p: PRODUCTS[i] }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 10)
      .map((r) => `<tr><th scope="row">${r.p?.name ?? ''}</th><td>${r.p?.category ?? ''}</td><td>${formatMoney(r.v)}</td></tr>`)
      .join('');
  };

  store.subscribe((next) => {
    setPlaying(false);
    frames = productRace(next);
    renderTable();
    play(true);
  });

  render();

  return {
    id: 'race',
    el,
    enter: () => play(true),
    exportTarget: () => {
      const svg = host?.querySelector('svg');
      return svg ? { el: svg, title: `Ranking de productos · ${frames[index]?.label ?? ''}` } : null;
    },
  };
}
