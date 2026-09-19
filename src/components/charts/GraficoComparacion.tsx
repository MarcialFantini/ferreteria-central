import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatARS, formatMesCorto } from '../../lib/datos';

interface GraficoComparacionProps {
  /** Datos del período actual. */
  actual: ReadonlyArray<{ mes: string; ventas: number }>;
  /** Datos del período previo (alineados al actual por —ndice). */
  previo: ReadonlyArray<{ mes: string; ventas: number }>;
}

/**
 * Comparación de dos series en un mismo eje:
 *  - Línea azul: período actual
 *  - Línea slate punteada: período previo
 * Permite ver visualmente cómo se comparan mes a mes.
 */
export default function GraficoComparacion({ actual, previo }: GraficoComparacionProps) {
  if (actual.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-dash-line bg-dash-surface text-sm text-dash-ink-2">
        Sin datos para mostrar.
      </div>
    );
  }

// Merge por —ndice (los dos arrays tienen el mismo largo)
  const data = actual.map((a, i) => ({
    mes: a.mes,
    actual: a.ventas,
    previo: previo[i]?.ventas ?? 0,
  }));

  const ventasActualMax = Math.max(...data.map((d) => d.actual));
  const ventasPrevioMax = Math.max(...data.map((d) => d.previo));
  const primero = data[0]?.mes ?? '';
  const ultimo = data[data.length - 1]?.mes ?? '';
  const ariaLabel = `Gráfico de líneas comparando ventas del período actual (azul) versus período previo (gris punteado) en ${data.length} meses, desde ${primero} hasta ${ultimo}. Máximo actual ${formatARS(ventasActualMax)}, máximo previo ${formatARS(ventasPrevioMax)}.`;

  return (
    <div className="h-72 w-full sm:h-80" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="mes"
            stroke="var(--color-line)"
            tickLine={false}
            axisLine={{ stroke: 'var(--color-line)' }}
            tick={{ fill: 'var(--color-ink-2)', fontSize: 11 }}
            tickFormatter={formatMesCorto}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            stroke="var(--color-line)"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--color-ink-2)', fontSize: 11 }}
            tickFormatter={(v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`}
            width={56}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const pActual = payload.find((p) => p.dataKey === 'actual');
              const pPrevio = payload.find((p) => p.dataKey === 'previo');
              const vActual = Number(pActual?.value ?? 0);
              const vPrevio = Number(pPrevio?.value ?? 0);
              const delta = vPrevio > 0 ? ((vActual - vPrevio) / vPrevio) * 100 : 0;
              return (
                <div className="rounded-md border border-dash-line bg-dash-panel-2 px-3 py-2 text-xs shadow-lg">
                  <div className="mb-1.5 font-medium text-dash-ink-2">{formatMesCorto(String(label))}</div>
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-dash-ink-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-dash-accent" aria-hidden="true" />
                      Actual
                    </span>
                    <span className="tabular font-semibold text-dash-ink">{formatARS(vActual)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-dash-ink-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-dash-ink-3" aria-hidden="true" />
                      Previo
                    </span>
                    <span className="tabular font-semibold text-dash-ink">{formatARS(vPrevio)}</span>
                  </div>
                  <div className="mt-1.5 border-t border-dash-line pt-1 text-[10px] uppercase tracking-wider text-dash-ink-3">
                    Delta {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                  </div>
                </div>
              );
            }}
          />
          <Legend
            verticalAlign="top"
            height={28}
            wrapperStyle={{ fontSize: 11, color: 'var(--color-ink-2)' }}
            formatter={(value) => {
              if (value === 'actual') return <span style={{ color: 'var(--color-ink-2)' }}>Período actual</span>;
              if (value === 'previo') return <span style={{ color: 'var(--color-ink-2)' }}>Período previo</span>;
              return value;
            }}
          />
          <Line
            type="monotone"
            dataKey="previo"
            stroke="#64748B"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={true}
            animationDuration={500}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#3B82F6"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#3B82F6', stroke: 'var(--color-panel)', strokeWidth: 2 }}
            activeDot={{ r: 5, fill: '#3B82F6', stroke: 'var(--color-ink)', strokeWidth: 2 }}
            isAnimationActive={true}
            animationDuration={500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
