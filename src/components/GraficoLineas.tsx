import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { VentaMensual } from '../types/venta';
import { formatARS, formatMesCorto } from '../lib/datos';

/* ============================================================
   GraficoLineas
   ============================================================ */

export interface GraficoLineasProps {
  /** Filas a graficar (orden cronológico). */
  data: Pick<VentaMensual, 'mes' | 'ventasTotal'>[];
}

/** Tooltip custom: muestra el valor exacto formateado y el mes legible. */
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
    <div
      className="rounded-md border border-[var(--color-line)] bg-[var(--color-panel-2)] px-3 py-2 text-xs shadow-lg"
      role="tooltip"
    >
      <div className="mb-1 font-medium text-[var(--color-ink-2)]">{mesLegible}</div>
      <div className="tabular text-base font-semibold text-[var(--color-ink)]">
        {formatARS(ventas)}
      </div>
    </div>
  );
}

/** Formateador del eje Y: ARS corto, ej. "$2.5M". */
function formatARSCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

/**
 * Gráfico de líneas (Recharts) con el acento azul de la paleta, curva
 * suavizada y puntos visibles. Se monta como isla `client:visible`.
 */
export default function GraficoLineas({ data }: GraficoLineasProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex h-72 items-center justify-center rounded-lg border border-dashed border-dash-line bg-dash-panel text-sm text-dash-ink-2"
        role="img"
        aria-label="Gráfico de líneas sin datos para el período seleccionado"
      >
        Sin datos en el período seleccionado.
      </div>
    );
  }

  const primero = data[0].mes;
  const ultimo = data[data.length - 1].mes;
  const ariaLabel = `Gráfico de líneas mostrando ventas totales de los últimos ${data.length} meses, desde ${formatMesCorto(primero)} hasta ${formatMesCorto(ultimo)}. Rango ${formatARS(data[0].ventasTotal)} a ${formatARS(data[data.length - 1].ventasTotal)}.`;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="h-72 w-full rounded-md border border-dash-line bg-dash-surface/40 p-2 sm:h-80 sm:p-3"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="mes"
            stroke="var(--color-line)"
            tickLine={false}
            axisLine={{ stroke: 'var(--color-line)' }}
            tickFormatter={formatMesCorto}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            stroke="var(--color-line)"
            tickLine={false}
            axisLine={false}
            tickFormatter={formatARSCompact}
            width={56}
          />
          <Tooltip
            cursor={{ stroke: 'var(--color-accent)', strokeOpacity: 0.4, strokeWidth: 1 }}
            content={<TooltipContent />}
          />
          <Line
            type="monotone"
            dataKey="ventasTotal"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: 'var(--color-accent)', stroke: 'var(--color-panel)', strokeWidth: 2 }}
            activeDot={{ r: 5.5, fill: 'var(--color-accent)', stroke: 'var(--color-ink)', strokeWidth: 2 }}
            isAnimationActive={true}
            animationDuration={400}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}