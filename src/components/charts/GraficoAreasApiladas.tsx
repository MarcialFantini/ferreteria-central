import {
  Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatMesCorto } from '../../lib/datos';

interface GraficoAreasApiladasProps {
  data: Array<Record<string, string | number>>;
  series: Array<{ key: string; label: string; color: string }>;
  labelKey: string;
}

export default function GraficoAreasApiladas({ data, series, labelKey }: GraficoAreasApiladasProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-dash-line bg-dash-surface text-sm text-dash-ink-2">
        Sin datos para mostrar.
      </div>
    );
  }

  const primero = String(data[0][labelKey] ?? '');
  const ultimo = String(data[data.length - 1][labelKey] ?? '');
  const seriesLabels = series.map((s) => s.label).join(', ');
  const ariaLabel = `Gráfico de áreas apiladas mostrando la composición por ${series.length} categorías (${seriesLabels}) a lo largo de ${data.length} meses, desde ${primero} hasta ${ultimo}.`;

  return (
    <div className="h-72 w-full sm:h-80" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.7} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.15} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={labelKey}
            stroke="var(--color-line)"
            tickLine={false}
            axisLine={false}
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
            width={50}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const total = payload.reduce((acc, p) => acc + Number(p.value ?? 0), 0);
              return (
                <div className="rounded-md border border-dash-line bg-dash-panel-2 px-3 py-2 text-xs shadow-lg">
                  <div className="mb-1.5 font-medium text-dash-ink-2">{formatMesCorto(String(label))}</div>
                  <ul className="flex flex-col gap-0.5">
{payload.map((p) => {
                      const serie = series.find((s) => s.key === p.dataKey);
                      const dataKeyStr = typeof p.dataKey === 'string' ? p.dataKey : String(p.dataKey);
                      return (
                        <li key={dataKeyStr} className="flex items-center justify-between gap-3 text-[11px]">
                          <span className="flex items-center gap-1.5 text-dash-ink-2">
                            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: serie?.color ?? p.color }} aria-hidden="true" />
                            {serie?.label ?? dataKeyStr}
                          </span>
                          <span className="tabular font-semibold text-dash-ink">
                            ${new Intl.NumberFormat('es-AR').format(Number(p.value))}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-1.5 border-t border-dash-line pt-1 text-[10px] uppercase tracking-wider text-dash-ink-3">
                    Total ${new Intl.NumberFormat('es-AR').format(total)}
                  </div>
                </div>
              );
            }}
          />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="circle"
            wrapperStyle={{ fontSize: 11, color: 'var(--color-ink-2)' }}
            formatter={(value) => {
              const s = series.find((s) => s.key === value);
              return <span style={{ color: 'var(--color-ink-2)' }}>{s?.label ?? value}</span>;
            }}
          />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stackId="1"
              stroke={s.color}
              strokeWidth={1.5}
              fill={`url(#grad-${s.key})`}
              isAnimationActive={true}
              animationDuration={500}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
