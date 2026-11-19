// Filters facade over the shared app state (kept for the scene modules).
// View-level subscriptions are released automatically when the view is swapped out.
import type { Filters } from '../data/selectors';
import { app } from './state';
import { onDispose } from './lifecycle';

type Listener = (next: Filters, prev: Filters) => void;

let last: Filters = app.get().filters;

const listeners = new Set<Listener>();
app.on('filters', () => {
  const prev = last;
  last = app.get().filters;
  listeners.forEach((fn) => fn(last, prev));
});

export const store = {
  get: (): Filters => app.get().filters,
  set(patch: Partial<Filters>): void {
    const prev = app.get().filters;
    const next = { ...prev, ...patch };
    if (next.period === prev.period && next.seller === prev.seller && next.province === prev.province) return;
    app.update('filters', next);
  },
  /** Re-notify current subscribers as if filters changed from `from` (views rendered with defaults at build time). */
  replay(from: Filters): void {
    const now = app.get().filters;
    if (now.period === from.period && now.seller === from.seller && now.province === from.province) return;
    listeners.forEach((fn) => fn(now, from));
  },
  /** Subscribe; by default the subscription belongs to the current view. */
  subscribe(fn: Listener, { persistent = false } = {}): () => void {
    listeners.add(fn);
    const off = () => listeners.delete(fn);
    if (!persistent) onDispose(off);
    return off;
  },
};
