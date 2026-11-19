// One shared simulation engine. It advances a simulated clock and reveals that day's orders as they happen.
// 1x = one simulated minute per real second (a 12-hour business day takes 12 minutes); 4x and 10x speed it up.
import { DAY_END, DAY_START, LIVE_DAYS, cumulativeCurve, generateDay, sumTotals, type LiveOrder } from '../data/live';
import { app, type Speed } from './state';
import { onDispose } from './lifecycle';

type Events = {
  order: LiveOrder;
  tick: { day: number; minute: number };
  day: { day: number; closedTotal: number };
  state: { paused: boolean; speed: Speed };
};
type Handler<K extends keyof Events> = (payload: Events[K]) => void;

const handlers: { [K in keyof Events]: Set<Handler<K>> } = {
  order: new Set(),
  tick: new Set(),
  day: new Set(),
  state: new Set(),
};

function emit<K extends keyof Events>(type: K, payload: Events[K]): void {
  (handlers[type] as Set<Handler<K>>).forEach((fn) => {
    try {
      fn(payload);
    } catch (err) {
      // A broken subscriber must not stop the stream.
      console.warn(err);
    }
  });
}

let timer = 0;
let lastReal = 0;
let persistAcc = 0;
/** Kept outside the persisted state between saves (state saves every ~2 s). */
let minute = app.get().sim.minute;
let day = app.get().sim.day;
const TICK_MS = 200;

export const engine = {
  /** Subscribe; belongs to the current view unless `persistent`. */
  on<K extends keyof Events>(type: K, fn: Handler<K>, { persistent = false } = {}): () => void {
    (handlers[type] as Set<Handler<K>>).add(fn);
    const off = () => {
      (handlers[type] as Set<Handler<K>>).delete(fn);
    };
    if (!persistent) onDispose(off);
    return off;
  },
  get day(): number {
    return day;
  },
  get minute(): number {
    return minute;
  },
  get paused(): boolean {
    return app.get().sim.paused;
  },
  get speed(): Speed {
    return app.get().sim.speed;
  },
  /** Orders already placed today. */
  todayOrders(): LiveOrder[] {
    return generateDay(day).filter((o) => o.minute <= minute);
  },
  todayTotal(): number {
    return sumTotals(engine.todayOrders());
  },
  /** Yesterday's full curve vs today's curve so far. */
  curves(step = 10) {
    const yesterday = day > 0 ? cumulativeCurve(day - 1, DAY_END, step) : [];
    return { today: cumulativeCurve(day, minute, step), yesterday };
  },
  /** Revenue of the live month so far (closed days + today), optionally for one seller. */
  monthToDate(sellerId = 'all'): number {
    let total = 0;
    for (let d = 0; d <= day; d++) {
      const orders = d === day ? engine.todayOrders() : generateDay(d);
      for (const o of orders) if (sellerId === 'all' || o.sellerId === sellerId) total += o.total;
    }
    return total;
  },
  setSpeed(speed: Speed): void {
    app.update('sim', (s) => ({ ...s, speed }));
    emit('state', { paused: engine.paused, speed });
  },
  togglePause(force?: boolean): void {
    const paused = force ?? !engine.paused;
    app.update('sim', (s) => ({ ...s, paused, minute, day }));
    emit('state', { paused, speed: engine.speed });
  },
  /** Jump forward (used by the showcase to make things happen quickly). */
  advance(minutes: number): void {
    step(minutes);
  },
  resetClock(): void {
    minute = app.get().sim.minute;
    day = app.get().sim.day;
    emit('tick', { day, minute });
    emit('state', { paused: engine.paused, speed: engine.speed });
  },
  start(): void {
    if (timer) return;
    lastReal = performance.now();
    timer = window.setInterval(loop, TICK_MS);
  },
};

function step(simMinutes: number): void {
  const from = minute;
  let to = minute + simMinutes;
  if (to >= DAY_END) {
    // Close the day: flush the remaining orders, then open the next business day.
    for (const o of generateDay(day)) if (o.minute > from) emit('order', o);
    const closedTotal = sumTotals(generateDay(day));
    day = (day + 1) % LIVE_DAYS;
    minute = DAY_START;
    app.update('sim', (s) => ({ ...s, day, minute }));
    emit('day', { day, closedTotal });
    emit('tick', { day, minute });
    return;
  }
  for (const o of generateDay(day)) if (o.minute > from && o.minute <= to) emit('order', o);
  minute = to;
  emit('tick', { day, minute });
}

function loop(): void {
  const now = performance.now();
  // Cap the delta so a backgrounded tab does not dump hours of orders at once.
  const dt = Math.min(1, (now - lastReal) / 1000);
  lastReal = now;
  if (engine.paused) return;
  step(dt * engine.speed);
  persistAcc += dt;
  if (persistAcc > 2) {
    persistAcc = 0;
    app.update('sim', (s) => ({ ...s, minute, day }));
  }
}
