// Toasts (ephemeral) and notices (the notification centre, persisted).
import { app, uid, type Notice } from './state';
import { engine } from './engine';

let region: HTMLElement | null = null;

function ensureRegion(): HTMLElement {
  if (region?.isConnected) return region;
  region = document.querySelector<HTMLElement>('[data-toasts]');
  if (!region) {
    region = document.createElement('div');
    region.className = 'toasts';
    region.setAttribute('data-toasts', '');
    document.body.append(region);
  }
  return region;
}

export interface ToastOptions {
  tone?: Notice['tone'];
  href?: string;
  action?: { label: string; run: () => void };
  ms?: number;
}

export function toast(title: string, body = '', { tone = 'info', href, action, ms = 4200 }: ToastOptions = {}): void {
  if (document.documentElement.classList.contains('is-showcase') && tone === 'info') return;
  const el = document.createElement('div');
  el.className = `toast toast--${tone}`;
  el.setAttribute('role', tone === 'alert' ? 'alert' : 'status');
  el.innerHTML = `<span class="toast-dot" aria-hidden="true"></span><div class="toast-text"><p class="toast-title"></p>${body ? '<p class="toast-body"></p>' : ''}</div>`;
  const t = el.querySelector('.toast-title');
  if (t) t.textContent = title;
  const b = el.querySelector('.toast-body');
  if (b) b.textContent = body;
  if (href || action) {
    const btn = document.createElement(href ? 'a' : 'button');
    btn.className = 'toast-action';
    btn.textContent = action?.label ?? 'Ver';
    if (href) (btn as HTMLAnchorElement).href = href;
    else (btn as HTMLButtonElement).type = 'button';
    btn.addEventListener('click', () => {
      action?.run();
      close();
    });
    el.append(btn);
  }
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'toast-close';
  x.setAttribute('aria-label', 'Cerrar aviso');
  x.textContent = '×';
  x.addEventListener('click', () => close());
  el.append(x);

  const box = ensureRegion();
  box.append(el);
  while (box.children.length > 4) box.firstElementChild?.remove();
  requestAnimationFrame(() => el.classList.add('is-in'));
  const timer = window.setTimeout(() => close(), ms);
  function close() {
    clearTimeout(timer);
    el.classList.remove('is-in');
    el.classList.add('is-out');
    window.setTimeout(() => el.remove(), 260);
  }
}

/** Add a notice to the centre (and show it as a toast). */
export function notice(n: Omit<Notice, 'id' | 'read' | 'day' | 'minute'>, { silent = false } = {}): void {
  const item: Notice = { ...n, id: uid('n'), read: false, day: engine.day, minute: engine.minute };
  app.update('notices', (list) => [item, ...list].slice(0, 60));
  if (!silent) toast(n.title, n.body, { tone: n.tone, ...(n.href ? { href: n.href } : {}) });
}

export const unreadCount = (): number => app.get().notices.filter((n) => !n.read).length;
