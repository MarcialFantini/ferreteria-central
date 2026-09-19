/**
 * Heatmap custom (no usamos Recharts para esto — renderizamos una grilla SVG).
 * 53 semanas — 7 días, con intensidad de color según el valor.
 */

interface HeatmapProps {
  cells: ReadonlyArray<{ semana: number; dia: number; value: number; count: number }>;
  maxValue: number;
  totalValue: number;
  totalCount: number;
  año: number;
}

const DIA_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']; // lunes..domingo

function intensityColor(value: number, max: number): string {
  if (max === 0) return 'rgba(99, 102, 241, 0.05)';
  const t = value / max;
  // Lerp de slate-900 a emerald-500
  if (t === 0) return 'rgba(99, 102, 241, 0.04)';
  const alpha = Math.max(0.1, Math.min(1, t));
  // Mezcla visual simple: cuanto más alto, más saturado emerald
  return `rgba(16, 185, 129, ${alpha.toFixed(2)})`;
}

export default function GraficoHeatmap({ cells, maxValue, totalValue, totalCount, año }: HeatmapProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-[11px] tabular text-dash-ink-3">
        <span>Año {año}</span>
        <span>
          {totalCount.toLocaleString('es-AR')} pedidos — ${(totalValue / 1_000_000).toFixed(1)}M ARS
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1">
          <div className="flex gap-0.5 pl-7 text-[9px] uppercase tracking-wider text-dash-ink-3">
            {Array.from({ length: 53 }).map((_, s) => (
              <span
                key={s}
                className="w-3 shrink-0 text-center tabular"
                style={{ visibility: s % 4 === 0 ? 'visible' : 'hidden' }}
              >
                {s + 1}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-0.5">
            {Array.from({ length: 7 }).map((_, dia) => (
              <div key={dia} className="flex items-center gap-0.5">
                <span className="w-6 shrink-0 text-[10px] font-medium uppercase text-dash-ink-3">{DIA_LABELS[dia]}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 53 }).map((_, semana) => {
                    const cell = cells.find((c) => c.semana === semana && c.dia === dia);
                    const value = cell?.value ?? 0;
                    const count = cell?.count ?? 0;
                    const color = intensityColor(value, maxValue);
                    return (
                      <div
                        key={semana}
                        className="h-3 w-3 shrink-0 rounded-sm transition-transform hover:scale-125 hover:ring-1 hover:ring-dash-accent"
                        style={{ backgroundColor: color }}
                        title={`Sem ${semana + 1} — ${DIA_LABELS[dia]}: $${new Intl.NumberFormat('es-AR').format(value)} (${count} pedidos)`}
                        role="img"
                        aria-label={`Semana ${semana + 1}, ${DIA_LABELS[dia]}: ${value.toLocaleString('es-AR')} ARS`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 text-[10px] text-dash-ink-3">
        <span>Menos</span>
        <div className="flex gap-0.5">
          {[0.1, 0.3, 0.5, 0.7, 0.9, 1].map((v) => (
            <span
              key={v}
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: intensityColor(v * maxValue, maxValue) }}
            />
          ))}
        </div>
        <span>Más</span>
      </div>
    </div>
  );
}
