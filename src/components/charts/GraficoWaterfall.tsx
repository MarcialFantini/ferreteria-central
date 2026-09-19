import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine,
} from 'recharts';
import { formatARS, formatMesCorto } from '../../lib/datos';

interface WaterfallStep {
  label: string;
  value: number;       // delta
  running: number;     // total acumulado
  tipo: 'positivo' | 'negativo' | 'neutro';
}

interface WaterfallProps {
  data: WaterfallStep[];
}

/**
 * Waterfall: cada barra muestra la diferencia contra el mes anterior.
 * El primer y Último mes se renderizan como "totales" (full bar).
 */
export default function GraficoWaterfall({ data }: WaterfallProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-dash-line bg-dash-surface text-sm text-dash-ink-2">
        Sin datos para el rango seleccionado.
      </div>
    );
  }

  // Construir data con base (para que las barras floten sobre cero)
  const plotData = data.map((step, i) => {
    const isTotal = i === 0 || i === data.length - 1;
    if (isTotal) {
      return {
        label: step.label,
        value: step.running,
        base: 0,
        tipo: 'neutro' as const,
        delta: step.value,
      };
    }
    // Para deltas: la barra va desde running_anterior a running_actual
    const prevRunning = data[i - 1].running;
    const base = step.value >= 0 ? prevRunning : step.running;
    return {
      label: step.label,
      value: Math.abs(step.value),
      base,
      tipo: step.tipo,
      delta: step.value,
    };
  });

const positives = plotData.filter((d) => d.tipo === 'positivo').length;
  const negatives = plotData.filter((d) => d.tipo === 'negativo').length;
  const primero = plotData[0]?.label ?? '';
  const ultimo = plotData[plotData.length - 1]?.label ?? '';
  const ariaLabel = `Gráfico de cascada con ${plotData.length} pasos desde ${primero} hasta ${ultimo}: ${positives} meses con delta positivo, ${negatives} con delta negativo.`;

  return (
    <div className="h-72 w-full sm:h-80" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={plotData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--color-line)"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--color-ink-2)', fontSize: 10 }}
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
          <ReferenceLine y={0} stroke="var(--color-line)" />
          <Tooltip
            cursor={{ fill: 'var(--color-panel-2)' }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const item = payload[0];
              const d = item.payload as { label: string; delta: number; tipo: string };
              return (
                <div className="rounded-md border border-dash-line bg-dash-panel-2 px-3 py-2 text-xs shadow-lg">
                  <div className="font-medium text-dash-ink-2">{formatMesCorto(d.label)}</div>
                  <div className="mt-1 tabular text-sm font-semibold text-dash-ink">
                    {d.delta > 0 ? '+' : ''}{formatARS(d.delta)}
                  </div>
                </div>
              );
            }}
          />
          <Bar
            dataKey="value"
            stackId="waterfall"
            radius={[3, 3, 0, 0]}
            isAnimationActive={true}
            animationDuration={500}
          >
            {plotData.map((d, i) => {
              const isTotal = i === 0 || i === plotData.length - 1;
              const color = isTotal
                ? '#3B82F6'
                : d.tipo === 'positivo'
                  ? '#10B981'
                  : d.tipo === 'negativo'
                    ? '#EF4444'
                    : '#94A3B8';
              return <Cell key={i} fill={color} fillOpacity={isTotal ? 0.85 : 0.95} />;
            })}
          </Bar>
          <Bar dataKey="base" stackId="waterfall" fill="transparent" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
