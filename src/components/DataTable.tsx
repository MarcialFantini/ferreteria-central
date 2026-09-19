import { useMemo, useState } from 'react';
import { descargarCSV, serializarCSV, type ColumnaCSV } from '../lib/csv';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
  /** Render custom de la celda. Si se omite, se muestra el valor del accessor. */
  render?: (row: T) => React.ReactNode;
  /** Accessor para sorting y CSV. */
  accessor: (row: T) => string | number;
}

export interface DataTableFilter {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

interface DataTableProps<T> {
  rows: readonly T[];
  columns: ReadonlyArray<DataTableColumn<T>>;
  /** Filtros aplicables (dropdowns). */
  filters?: ReadonlyArray<DataTableFilter>;
  /** Texto placeholder de la búsqueda. */
  searchPlaceholder?: string;
  /** Página inicial (filas por página). */
  pageSize?: number;
  /** Sufijo del archivo CSV. */
  filename: string;
  /** Mensaje cuando no hay filas. */
  emptyMessage?: string;
  /** Render opcional de la toolbar (a la derecha del buscador). */
  toolbarExtra?: React.ReactNode;
}

export default function DataTable<T>({
  rows,
  columns,
  filters,
  searchPlaceholder = 'Buscar...',
  pageSize = 15,
  filename,
  emptyMessage = 'Sin datos para los filtros aplicados.',
  toolbarExtra,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let out = rows;
    if (term) {
      out = out.filter((row) =>
        columns.some((c) => String(c.accessor(row)).toLowerCase().includes(term))
      );
    }
    if (filters) {
      for (const f of filters) {
        const v = filterValues[f.key];
        if (v && v !== 'all') {
          out = out.filter((row) => String((row as any)[f.key]) === v);
        }
      }
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col) {
        const dir = sortDir === 'asc' ? 1 : -1;
        out = [...out].sort((a, b) => {
          const va = col.accessor(a);
          const vb = col.accessor(b);
          if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
          return String(va).localeCompare(String(vb)) * dir;
        });
      }
    }
    return out;
  }, [rows, columns, search, filters, filterValues, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const handleExport = () => {
    const cols: ColumnaCSV<T>[] = columns.map((c) => ({ header: c.label, accessor: c.accessor as any }));
    const csv = serializarCSV(filtered, cols);
    descargarCSV(filename, csv);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dash-ink-3" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-md border border-dash-line bg-dash-panel py-1.5 pl-8 pr-2 text-[12px] text-dash-ink placeholder-dash-ink-3 focus:border-dash-accent focus:outline-none"
              aria-label="Buscar"
            />
          </div>
          {filters?.map((f) => (
            <select
              key={f.key}
              value={filterValues[f.key] ?? 'all'}
              onChange={(e) => { setFilterValues((v) => ({ ...v, [f.key]: e.target.value })); setPage(1); }}
              aria-label={f.label}
              className="rounded-md border border-dash-line bg-dash-panel px-2.5 py-1.5 text-[12px] text-dash-ink focus:border-dash-accent focus:outline-none"
            >
              <option value="all">{f.label}: todos</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-dash-ink-3 tabular" aria-live="polite">
            {filtered.length.toLocaleString('es-AR')} resultado{filtered.length === 1 ? '' : 's'}
          </span>
          {toolbarExtra}
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-dash-line bg-dash-panel px-2.5 py-1.5 text-[11px] font-medium text-dash-ink-2 transition-colors hover:border-dash-panel-3 hover:bg-dash-panel-2 hover:text-dash-ink disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Exportar ${filtered.length} filas a CSV`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border border-dash-line">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-dash-surface text-[10px] uppercase tracking-wider text-dash-ink-3">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    style={c.width ? { width: c.width } : undefined}
                    className={
                      'whitespace-nowrap px-3 py-2 ' +
                      (c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left') +
                      (c.sortable ? ' cursor-pointer select-none hover:text-dash-ink-2' : '')
                    }
                    onClick={c.sortable ? () => handleSort(c.key) : undefined}
                    aria-sort={sortKey === c.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {c.sortable && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={'h-3 w-3 ' + (sortKey === c.key ? 'text-dash-accent' : 'opacity-40')} aria-hidden="true">
                          {sortKey === c.key && sortDir === 'asc' ? (
                            <path d="M12 19V5M5 12l7-7 7 7" />
                          ) : (
                            <path d="M12 5v14M19 12l-7 7-7-7" />
                          )}
                        </svg>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-line">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-8 text-center text-dash-ink-2">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                pageRows.map((row, idx) => (
                  <tr key={idx} className="text-dash-ink-2 transition-colors hover:bg-dash-surface/40">
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={
                          'whitespace-nowrap px-3 py-2 ' +
                          (c.align === 'right' ? 'text-right tabular-nums font-medium text-dash-ink' : c.align === 'center' ? 'text-center' : 'text-left')
                        }
                      >
                        {c.render ? c.render(row) : String(c.accessor(row))}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-between gap-2 text-[11px] text-dash-ink-2" aria-label="Paginación">
          <span className="tabular">
            Página <span className="font-semibold text-dash-ink">{page}</span> de{' '}
            <span className="font-semibold text-dash-ink">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-dash-line bg-dash-panel px-2.5 py-1 text-dash-ink-2 hover:bg-dash-panel-2 hover:text-dash-ink disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Página anterior"
            >
              ? Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border border-dash-line bg-dash-panel px-2.5 py-1 text-dash-ink-2 hover:bg-dash-panel-2 hover:text-dash-ink disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Página siguiente"
            >
              Siguiente ?
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
