import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { Producto, CategoriaProducto } from '../types/producto';
import { CATEGORIA_LABELS } from '../types/producto';
import { formatARS } from '../lib/datos';

/* ============================================================
   GraficoBarras
   ============================================================ */

/**
 * Mapeo manual de cada categoría a un color de la paleta.
 * Elegido para tener buen contraste sobre el fondo dark (`#0F1419`)
 * y para que categorías adyacentes sean distinguibles incluso en
 * escala de grises (saturación diferenciada).
 */
const CATEGORIA_COLOR: Record<CategoriaProducto, string> = {
  herramientas_manuales: '#3B82F6', // blue
  herramientas_electricas: '#10B981', // green
  fijaciones: '#F59E0B', // amber
  plomeria: '#06B6D4', // cyan
  electricidad: '#A855F7', // purple
  pintureria: '#EC4899', // pink
};

export interface GraficoBarrasProps {
  /** Top N productos (orden descendente por ingresoTotal). */
  data: Pick<Producto, 'nombre' | 'ingresoTotal' | 'categoria'>[];
}

interface PayloadItem {
  value?: number | string;
  payload?: { nombre?: string; ingresoTotal?: number; categoria?: CategoriaProducto };
}

interface TooltipContentProps {
  active?: boolean;
  payload?: PayloadItem[];
}

function TooltipContent({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const ingreso = typeof item.value === 'number' ? item.value : Number(item.value ?? 0);
  const nombre = item.payload?.nombre ?? '';
  const cat = item.payload?.categoria;
  const color = cat ? CATEGORIA_COLOR[cat] : '#9BA5B0';

  return (
    <div
      className="rounded-md border border-[var(--color-line)] bg-[var(--color-panel-2)] px-3 py-2 text-xs shadow-lg"
      role="tooltip"
    >
      <div className="mb-1 flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <span className="font-medium text-[var(--color-ink)]">{nombre}</span>
      </div>
      <div className="tabular text-base font-semibold text-[var(--color-ink)]">
        {formatARS(ingreso)}
      </div>
      {cat && (
        <div className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--color-ink-2)]">
          {CATEGORIA_LABELS[cat]}
        </div>
      )}
    </div>
  );
}

/** Formateador compacto para el eje X (ARS). */
function formatARSCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

/**
 * Gráfico de barras horizontal (Recharts). Nombres de productos en el eje
 * Y, ingresos en el eje X. Color por categoría (Cell por barra).
 */
export default function GraficoBarras({ data }: GraficoBarrasProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex h-72 items-center justify-center rounded-lg border border-dashed border-[var(--color-line)] bg-[var(--color-panel)] text-sm text-[var(--color-ink-2)]"
        role="img"
        aria-label="Gráfico de barras sin datos para el período seleccionado"
      >
        Sin datos en el período seleccionado.
      </div>
    );
  }

  // Altura dinámica: 36px por fila + padding. Mantiene labels legibles.
  const rowHeight = 36;
  const chartHeight = Math.max(280, data.length * rowHeight + 60);

  const top = data[0];
  const bottom = data[data.length - 1];
  const ariaLabel = `Gráfico de barras horizontal mostrando los ${data.length} productos con mayor ingreso. Producto líder: ${top.nombre} (${formatARS(top.ingresoTotal)}). Producto con menor ingreso en el ranking: ${bottom.nombre} (${formatARS(bottom.ingresoTotal)}).`;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-2 sm:p-3"
      style={{ height: chartHeight }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 8, bottom: 4 }}
          barCategoryGap={6}
        >
          <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            stroke="var(--color-line)"
            tickLine={false}
            axisLine={{ stroke: 'var(--color-line)' }}
            tickFormatter={formatARSCompact}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            stroke="var(--color-line)"
            tickLine={false}
            axisLine={false}
            width={150}
            interval={0}
            tick={{ fontSize: 12, fill: 'var(--color-ink)' }}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-surface)', strokeOpacity: 0.4 }}
            content={<TooltipContent />}
          />
          <Bar
            dataKey="ingresoTotal"
            radius={[4, 4, 4, 4]}
            isAnimationActive={true}
            animationDuration={400}
            // Cell por entrada: aplica color por categoría
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            shape={(props: any) => {
              const { x, y, width, height, payload } = props as {
                x: number;
                y: number;
                width: number;
                height: number;
                payload: { categoria: CategoriaProducto };
              };
              const color = CATEGORIA_COLOR[payload.categoria] ?? '#9BA5B0';
              return (
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  rx={4}
                  ry={4}
                  fill={color}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}