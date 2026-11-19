// Shared, persisted app state: filters, saved views, goals, alert rules, notifications, simulation clock.
// Everything lives in memory and is mirrored to localStorage (best effort). "Reiniciar demo" wipes it.
import { DEFAULT_FILTERS, monthlyRevenue, type Filters } from '../data/selectors';
import { SELLERS } from '../data/catalog';
import { DAY_START, FIRST_LIVE_DAY } from '../data/live';

export type Speed = 1 | 4 | 10;
import type { Metric } from './state-labels';
export { METRIC_LABEL, type Metric } from './state-labels';

export interface SavedView {
  id: string;
  name: string;
  filters: Filters;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: Metric;
  threshold: number;
  seller: string;
  province: string;
  enabled: boolean;
  /** Live day it last fired (aggregate rules fire once per day). */
  firedOn: number | null;
  fires: number;
}

export interface Notice {
  id: string;
  day: number;
  minute: number;
  title: string;
  body: string;
  tone: 'alert' | 'info' | 'success';
  href?: string;
  read: boolean;
}

export interface SimState {
  day: number;
  minute: number;
  speed: Speed;
  paused: boolean;
}

export interface AppState {
  v: 2;
  filters: Filters;
  savedViews: SavedView[];
  goals: Record<string, number>;
  rules: AlertRule[];
  notices: Notice[];
  sim: SimState;
}

const KEY = 'mc-demo-v2';

const roundTo = (v: number, step: number) => Math.round(v / step) * step;

export function defaultGoals(): Record<string, number> {
  return Object.fromEntries(
    SELLERS.map((s) => {
      const series = monthlyRevenue({ seller: s.id, province: 'all' });
      return [s.id, roundTo((series[series.length - 1] ?? 0) * 1.08, 500_000)];
    }),
  );
}

function defaultRules(): AlertRule[] {
  const base = { enabled: true, firedOn: null, fires: 0 };
  return [
    { ...base, id: 'r-big', name: 'Pedido grande', metric: 'order_total', threshold: 380_000, seller: 'all', province: 'all' },
    { ...base, id: 'r-day', name: 'Día fuerte', metric: 'today_revenue', threshold: 8_000_000, seller: 'all', province: 'all' },
    { ...base, id: 'r-cba', name: 'Córdoba en racha', metric: 'province_orders', threshold: 22, seller: 'all', province: 'cordoba' },
    { ...base, id: 'r-goal', name: 'Objetivo al 60 %', metric: 'seller_goal', threshold: 60, seller: 'cp', province: 'all' },
  ];
}

export function initialState(): AppState {
  return {
    v: 2,
    filters: { ...DEFAULT_FILTERS },
    savedViews: [
      { id: 'v-cba', name: 'Córdoba · trimestre', filters: { period: 'trimestre', seller: 'all', province: 'cordoba' } },
      { id: 'v-amba', name: 'AMBA de Federico', filters: { period: 'anio', seller: 'fr', province: 'all' } },
    ],
    goals: defaultGoals(),
    rules: defaultRules(),
    notices: [
      {
        id: 'n-welcome',
        day: FIRST_LIVE_DAY,
        minute: DAY_START,
        title: 'Simulación en vivo activa',
        body: 'Los pedidos entran en tiempo real. Cambiá la velocidad o pausá desde la barra lateral.',
        tone: 'info',
        read: false,
      },
    ],
    sim: { day: FIRST_LIVE_DAY, minute: 10 * 60 + 30, speed: 1, paused: false },
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      if (parsed.v === 2) {
        const base = initialState();
        return {
          ...base,
          ...parsed,
          filters: { ...base.filters, ...parsed.filters },
          sim: { ...base.sim, ...parsed.sim },
          goals: { ...base.goals, ...parsed.goals },
        } as AppState;
      }
    }
  } catch {
    /* corrupted or unavailable storage: start fresh */
  }
  return initialState();
}

type Topic = keyof Omit<AppState, 'v'>;
type Listener = () => void;

let state: AppState = load();
const listeners = new Map<Topic, Set<Listener>>();
let saveTimer = 0;

function persist(): void {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* private mode or quota: state still works in memory */
    }
  }, 250);
}

export const app = {
  get: (): AppState => state,
  update<T extends Topic>(topic: T, next: AppState[T] | ((prev: AppState[T]) => AppState[T])): void {
    const value = typeof next === 'function' ? (next as (p: AppState[T]) => AppState[T])(state[topic]) : next;
    state = { ...state, [topic]: value };
    persist();
    listeners.get(topic)?.forEach((fn) => fn());
  },
  on(topic: Topic, fn: Listener): () => void {
    let set = listeners.get(topic);
    if (!set) listeners.set(topic, (set = new Set()));
    set.add(fn);
    return () => set?.delete(fn);
  },
  reset(): void {
    state = initialState();
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    (Object.keys(state) as (Topic | 'v')[]).forEach((t) => {
      if (t !== 'v') listeners.get(t)?.forEach((fn) => fn());
    });
  },
};

export const uid = (prefix: string): string => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
