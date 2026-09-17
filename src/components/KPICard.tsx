import { formatARS, formatNumber } from '../lib/datos';

/**
 * Iconos inline. El spec del proyecto pide SVGs inline y prohíbe
 * dependencias de Phosphor / lucide / similares.
 *
 * `iconName` se pasa como prop a KPICard; el componente resuelve el nombre
 * contra este registro y renderiza el SVG correspondiente.
 */

type IconName = 'money' | 'cart' | 'ticket' | 'trend-up' | 'box' | 'package' | 'tag' | 'star';

const ICON_PATHS: Record<IconName, string> = {
  money: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6',
  cart: 'M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  ticket: 'M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V9zM9 7v10',
  'trend-up': 'M3 17l6-6 4 4 8-8M14 7h7v7',
  box: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12',
  package: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
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

/* ============================================================
   KPICard
   ============================================================ */

export type KPIFormat = 'currency' | 'number' | 'percent';

export interface KPICardProps {
  /** Etiqueta corta del KPI (ej. "Ventas totales"). */
  label: string;
  /** Valor numérico a mostrar. Se formatea según `formato`. */
  value: number;
  /** Variación porcentual (signed). Verde >0, rojo <0, gris =0. */
  variacionPorcentual: number;
  /** Nombre del icono a renderizar. */
  icono: IconName;
  /** Cómo formatear `value`. */
  formato: KPIFormat;
  /** Sufijo textual al lado del valor (ej. "días", "u."). Opcional. */
  suffix?: string;
}

/**
 * Tarjeta de KPI individual.
 *
 * - Valor grande en mono (tabular) — no depende solo del color (T10.17).
 * - Badge de variación con símbolo ("+", "−") + triángulo, además del color.
 * - Hover sutil: la línea externa se intensifica ligeramente.
 */
export default function KPICard({
  label,
  value,
  variacionPorcentual,
  icono,
  formato,
  suffix,
}: KPICardProps) {
  const formattedValue =
    formato === 'currency'
      ? formatARS(value)
      : formato === 'percent'
        ? `${value.toFixed(1)}%`
        : formatNumber(value);

  // Badge color: success >0, danger <0, neutral =0
  const variacionClases =
    variacionPorcentual > 0
      ? 'bg-dash-success/10 text-dash-success border-dash-success/30'
      : variacionPorcentual < 0
        ? 'bg-dash-danger/10 text-dash-danger border-dash-danger/30'
        : 'bg-dash-surface text-dash-ink-3 border-dash-line';

  const variacionPrefijo = variacionPorcentual > 0 ? '+' : '';
  const variacionTexto = `${variacionPrefijo}${variacionPorcentual.toFixed(1)}%`;
  const variacionAria =
    variacionPorcentual > 0
      ? `Variación positiva ${variacionPorcentual.toFixed(1)} por ciento`
      : variacionPorcentual < 0
        ? `Variación negativa ${Math.abs(variacionPorcentual).toFixed(1)} por ciento`
        : 'Sin variación respecto al período anterior';

  return (
    <article
      className="surface-card group flex flex-col gap-4 p-4 sm:p-5"
      aria-label={`${label}: ${formattedValue}. ${variacionAria}`}
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

      <div className="text-4xl font-semibold tabular-nums text-dash-ink">
        {formattedValue}
        {suffix && (
          <span className="ml-1.5 text-base font-medium text-dash-ink-2">
            {suffix}
          </span>
        )}
      </div>

      <span
        className={`inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium tabular ${variacionClases}`}
        aria-label={variacionAria}
      >
        {variacionPorcentual > 0 ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3" aria-hidden="true">
            <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : variacionPorcentual < 0 ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3" aria-hidden="true">
            <path d="M5 9l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3" aria-hidden="true">
            <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {variacionTexto}
      </span>
    </article>
  );
}