import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatARS, formatMesCorto, formatARSCompact } from '../../lib/datos';

interface PayloadItem {
  value?: number | string;
  payload?: { mes?: string; ventasTotal?: number };
}

interface TooltipContentProps {
  active?: boolean;
  payload?: PayloadItem[];
}

function TooltipContent({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const ventas = typeof item.value === 'number' ? item.value : Number(item.value ?? 0);
  const mesLegible = item.payload?.mes ? formatMesCorto(item.payload.mes) : '';
  return (
    <div className="rounded-md border border-dash-line bg-dash-panel-2 px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-medium text-dash-ink-2">{mesLegible}</div>
      <div className="tabular text-base font-semibold text-dash-ink">{formatARS(ventas)}</div>
    </div>
  );
}

interface GraficoLineasProps {
  data: ReadonlyArray<{ mes: string; ventasTotal: number }>;
  /** Color de la línea. Default azul. */
  color?: string;
}

export default function GraficoLineas({ data, color = '#3B82F6' }: GraficoLineasProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-dash-line bg-dash-surface text-sm text-dash-ink-2">
        Sin datos en el período seleccionado.
      </div>
    );
  }
  const primero = data[0].mes;
  const ultimo = data[data.length - 1].mes;
  const ariaLabel = `Gráfico de líneas mostrando ventas totales de ${data.length} meses, desde ${formatMesCorto(primero)} hasta ${formatMesCorto(ultimo)}. Rango ${formatARS(data[0].ventasTotal)} a ${formatARS(data[data.length - 1].ventasTotal)}.`;
  return (
    <div role="img" aria-label={ariaLabel} className="h-72 w-full sm:h-80">
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
            tickFormatter={formatARSCompact}
            width={56}
          />
          <Tooltip cursor={{ stroke: color, strokeOpacity: 0.35 }} content={<TooltipContent />} />
          <Line
            type="monotone"
            dataKey="ventasTotal"
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3, fill: color, stroke: 'var(--color-panel)', strokeWidth: 2 }}
            activeDot={{ r: 5, fill: color, stroke: 'var(--color-ink)', strokeWidth: 2 }}
            isAnimationActive={true}
            animationDuration={500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
