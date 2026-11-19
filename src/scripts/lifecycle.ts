// Per-view cleanup. The app shell persists across client-side navigations (Astro ClientRouter),
// so anything a view subscribes to must be released when the view is swapped out.
type Disposer = () => void;

let disposers: Disposer[] = [];

/** Register cleanup for the current view. Returns the same function for convenience. */
export function onDispose<T extends Disposer>(fn: T): T {
  disposers.push(fn);
  return fn;
}

export function disposeView(): void {
  const list = disposers;
  disposers = [];
  for (const fn of list.reverse()) {
    try {
      fn();
    } catch {
      /* a failing cleanup must not block the next view */
    }
  }
}

/** ResizeObserver that disconnects with the view. */
export function observeResize(el: Element, fn: () => void): void {
  let frame = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(fn);
  });
  ro.observe(el);
  onDispose(() => {
    cancelAnimationFrame(frame);
    ro.disconnect();
  });
}

/** addEventListener that is removed with the view. */
export function listen<K extends keyof WindowEventMap>(
  target: Window | Document | HTMLElement,
  type: K | string,
  fn: (e: Event) => void,
  options?: AddEventListenerOptions,
): void {
  target.addEventListener(type, fn, options);
  onDispose(() => target.removeEventListener(type, fn, options));
}
