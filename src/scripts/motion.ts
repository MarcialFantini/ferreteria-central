import { gsap } from 'gsap';
export { gsap };

const media = window.matchMedia('(prefers-reduced-motion: reduce)');

/** True when the visitor asked for reduced motion: every scene renders its final static state. */
export const reducedMotion = (): boolean => media.matches;

export const isShowcase = (): boolean => document.documentElement.classList.contains('is-showcase');

export const isPresenting = (): boolean => document.documentElement.classList.contains('is-presenting');

/** Duration helper: 0 under reduced motion so tweens jump straight to their end state. */
export const dur = (seconds: number): number => (reducedMotion() ? 0 : seconds);

export interface Scene {
  id: string;
  el: HTMLElement;
  /** Entry choreography (replayable: presentation and showcase call it on every visit). */
  enter(): void;
  /** Root element of the chart that "Exportar" captures. */
  exportTarget(): { el: Element; title: string } | null;
  /** Optional extra beat for the ?showcase loop (e.g. the map drills into a province). */
  showcase?(): void;
  /** Return to the resting state (used when the showcase loop restarts). */
  reset?(): void;
}
