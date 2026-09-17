import { useId } from 'react';

import type { Periodo, RangoVentas } from '../types/venta';
import { PERIODO_LABELS } from '../types/venta';
import { PRIMER_MES, ULTIMO_MES } from '../lib/datos';

/* ============================================================
   PeriodoSelector
   ============================================================ */

const PERIODOS: Periodo[] = ['ultimos_6', 'ultimo_anio', 'todo', 'personalizado'];

export interface PeriodoSelectorProps {
  /** Período actualmente seleccionado (controlado por el padre). */
  value: Periodo;
  /** Notifica al padre cuando el usuario cambia el período. */
  onChange: (periodo: Periodo) => void;
  /** Rango personalizado (desde/hasta) — requerido cuando `value === 'personalizado'`. */
  customRange: RangoVentas;
  /** Notifica al padre cualquier edición del rango personalizado. */
  onCustomRangeChange: (range: RangoVentas) => void;
}

/**
 * Selector de período como botones toggle (no <select> nativo, para que
 * se vean como controles en el dashboard y sean accesibles con teclado).
 *
 * - `aria-pressed` indica cuál está activo (T10.17).
 * - `<div role="group" aria-label="…">` agrupa los botones para lectores
 *   de pantalla.
 * - Cuando `value === 'personalizado'` se renderizan inline dos `<input
 *   type="month">` (YYYY-MM) con validación `desde <= hasta`. El padre
 *     controla el estado (`customRange`) — lift state up.
 */
export default function PeriodoSelector({
  value,
  onChange,
  customRange,
  onCustomRangeChange,
}: PeriodoSelectorProps) {
  const desdeId = useId();
  const hastaId = useId();

  const desdeInvalido =
    customRange.desde > customRange.hasta &&
    customRange.desde !== '' &&
    customRange.hasta !== '';

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label="Período del reporte"
        className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-dash-line bg-dash-panel p-1"
      >
        <span
          className="px-2 text-[11px] uppercase tracking-wider text-dash-ink-3 tabular"
          aria-hidden="true"
        >
          Período
        </span>
        {PERIODOS.map((p) => {
          const isActive = p === value;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(p)}
              className={
                isActive
                  ? 'rounded-md bg-dash-accent px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-dash-accent transition-colors'
                  : 'rounded-md px-3 py-1.5 text-xs font-medium text-dash-ink-2 transition-colors hover:bg-dash-panel-2 hover:text-dash-ink'
              }
            >
              {PERIODO_LABELS[p]}
            </button>
          );
        })}
      </div>

      {/* Inputs inline — solo visibles cuando el período es personalizado.
         Usamos type="month" para que el browser nativo ofrezca el picker
         de mes/año (Chrome/Edge) y mantenga el contrato YYYY-MM del dataset. */}
      {value === 'personalizado' && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-lg border border-dash-line bg-dash-panel px-3 py-2"
          role="group"
          aria-label="Rango personalizado"
        >
          <span className="text-[11px] uppercase tracking-wider text-dash-ink-3 tabular">
            Desde
          </span>
          <input
            id={desdeId}
            type="month"
            min={PRIMER_MES}
            max={ULTIMO_MES}
            value={customRange.desde}
            onChange={(e) =>
              onCustomRangeChange({
                desde: e.target.value,
                hasta: customRange.hasta,
              })
            }
            aria-label="Mes inicial del rango personalizado"
            aria-invalid={desdeInvalido}
            className="rounded-md border border-dash-line bg-dash-surface px-2 py-1 text-xs text-dash-ink tabular focus:border-dash-accent focus:outline-none focus:ring-1 focus:ring-dash-accent"
          />
          <span className="text-[11px] uppercase tracking-wider text-dash-ink-3 tabular">
            Hasta
          </span>
          <input
            id={hastaId}
            type="month"
            min={PRIMER_MES}
            max={ULTIMO_MES}
            value={customRange.hasta}
            onChange={(e) =>
              onCustomRangeChange({
                desde: customRange.desde,
                hasta: e.target.value,
              })
            }
            aria-label="Mes final del rango personalizado"
            aria-invalid={desdeInvalido}
            className="rounded-md border border-dash-line bg-dash-surface px-2 py-1 text-xs text-dash-ink tabular focus:border-dash-accent focus:outline-none focus:ring-1 focus:ring-dash-accent"
          />
          {desdeInvalido && (
            <span className="text-[11px] font-medium text-dash-danger">
              Rango invertido
            </span>
          )}
        </div>
      )}
    </div>
  );
}