import {
  CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';

interface ScatterProps {
  data: Array<{ x: number; y: number; z: number; label: string }>;
  xLabel: string;
  yLabel: string;
}

/**
 * Scatter: cada punto es un día (pedidos vs ventas en millones de ARS).
 * El tamaño del punto crece con el monto facturado.
 */
export default function GraficoScatter({ data, xLabel, yLabel }: ScatterProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-dash-line bg-dash-surface text-sm text-dash-ink-2">
        Sin datos para mostrar.
      </div>
    );
  }

const xMin = Math.min(...data.map((d) => d.x), 0);
  const xMax = Math.max(...data.map((d) => d.x), 0);
  const yMin = Math.min(...data.map((d) => d.y), 0);
  const yMax = Math.max(...data.map((d) => d.y), 0);
  const ariaLabel = `Gráfico de dispersión con ${data.length} puntos mostrando ${yLabel} (eje Y) versus ${xLabel} (eje X), tamaño proporcional a facturación. Rango X: ${xMin.toFixed(1)}–${xMax.toFixed(1)}. Rango Y: ${yMin.toFixed(2)}–${yMax.toFixed(2)} millones.`;

  return (
    <div className="h-72 w-full sm:h-80" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 16, left: 4, bottom: 16 }}>
          <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            stroke="var(--color-line)"
            tickLine={false}
            axisLine={{ stroke: 'var(--color-line)' }}
            tick={{ fill: 'var(--color-ink-2)', fontSize: 11 }}
            label={{ value: xLabel, position: 'insideBottom', offset: -8, fill: 'var(--color-ink-2)', fontSize: 11 }}
            name={xLabel}
          />
          <YAxis
            type="number"
            dataKey="y"
            stroke="var(--color-line)"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--color-ink-2)', fontSize: 11 }}
            tickFormatter={(v: number) => `${v.toFixed(1)}M`}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--color-ink-2)', fontSize: 11 }}
            width={56}
            name={yLabel}
          />
          <ZAxis type="number" dataKey="z" range={[20, 200]} name="Facturación" />
          <Tooltip
            cursor={{ stroke: 'var(--color-accent)', strokeOpacity: 0.3 }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const item = payload[0];
              const d = item.payload as { x: number; y: number; z: number; label: string };
              return (
                <div className="rounded-md border border-dash-line bg-dash-panel-2 px-3 py-2 text-xs shadow-lg">
                  <div className="font-medium text-dash-ink-2">{d.label}</div>
                  <div className="mt-1 tabular text-sm font-semibold text-dash-ink">
                    ${new Intl.NumberFormat('es-AR').format(d.z)}
                  </div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-wider text-dash-ink-3">
                    {d.x} pedidos — ${d.y.toFixed(2)}M
                  </div>
                </div>
              );
            }}
          />
          <Scatter
            data={data}
            fill="#3B82F6"
            fillOpacity={0.6}
            stroke="#3B82F6"
            strokeWidth={0.5}
            isAnimationActive={true}
            animationDuration={500}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
