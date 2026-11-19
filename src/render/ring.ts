/** Progress ring (SVG). `pct` is 0..1+ (over 100 % shows a second lap marker). */
export function ringSVG(pct: number, size = 120, stroke = 10, label = ''): string {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  const over = pct > 1;
  return `<svg class="ring${over ? ' is-over' : ''}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${label || `${Math.round(pct * 100)} % del objetivo`}">
  <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none"/>
  <circle class="ring-value" data-ring-value cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none"
    stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - clamped)).toFixed(2)}" data-c="${c.toFixed(2)}"
    transform="rotate(-90 ${size / 2} ${size / 2})" stroke-linecap="round"/>
</svg>`;
}

/** Update an existing ring in place (keeps the CSS transition on stroke-dashoffset). */
export function setRing(svg: Element | null, pct: number): void {
  const v = svg?.querySelector<SVGCircleElement>('[data-ring-value]');
  if (!v) return;
  const c = Number(v.dataset['c']);
  v.setAttribute('stroke-dashoffset', (c * (1 - Math.max(0, Math.min(1, pct)))).toFixed(2));
  svg?.classList.toggle('is-over', pct > 1);
  svg?.setAttribute('aria-label', `${Math.round(pct * 100)} % del objetivo`);
}
