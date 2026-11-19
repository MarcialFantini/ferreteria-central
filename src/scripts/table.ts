// Small sortable + paginated table used by Clientes, Productos and Pedidos.
export const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

export interface Column<T> {
  key: string;
  label: string;
  num?: boolean;
  sort?: (row: T) => number | string;
  cell: (row: T) => string;
  /** Hide on narrow screens. */
  wide?: boolean;
}

export interface TableOptions<T> {
  host: HTMLElement;
  columns: Column<T>[];
  pageSize?: number;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  caption: string;
  rowKey?: (row: T) => string;
  empty?: string;
  onRender?: (visible: T[]) => void;
}

export function createTable<T>(opts: TableOptions<T>) {
  const { host, columns, pageSize = 25, caption } = opts;
  let rows: T[] = [];
  let sort = opts.initialSort ?? { key: columns[0]?.key ?? '', dir: 'desc' as const };
  let page = 0;
  let fresh = new Set<string>();

  host.innerHTML = `<div class="table-scroll"><table class="grid-table"><caption class="sr-only">${esc(caption)}</caption><thead><tr>${columns
    .map(
      (c) =>
        `<th scope="col" class="${c.num ? 'num' : ''}${c.wide ? ' wide' : ''}"${c.sort ? ` aria-sort="none" data-col="${c.key}"` : ''}>${c.sort ? `<button type="button" class="sort-btn" data-sort="${c.key}">${esc(c.label)}</button>` : esc(c.label)}</th>`,
    )
    .join('')}</tr></thead><tbody></tbody></table></div><div class="pager"><span data-pager-info aria-live="polite"></span><div class="pager-btns"><button type="button" class="btn" data-page="-1">Anterior</button><button type="button" class="btn" data-page="1">Siguiente</button></div></div>`;
  const tbody = host.querySelector('tbody');
  const info = host.querySelector('[data-pager-info]');

  host.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const s = t.closest<HTMLElement>('[data-sort]');
    if (s) {
      const key = s.dataset['sort'] ?? '';
      sort = { key, dir: sort.key === key && sort.dir === 'desc' ? 'asc' : 'desc' };
      page = 0;
      render();
    }
    const p = t.closest<HTMLElement>('[data-page]');
    if (p) {
      page += Number(p.dataset['page']);
      render();
      host.querySelector('.table-scroll')?.scrollIntoView({ block: 'nearest' });
    }
  });

  function sorted(): T[] {
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const f = col.sort;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = f(a);
      const vb = f(b);
      return (typeof va === 'string' && typeof vb === 'string' ? va.localeCompare(vb, 'es') : Number(va) - Number(vb)) * dir;
    });
  }

  function render(): void {
    const all = sorted();
    const pages = Math.max(1, Math.ceil(all.length / pageSize));
    page = Math.max(0, Math.min(page, pages - 1));
    const visible = all.slice(page * pageSize, page * pageSize + pageSize);
    if (tbody) {
      tbody.innerHTML = visible.length
        ? visible
            .map((r) => {
              const k = opts.rowKey?.(r);
              return `<tr${k && fresh.has(k) ? ' class="is-new"' : ''}>${columns
                .map((c, i) => {
                  const tag = i === 0 ? 'th scope="row"' : 'td';
                  return `<${tag} class="${c.num ? 'num' : ''}${c.wide ? ' wide' : ''}">${c.cell(r)}</${i === 0 ? 'th' : 'td'}>`;
                })
                .join('')}</tr>`;
            })
            .join('')
        : `<tr><td colspan="${columns.length}" class="muted">${esc(opts.empty ?? 'Sin resultados para estos filtros.')}</td></tr>`;
    }
    host.querySelectorAll<HTMLElement>('th[data-col]').forEach((th) => {
      const on = th.dataset['col'] === sort.key;
      th.setAttribute('aria-sort', on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
      const btn = th.querySelector<HTMLElement>('.sort-btn');
      if (on) btn?.setAttribute('data-dir', sort.dir);
      else btn?.removeAttribute('data-dir');
    });
    if (info) info.textContent = all.length ? `${page * pageSize + 1}–${page * pageSize + visible.length} de ${all.length.toLocaleString('es-AR')}` : '0 resultados';
    host.querySelector<HTMLButtonElement>('[data-page="-1"]')?.toggleAttribute('disabled', page === 0);
    host.querySelector<HTMLButtonElement>('[data-page="1"]')?.toggleAttribute('disabled', page >= pages - 1);
    fresh = new Set();
    opts.onRender?.(visible);
  }

  return {
    set(next: T[], { keepPage = false, newKeys }: { keepPage?: boolean; newKeys?: string[] } = {}) {
      rows = next;
      if (!keepPage) page = 0;
      if (newKeys) fresh = new Set(newKeys);
      render();
    },
    sorted,
  };
}

/** Skeleton rows shown until the client-side data is ready. */
export const skeletonRows = (cols: number, rows = 8): string =>
  Array.from({ length: rows }, () => `<tr>${Array.from({ length: cols }, () => '<td><span class="skeleton"></span></td>').join('')}</tr>`).join('');
