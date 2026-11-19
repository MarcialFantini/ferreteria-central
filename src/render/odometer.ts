// Odometer markup shared by the server render and the browser updates.
// Each digit is a "reel": a vertical strip of digits that a transform rolls into place.
import { formatInt } from '../lib/format';

export interface ReelSpec {
  /** Digits on the strip, top to bottom. The last one is the resting digit. */
  strip: number[];
}

/** Spins per position: rightmost digits turn the most, like a real counter. */
const spinsFor = (posFromRight: number): number => Math.max(0, 3 - Math.floor(posFromRight / 2));

export function buildReels(target: number, previous: number | null): (ReelSpec | string)[] {
  const next = formatInt(target);
  const prev = previous === null ? null : formatInt(previous);
  const sameShape = prev !== null && prev.length === next.length;
  const digitsTotal = next.replace(/\D/g, '').length;
  let digitPos = 0;
  return [...next].map((ch, i) => {
    if (!/\d/.test(ch)) return ch;
    const to = Number(ch);
    const prevCh = sameShape ? prev?.[i] : undefined;
    const from = prevCh && /\d/.test(prevCh) ? Number(prevCh) : 0;
    const posFromRight = digitsTotal - 1 - digitPos++;
    const spins = previous === null ? spinsFor(posFromRight) : Math.min(1, spinsFor(posFromRight));
    const steps = spins * 10 + ((to - from + 10) % 10);
    return { strip: Array.from({ length: steps + 1 }, (_, k) => (from + k) % 10) };
  });
}

/** Static HTML: reels already resting on their final digit (works without JS). */
export function odometerHTML(reels: (ReelSpec | string)[]): string {
  return reels
    .map((r) => {
      if (typeof r === 'string') return `<span class="odo-sep">${r}</span>`;
      const last = r.strip.length - 1;
      const shift = last === 0 ? 0 : -(last / r.strip.length) * 100;
      return `<span class="odo-digit"><span class="odo-reel" data-steps="${last}" style="transform:translateY(${shift.toFixed(4)}%)">${r.strip
        .map((d) => `<span>${d}</span>`)
        .join('')}</span></span>`;
    })
    .join('');
}

/** Total width in em (digits 0.52, separators 0.2, currency 0.5) so CSS can fit the number to the viewport. */
export function odometerWidth(reels: (ReelSpec | string)[]): string {
  const em = reels.reduce<number>((s, r) => s + (typeof r === 'string' ? 0.2 : 0.52), 0.5);
  return em.toFixed(2);
}
