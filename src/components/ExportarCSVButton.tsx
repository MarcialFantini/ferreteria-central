import { useMemo } from 'react';

/* ============================================================
   ExportarCSVButton
   ============================================================ */

export interface ColumnaCSV<Row> {
  /** Header que aparece en la primera fila del CSV. */
  header: string;
  /** Cómo extraer el valor de la fila. Si es string, se usa como key. */
  accessor: keyof Row | ((row: Row) => string | number | boolean | null | undefined);
}

export interface ExportarCSVButtonProps<Row> {
  /** Filas a exportar. Si está vacío, el botón queda deshabilitado. */
  data: readonly Row[];
  /** Definición de cada column del CSV (orden = orden de aparición). */
  columns: ReadonlyArray<ColumnaCSV<Row>>;
  /** Nombre del archivo (sin extensión). Se le agrega sufijo de período + fecha. */
  filename: string;
  /** Etiqueta corta del período (sufijo del archivo: ultimos-6, ultimo-anio, todo, personalizado). */
  periodo: string;
  /** Clases extra para el botón. */
  className?: string;
}

/**
 * Serializa `data` a CSV (RFC 4180 — comillas para cualquier valor con
 * coma, comilla o salto de línea) y dispara la descarga vía Blob. Vanilla
 * JS — sin dependencias externas (T10 — stack cerrado).
 *
 * El BOM UTF-8 (`\ufeff`) al inicio hace que Excel respete acentos al
 * abrir el archivo (csvs sin BOM aparecen rotos en es-AR).
 *
 * El botón se deshabilita cuando `data.length === 0`, con tooltip
 * "No hay datos para exportar" — accesible y visible al hover.
 */
export default function ExportarCSVButton<Row>({
  data,
  columns,
  filename,
  periodo,
  className,
}: ExportarCSVButtonProps<Row>) {
  const disabled = data.length === 0;

  const handleClick = () => {
    if (disabled) return;
    const csv = serializarCSV(data, columns);
    const blob = new Blob(['\ufeff', csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const hoy = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${periodo}-${hoy}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Liberamos el object URL después del click — sin esto el navegador
    // puede mantener el blob en memoria más de lo necesario.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const ariaLabel = useMemo(
    () =>
      disabled
        ? `Exportar ${filename} a CSV — no hay datos para exportar`
        : `Exportar ${filename} a CSV (${data.length} filas)`,
    [disabled, filename, data.length],
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={disabled ? 'No hay datos para exportar' : 'Descargar CSV'}
      className={
        'inline-flex items-center gap-1.5 rounded-md border border-dash-line bg-dash-panel px-2.5 py-1 text-[11px] font-medium text-dash-ink-2 transition-colors hover:border-dash-panel-3 hover:bg-dash-panel-2 hover:text-dash-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent focus-visible:ring-offset-1 focus-visible:ring-offset-dash-surface disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-dash-line disabled:hover:bg-dash-panel disabled:hover:text-dash-ink-2' +
        (className ? ` ${className}` : '')
      }
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M7 10l5 5 5-5" />
        <path d="M12 15V3" />
      </svg>
      CSV
    </button>
  );
}

/* ============================================================
   Serializador CSV (RFC 4180-ish)
   ============================================================ */

/**
 * Escapa una celda según las reglas de CSV:
 * - Si contiene `"`, `,`, `\n` o `\r` → la envuelve en comillas dobles y
 *   duplica las comillas internas.
 * - Si es `null` o `undefined` → string vacío.
 * - Otros tipos (number, boolean) → `String(value)`.
 */
function escapeCSVCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getCellValue<Row>(
  row: Row,
  accessor: ColumnaCSV<Row>['accessor'],
): unknown {
  if (typeof accessor === 'function') return accessor(row);
  return row[accessor];
}

/**
 * Construye el CSV completo: header + filas, separadas por `\r\n` (CRLF —
 * lo que Excel y la mayoría de parsers esperan).
 */
function serializarCSV<Row>(
  data: readonly Row[],
  columns: ReadonlyArray<ColumnaCSV<Row>>,
): string {
  const headerLine = columns.map((c) => escapeCSVCell(c.header)).join(',');
  const dataLines = data.map((row) =>
    columns.map((c) => escapeCSVCell(getCellValue(row, c.accessor))).join(','),
  );
  return [headerLine, ...dataLines].join('\r\n');
}