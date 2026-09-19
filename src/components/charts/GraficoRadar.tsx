import {
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip,
} from 'recharts';

interface RadarProps {
  data: Array<{ axis: string; value: number; fullMark: number }>;
  color?: string;
  label: string;
}

/**
 * Radar: 5-6 ejes (segmentos/categorías) con un valor normalizado
 * (0..100) por eje. —til para comparar perfil de cliente o mix.
 */
export default function GraficoRadar({ data, color = '#3B82F6', label }: RadarProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-dash-line bg-dash-surface text-sm text-dash-ink-2">
        Sin datos para mostrar.
      </div>
    );
  }

// Normalizar 0..100
  const normalized = data.map((d) => ({
    axis: d.axis,
    pct: d.fullMark > 0 ? Math.round((d.value / d.fullMark) * 100) : 0,
    raw: d.value,
  }));

  const maxRaw = Math.max(...normalized.map((d) => d.raw), 0);
  const axes = normalized.map((d) => `${d.axis} ${d.pct}%`).join(', ');
  const ariaLabel = `Gráfico de radar con ${normalized.length} ejes (${axes}). Pico máximo: ${maxRaw.toLocaleString('es-AR')}.`;

  return (
    <div className="h-72 w-full sm:h-80" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={normalized} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
          <PolarGrid stroke="var(--color-line)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: 'var(--color-ink-2)', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: 'var(--color-ink-3)', fontSize: 10 }}
            stroke="var(--color-line)"
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const item = payload[0];
              const d = item.payload as { axis: string; pct: number; raw: number };
              return (
                <div className="rounded-md border border-dash-line bg-dash-panel-2 px-3 py-2 text-xs shadow-lg">
                  <div className="font-medium text-dash-ink-2">{d.axis}</div>
                  <div className="mt-0.5 tabular text-sm font-semibold text-dash-ink">
                    ${new Intl.NumberFormat('es-AR').format(d.raw)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-dash-ink-3">{d.pct}% del máximo</div>
                </div>
              );
            }}
          />
          <Radar
            name={label}
            dataKey="pct"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.35}
            isAnimationActive={true}
            animationDuration={500}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
