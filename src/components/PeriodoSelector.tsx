import type { Periodo } from '../types/venta';
import { PERIODO_LABELS } from '../types/venta';

/* ============================================================
   PeriodoSelector
   ============================================================ */

const PERIODOS: Periodo[] = ['ultimos_6', 'ultimo_anio', 'todo'];

export interface PeriodoSelectorProps {
  /** Período actualmente seleccionado (controlado por el padre). */
  value: Periodo;
  /** Notifica al padre cuando el usuario cambia el período. */
  onChange: (periodo: Periodo) => void;
}

/**
 * Selector de período como botones toggle (no <select> nativo, para que
 * se vean como controles en el dashboard y sean accesibles con teclado).
 *
 * - `aria-pressed` indica cuál está activo (T10.17).
 * - `<div role="group" aria-label="…">` agrupa los botones para lectores
 *   de pantalla.
 */
export default function PeriodoSelector({ value, onChange }: PeriodoSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Período del reporte"
      className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-1"
    >
      <span className="px-2 text-xs uppercase text-[var(--color-ink-2)]" aria-hidden="true">
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
                ? 'rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors'
                : 'rounded-md px-3 py-1.5 text-xs font-medium text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-panel-2)] hover:text-[var(--color-ink)]'
            }
          >
            {PERIODO_LABELS[p]}
          </button>
        );
      })}
    </div>
  );
}