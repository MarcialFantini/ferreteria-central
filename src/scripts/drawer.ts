// Side drawer for detail panels (product, order). Esc or the close button returns focus to the opener.
import { onDispose } from './lifecycle';

let el: HTMLElement | null = null;
let opener: HTMLElement | null = null;

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeDrawer();
}

export function openDrawer(html: string, label: string): HTMLElement {
  opener = document.activeElement as HTMLElement | null;
  if (!el) {
    el = document.createElement('aside');
    el.className = 'drawer';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'false');
    document.body.append(el);
    document.addEventListener('keydown', onKey);
    onDispose(() => {
      document.removeEventListener('keydown', onKey);
      el?.remove();
      el = null;
    });
  }
  el.setAttribute('aria-label', label);
  el.innerHTML = `<button type="button" class="icon-btn drawer-close" aria-label="Cerrar detalle">×</button>${html}`;
  el.querySelector('.drawer-close')?.addEventListener('click', closeDrawer);
  requestAnimationFrame(() => el?.classList.add('is-open'));
  el.querySelector<HTMLElement>('.drawer-close')?.focus({ preventScroll: true });
  return el;
}

export function closeDrawer(): void {
  if (!el?.classList.contains('is-open')) return;
  el.classList.remove('is-open');
  opener?.focus({ preventScroll: true });
}
