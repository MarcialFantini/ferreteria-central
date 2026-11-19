// One shared tooltip for every chart. Positioned with transform only.
let tip: HTMLElement | null = null;

function ensure(): HTMLElement {
  // Client-side navigation swaps <body>: re-attach the shared tooltip when needed.
  if (tip) {
    if (!tip.isConnected) document.body.append(tip);
    return tip;
  }
  tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.id = 'chart-tooltip';
  document.body.append(tip);
  return tip;
}

export interface TipContent {
  title: string;
  value: string;
  rows?: [string, string][];
  /** Inline SVG mini chart. */
  chart?: string;
  hint?: string;
}

export function tipHTML({ title, value, rows = [], chart = '', hint = '' }: TipContent): string {
  const list = rows.map(([k, v]) => `<div class="tt-row"><span>${k}</span><b>${v}</b></div>`).join('');
  return `<p class="tt-title">${title}</p><p class="tt-value num">${value}</p>${chart ? `<div class="tt-chart">${chart}</div>` : ''}${list}${hint ? `<p class="tt-hint">${hint}</p>` : ''}`;
}

export function showTip(content: TipContent, clientX: number, clientY: number): void {
  const el = ensure();
  el.innerHTML = tipHTML(content);
  el.classList.add('is-visible');
  const { width, height } = el.getBoundingClientRect();
  const pad = 12;
  let x = clientX + 18;
  let y = clientY + 18;
  if (x + width > window.innerWidth - pad) x = clientX - width - 18;
  if (y + height > window.innerHeight - pad) y = clientY - height - 18;
  x = Math.max(pad, x);
  y = Math.max(pad, y);
  el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
}

/** Keyboard/focus variant: anchor next to an element. */
export function showTipFor(target: Element, content: TipContent): void {
  const r = target.getBoundingClientRect();
  showTip(content, r.right, r.top + r.height / 2);
}

export function hideTip(): void {
  tip?.classList.remove('is-visible');
}
