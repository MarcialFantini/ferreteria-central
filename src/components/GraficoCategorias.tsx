import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import type { CategoriaProducto } from '../types/producto';
import { CATEGORIA_LABELS } from '../types/producto';
import { formatARS, type IngresoPorCategoria } from '../lib/datos';

/* ============================================================
   GraficoCategorias — donut de ingresos por categoría
   ============================================================ */

/**
 * Mapeo manual de cada categoría a un color de la paleta.
 * Compartido con GraficoBarras para mantener consistencia visual.
 */
const CATEGORIA_COLOR: Record<CategoriaProducto, string> = {
  herramientas_manuales: '#3B82F6', // blue
  herramientas_electricas: '#10B981', // green
  fijaciones: '#F59E0B', // amber
  plomeria: '#06B6D4', // cyan
  electricidad: '#A855F7', // purple
  pintureria: '#EC4899', // pink
};

export interface GraficoCategoriasProps {
  /** Distribución de ingresos por categoría, ya ordenada descendente. */
  data: IngresoPorCategoria[];
}

interface PayloadItem {
  value?: number;
  payload?: IngresoPorCategoria;
}

interface TooltipContentProps {
  active?: boolean;
  payload?: PayloadItem[];
}

function TooltipContent({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const row = item.payload;
  if (!row) return null;
  const color = CATEGORIA_COLOR[row.categoria];

  return (
    <div
      className="rounded-md border border-dash-line bg-dash-panel px-3 py-2 text-xs shadow-lg"
      role="tooltip"
    >
      <div className="mb-1 flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <span className="font-medium text-dash-ink">
          {CATEGORIA_LABELS[row.categoria]}
        </span>
      </div>
      <div className="tabular text-base font-semibold text-dash-ink">
        {formatARS(row.ingreso)}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-dash-ink-2">
        {row.participacion.toFixed(1)}% del ingreso
      </div>
    </div>
  );
}

/**
 * Donut chart de ingresos por categoría. Muestra un slice por categoría,
 * con leyenda a la derecha (en md+) o debajo (en mobile). El centro del
 * donut muestra el total acumulado para anclar visualmente.
 */
export default function GraficoCategorias({ data }: GraficoCategoriasProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex h-72 items-center justify-center rounded-lg border border-dashed border-dash-line bg-dash-panel text-sm text-dash-ink-2"
        role="img"
        aria-label="Gráfico de categorías sin datos"
      >
        Sin datos de categorías para mostrar.
      </div>
    );
  }

  const totalIngreso = data.reduce((acc, d) => acc + d.ingreso, 0);
  const top = data[0];
  const ariaLabel = `Donut de distribución de ingresos por categoría. Categoría líder: ${CATEGORIA_LABELS[top.categoria]} con ${top.participacion.toFixed(1)}% del ingreso (${formatARS(top.ingreso)}). Total acumulado: ${formatARS(totalIngreso)}.`;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
      <div
        role="img"
        aria-label={ariaLabel}
        className="relative h-56 w-full shrink-0 sm:h-64 lg:h-56 lg:basis-[58%]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="ingreso"
              nameKey="categoria"
              innerRadius="58%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="var(--color-surface)"
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={400}
            >
              {data.map((d) => (
                <Cell key={d.categoria} fill={CATEGORIA_COLOR[d.categoria]} />
              ))}
            </Pie>
            <Tooltip content={<TooltipContent />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wider text-dash-ink-3">
            Ingreso total
          </span>
          <span className="mt-1 text-xl font-semibold tabular-nums text-dash-ink sm:text-2xl">
            {formatARS(totalIngreso)}
          </span>
          <span className="mt-0.5 text-[10px] uppercase tracking-wider text-dash-ink-3">
            {data.length} categorías
          </span>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-3 lg:basis-[42%] lg:grid-cols-1">
        {data.map((d) => {
          const color = CATEGORIA_COLOR[d.categoria];
          return (
            <li
              key={d.categoria}
              className="flex items-baseline justify-between gap-3 border-b border-dash-line pb-2 last:border-b-0 lg:last:border-b"
            >
              <span className="flex items-center gap-2 text-[12px] text-dash-ink">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="font-medium">{CATEGORIA_LABELS[d.categoria]}</span>
              </span>
              <span className="flex items-baseline gap-2 tabular-nums">
                <span className="text-[11px] uppercase tracking-wider text-dash-ink-3">
                  {d.participacion.toFixed(1)}%
                </span>
                <span className="text-[12px] font-semibold text-dash-ink">
                  {formatARS(d.ingreso)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
