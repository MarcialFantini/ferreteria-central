// A live order "landing" on an SVG map: a dot falls, then a ring ripples out. Attribute/transform tweens only.
import { gsap } from 'gsap';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function dropOrder(layer: SVGGElement, x: number, y: number, { big = false, max = 80, scale = 1 } = {}): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dot = document.createElementNS(SVG_NS, 'circle');
  dot.setAttribute('cx', x.toFixed(1));
  dot.setAttribute('cy', y.toFixed(1));
  dot.setAttribute('r', String((big ? 3.6 : 2.6) * scale));
  dot.setAttribute('class', big ? 'live-dot-svg is-big' : 'live-dot-svg');
  layer.append(dot);
  while (layer.querySelectorAll('.live-dot-svg').length > max) layer.querySelector('.live-dot-svg')?.remove();
  if (reduced) return;

  gsap.fromTo(dot, { y: -70 * scale, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'power3.in' });
  const ring = document.createElementNS(SVG_NS, 'circle');
  ring.setAttribute('cx', x.toFixed(1));
  ring.setAttribute('cy', y.toFixed(1));
  ring.setAttribute('r', String(2 * scale));
  ring.setAttribute('class', 'live-ring');
  layer.append(ring);
  gsap.fromTo(
    ring,
    { attr: { r: 2 * scale }, opacity: 0.9 },
    { attr: { r: (big ? 26 : 16) * scale }, opacity: 0, duration: 1.1, ease: 'power2.out', delay: 0.5, onComplete: () => ring.remove() },
  );
}
