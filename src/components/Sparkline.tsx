import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';

interface SparklineProps {
  data: ReadonlyArray<number>;
  color?: string;
  height?: number;
  /** Mostrar el delta % al lado. */
  showDelta?: boolean;
}

/**
 * Mini gráfico de área para KPI cards.
 * 30+ puntos ? línea suave; <30 ? markers discretos.
 */
export default function Sparkline({
  data,
  color = '#3B82F6',
  height = 36,
}: SparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-9 w-full" aria-hidden="true">
        <div className="h-full w-full rounded-md bg-dash-panel-2/50" />
      </div>
    );
  }
  const series = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-9 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.6}
            fill={`url(#spark-${color.replace('#', '')})`}
            dot={false}
            isAnimationActive={true}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
