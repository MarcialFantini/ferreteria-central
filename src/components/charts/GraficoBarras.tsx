import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Producto, CategoriaProducto } from '../../types/producto';
import { CATEGORIA_LABELS } from '../../types/producto';
import { formatARS } from '../../lib/datos';
import { colorDeCategoria } from '../../lib/datos';

interface GraficoBarrasProps {
  data: ReadonlyArray<Producto>;
}

interface PayloadItem {
  value?: number | string;
  payload?: Producto;
}

interface TooltipContentProps {
  active?: boolean;
  payload?: PayloadItem[];
}

function TooltipContent({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const p = item.payload;
  if (!p) return null;
  const color = colorDeCategoria(p.categoria);
  return (
    <div className="rounded-md border border-dash-line bg-dash-panel-2 px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
        <span className="font-medium text-dash-ink">{p.nombre}</span>
      </div>
      <div className="tabular text-base font-semibold text-dash-ink">{formatARS(p.ingresoTotal)}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-dash-ink-2">
        {p.unidadesVendidas.toLocaleString('es-AR')} u. — margen {p.margen}%
      </div>
    </div>
  );
}

export default function GraficoBarras({ data }: GraficoBarrasProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-dash-line bg-dash-surface text-sm text-dash-ink-2">
        Sin productos para mostrar.
      </div>
    );
  }
  const ariaLabel = `Gráfico de barras horizontal con los ${data.length} productos top por ingreso. Líder: ${data[0].nombre} con ${formatARS(data[0].ingresoTotal)}.`;
  // Para BarChart horizontal invertimos X e Y
  return (
    <div role="img" aria-label={ariaLabel} className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={[...data].reverse()} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            stroke="var(--color-line)"
            tickLine={false}
            axisLine={{ stroke: 'var(--color-line)' }}
            tick={{ fill: 'var(--color-ink-2)', fontSize: 11 }}
            tickFormatter={(v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            stroke="var(--color-line)"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--color-ink-2)', fontSize: 11 }}
            width={140}
          />
          <Tooltip cursor={{ fill: 'var(--color-panel-2)' }} content={<TooltipContent />} />
          <Bar dataKey="ingresoTotal" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={500}>
            {data.map((p, i) => (
              <Cell key={p.id} fill={colorDeCategoria(p.categoria as CategoriaProducto)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
