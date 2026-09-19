/**
 * Helpers de CSV reutilizables.
 */

export interface ColumnaCSV<Row> {
  header: string;
  accessor: keyof Row | ((row: Row) => unknown);
}

export function escapeCSVCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function serializarCSV<Row>(data: readonly Row[], columns: ReadonlyArray<ColumnaCSV<Row>>): string {
  const headerLine = columns.map((c) => escapeCSVCell(c.header)).join(',');
  const dataLines = data.map((row) =>
    columns.map((c) => {
      const v = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
      return escapeCSVCell(v);
    }).join(',')
  );
  return [headerLine, ...dataLines].join('\r\n');
}

export function descargarCSV(filename: string, csv: string): void {
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
