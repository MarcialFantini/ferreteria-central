import { useEffect, useRef, useState } from 'react';
import type { Periodo, RangoVentas } from '../types/venta';
import { PERIODO_LABELS } from '../types/venta';
import { PRIMER_MES, ULTIMO_MES, formatMesCorto } from '../lib/datos';

interface DateRangeBarProps {
  periodo: Periodo;
  onPeriodoChange: (p: Periodo) => void;
  customRange: RangoVentas;
  onCustomRangeChange: (r: RangoVentas) => void;
  comparison: { ventasActual: number; ventasPrevio: number; deltaVentas: number; labelActual: string; labelPrevio: string } | null;
}

/**
 * Topbar global con:
 *  - Selector de período (Últimos 6 / Último año / Todo / Personalizado)
 *  - Date-range picker (dos inputs mes-año) para rango personalizado
 *  - Toggle de comparación con período previo (mostrar delta %)
 *  - Badge resumen del delta vs período previo
 */
export default function DateRangeBar({
  periodo,
  onPeriodoChange,
  customRange,
  onCustomRangeChange,
  comparison,
}: DateRangeBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showPicker]);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Período del reporte" className="inline-flex items-center gap-1 rounded-lg border border-dash-line bg-dash-panel p-1">
          {(['ultimos_6', 'ultimo_anio', 'todo'] as Periodo[]).map((p) => {
            const isActive = periodo === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={isActive}
                onClick={() => { onPeriodoChange(p); setShowPicker(false); }}
                className={
                  'rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ' +
                  (isActive
                    ? 'bg-dash-accent text-white shadow-sm'
                    : 'text-dash-ink-2 hover:bg-dash-panel-2 hover:text-dash-ink')
                }
              >
                {PERIODO_LABELS[p]}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={periodo === 'personalizado'}
            onClick={() => { onPeriodoChange('personalizado'); setShowPicker(true); }}
            className={
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ' +
              (periodo === 'personalizado'
                ? 'bg-dash-accent text-white shadow-sm'
                : 'text-dash-ink-2 hover:bg-dash-panel-2 hover:text-dash-ink')
            }
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Personalizado
          </button>
        </div>

        {/* Date-range popover */}
        {periodo === 'personalizado' && (
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setShowPicker((v) => !v)}
              className="inline-flex items-center gap-2 rounded-md border border-dash-line bg-dash-panel px-3 py-1.5 text-[12px] font-medium text-dash-ink-2 hover:border-dash-panel-3 hover:bg-dash-panel-2 hover:text-dash-ink"
              aria-expanded={showPicker}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
<span className="tabular">
                {formatMesCorto(customRange.desde)} — {formatMesCorto(customRange.hasta)}
              </span>
            </button>
            {showPicker && (
              <div className="absolute left-0 top-full z-30 mt-1.5 w-[280px] rounded-lg border border-dash-line bg-dash-panel p-3 shadow-2xl anim-fade-up">
                <label className="block text-[10px] font-medium uppercase tracking-wider text-dash-ink-3">
                  Desde
                </label>
                <input
                  type="month"
                  min={PRIMER_MES}
                  max={ULTIMO_MES}
                  value={customRange.desde}
                  onChange={(e) => onCustomRangeChange({ ...customRange, desde: e.target.value })}
                  className="mt-1 w-full rounded-md border border-dash-line bg-dash-surface px-2.5 py-1.5 text-[12px] text-dash-ink focus:border-dash-accent focus:outline-none"
                />
                <label className="mt-3 block text-[10px] font-medium uppercase tracking-wider text-dash-ink-3">
                  Hasta
                </label>
                <input
                  type="month"
                  min={PRIMER_MES}
                  max={ULTIMO_MES}
                  value={customRange.hasta}
                  onChange={(e) => onCustomRangeChange({ ...customRange, hasta: e.target.value })}
                  className="mt-1 w-full rounded-md border border-dash-line bg-dash-surface px-2.5 py-1.5 text-[12px] text-dash-ink focus:border-dash-accent focus:outline-none"
                />
                <div className="mt-3 flex items-center justify-between border-t border-dash-line pt-2 text-[10px] uppercase tracking-wider text-dash-ink-3">
                  <span>Dataset</span>
                  <span className="tabular">{formatMesCorto(PRIMER_MES)} — {formatMesCorto(ULTIMO_MES)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {comparison && (
        <ComparisonBadge comparison={comparison} />
      )}
    </div>
  );
}

function ComparisonBadge({
  comparison,
}: {
  comparison: { ventasActual: number; ventasPrevio: number; deltaVentas: number; labelActual: string; labelPrevio: string };
}) {
  const { deltaVentas } = comparison;
  const positive = deltaVentas > 0;
  const neutral = deltaVentas === 0;
  const cls = neutral
    ? 'border-dash-line bg-dash-panel text-dash-ink-2'
    : positive
      ? 'border-dash-success/40 bg-dash-success/10 text-dash-success'
      : 'border-dash-danger/40 bg-dash-danger/10 text-dash-danger';
  return (
    <div
      className={'inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] font-medium tabular ' + cls}
      role="status"
      aria-label={
        neutral
          ? 'Sin cambio respecto al período previo'
          : positive
            ? `Subió ${Math.abs(deltaVentas).toFixed(1)} por ciento respecto al período previo`
            : `Bajó ${Math.abs(deltaVentas).toFixed(1)} por ciento respecto al período previo`
      }
      title={`Período previo: ${comparison.labelPrevio}`}
    >
      {!neutral && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={'h-3 w-3 ' + (positive ? '' : 'rotate-180')} aria-hidden="true">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      )}
      <span>
        {neutral ? '= sin cambio' : `${positive ? '▲' : '▼'} ${Math.abs(deltaVentas).toFixed(1)}%`}
        <span className="ml-1.5 text-dash-ink-3">vs período previo</span>
      </span>
    </div>
  );
}
