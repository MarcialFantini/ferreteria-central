import { DEFAULT_FILTERS, heroData, periodTitle, segmentLabel, type Filters } from '../../data/selectors';
import { buildReels, odometerHTML, odometerWidth } from '../../render/odometer';
import { sparkGeometry } from '../../render/sparkline';
import { formatCompact, formatInt, formatMoney, formatSignedPercent } from '../../lib/format';
import { gsap, dur, type Scene } from '../motion';
import { store } from '../store';

const KICKER: Record<Filters['period'], string> = {
  mes: 'Facturación del mes',
  trimestre: 'Facturación del trimestre',
  anio: 'Facturación de los últimos 12 meses',
};

export function mountHero(el: HTMLElement): Scene {
  const q = <T extends Element = HTMLElement>(sel: string) => el.querySelector<T>(sel);
  const odo = q('[data-odometer]');
  const reelsBox = q('[data-reels]');
  const path = q<SVGPathElement>('[data-spark-path]');
  const cover = q('[data-spark-cover]');
  const peakDot = q('[data-spark-peak]');
  const peakLabel = q('[data-spark-peak-label]');
  const endDot = q('[data-spark-end]');
  let current = Number(odo?.dataset['value'] ?? 0);

  const rollReels = (delay = 0) => {
    const reels = reelsBox?.querySelectorAll<HTMLElement>('.odo-reel') ?? [];
    reels.forEach((reel, i) => {
      const steps = Number(reel.dataset['steps'] ?? 0);
      const count = steps + 1;
      const target = steps === 0 ? 0 : -(steps / count) * 100;
      gsap.fromTo(
        reel,
        { yPercent: 0, y: 0 },
        {
          yPercent: target,
          duration: dur(1.6 + (reels.length - i) * 0.08),
          ease: 'power3.out',
          delay: dur(delay + i * 0.04),
        },
      );
    });
  };

  const drawSpark = (delay = 0) => {
    // A background-coloured cover slides away (transform only), revealing the line left to right.
    if (cover) gsap.fromTo(cover, { scaleX: 1 }, { scaleX: 0, duration: dur(1.8), ease: 'power2.inOut', delay: dur(delay) });
    gsap.fromTo(
      [peakDot, peakLabel, endDot],
      { opacity: 0, scale: 0.6 },
      { opacity: 1, scale: 1, duration: dur(0.5), ease: 'back.out(2)', delay: dur(delay + 1.5), stagger: 0.1 },
    );
  };

  const setText = (sel: string, text: string) => {
    const node = q(sel);
    if (node) node.textContent = text;
  };

  const render = (filters: Filters, animate: boolean) => {
    const hero = heroData(filters);
    setText('[data-hero-kicker]', KICKER[filters.period]);
    setText('[data-hero-period]', periodTitle(filters.period));
    setText('[data-hero-seller]', segmentLabel(filters));
    setText('[data-hero-sr]', formatMoney(hero.total));
    setText('[data-kpi="yoy"]', formatSignedPercent(hero.yoy));
    q('[data-kpi="yoy"]')?.setAttribute('data-positive', String(hero.yoy >= 0));
    setText('[data-kpi="orders"]', formatInt(hero.orders));
    setText('[data-kpi="clients"]', String(hero.activeClients));
    setText('[data-spark-unit]', hero.seriesUnit);
    setText('[data-spark-start]', hero.seriesLabels[0] ?? '');
    setText('[data-spark-end-label]', hero.seriesLabels[hero.seriesLabels.length - 1] ?? '');
    setText('[data-spark-peak-day]', `Pico · ${hero.seriesLabels[hero.peakIndex] ?? ''}`);
    setText('[data-spark-peak-value]', formatCompact(hero.series[hero.peakIndex] ?? 0));

    // Same figure (e.g. a replay after mount): leave the odometer alone.
    if (hero.total === current) animate = false;
    else {
      const reels = buildReels(hero.total, animate ? current : null);
      current = hero.total;
      if (reelsBox) reelsBox.innerHTML = odometerHTML(reels);
      odo?.style.setProperty('--w', odometerWidth(reels));
    }

    const geo = sparkGeometry(hero.series);
    path?.setAttribute('d', geo.d);
    const peak = geo.points[hero.peakIndex];
    const last = geo.points[geo.points.length - 1];
    for (const [node, p] of [
      [peakDot, peak],
      [peakLabel, peak],
      [endDot, last],
    ] as const) {
      if (node && p) {
        node.style.left = `${p.x}%`;
        node.style.top = `${p.y}%`;
      }
    }
    if (animate) {
      rollReels();
      drawSpark(0.1);
    }
  };

  store.subscribe((next) => render(next, true));
  // Prerendered with default filters: adopt the saved ones before the entry animation.
  const f = store.get();
  if (f.period !== DEFAULT_FILTERS.period || f.seller !== DEFAULT_FILTERS.seller || f.province !== DEFAULT_FILTERS.province) render(f, false);

  return {
    id: 'hero',
    el,
    enter() {
      // Count up from zero again on every visit.
      const reels = buildReels(current, null);
      if (reelsBox) reelsBox.innerHTML = odometerHTML(reels);
      rollReels(0.15);
      drawSpark(0.35);
    },
    exportTarget: () => {
      const svg = q('[data-spark] svg');
      return svg ? { el: svg, title: 'Facturación del período' } : null;
    },
  };
}
