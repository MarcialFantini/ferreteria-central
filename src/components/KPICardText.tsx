/* ============================================================
   KPICardText — KPI cualitativo (texto + número secundario)

   Caso de uso: el KPI no se reduce a un solo número grande. Por ejemplo:
     - "Top categoría por ingreso" → nombre de la categoría + monto.
     - "Producto más vendido"     → nombre del producto + unidades.

   Mismo layout que KPICard (surface-card + label + icono) para que el
   grid se vea uniforme, pero el "value" es un bloque de dos líneas.
   ============================================================ */

type IconName = 'tag' | 'star';

const ICON_PATHS: Record<IconName, string> = {
  tag: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
};

function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? 'h-5 w-5'}
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

export interface KPICardTextProps {
  /** Etiqueta corta del KPI (ej. "Top categoría por ingreso"). */
  label: string;
  /** Texto principal — el nombre del elemento destacado (categoría o producto). */
  texto: string;
  /** Línea secundaria con el número (monto, unidades, etc.). */
  detalle: string;
  /** Variación porcentual opcional (signed). Si se omite, no se muestra badge. */
  variacionPorcentual?: number;
  /** Nombre del icono a renderizar. */
  icono: IconName;
}

export default function KPICardText({
  label,
  texto,
  detalle,
  variacionPorcentual,
  icono,
}: KPICardTextProps) {
  const sinVariacion = variacionPorcentual === undefined;
  const variacionClases =
    sinVariacion
      ? ''
      : variacionPorcentual > 0
        ? 'bg-dash-success/10 text-dash-success border-dash-success/30'
        : variacionPorcentual < 0
          ? 'bg-dash-danger/10 text-dash-danger border-dash-danger/30'
          : 'bg-dash-surface text-dash-ink-3 border-dash-line';

  return (
    <article
      className="surface-card group flex flex-col gap-4 p-4 sm:p-5"
      aria-label={`${label}: ${texto}. ${detalle}`}
    >
      <header className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-dash-ink-2">
          {label}
        </span>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-dash-accent/10 text-dash-accent ring-1 ring-inset ring-dash-accent/20"
          aria-hidden="true"
        >
          <Icon name={icono} className="h-4 w-4" />
        </span>
      </header>

      <div className="flex flex-col gap-1">
        <span className="line-clamp-2 text-xl font-semibold leading-tight text-dash-ink sm:text-2xl">
          {texto}
        </span>
        <span className="text-sm tabular-nums text-dash-ink-2">{detalle}</span>
      </div>

      {!sinVariacion && (
        <span
          className={`inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium tabular ${variacionClases}`}
        >
          {variacionPorcentual > 0 ? '+' : ''}
          {(variacionPorcentual ?? 0).toFixed(1)}%
        </span>
      )}
    </article>
  );
}