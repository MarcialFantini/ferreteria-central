import { useEffect } from 'react';
import { formatARS, formatNumber, formatPercent, formatMesCorto } from '../lib/datos';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

export interface DrillDownSection {
  titulo: string;
  tipo: 'kpis' | 'tabla' | 'chart';
  kpis?: Array<{ label: string; value: string; sublabel?: string; accent?: string }>;
  tabla?: {
    columnas: Array<{ key: string; label: string; align?: 'left' | 'right' }>;
    filas: Array<Record<string, string | number>>;
    maxFilas?: number;
  };
  chart?: {
    data: Array<Record<string, string | number>>;
    dataKey: string;
    labelKey: string;
    color?: string;
  };
  nota?: string;
}

export interface DrillDownModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  sections: DrillDownSection[];
  onClose?: () => void;
}

/**
 * Modal de drill-down. Se abre al clickear un KPI card.
 * - Cerrable con Escape, click en overlay, o botón X.
 * - Sticky header con el título del KPI.
 * - Múltiples secciones: KPIs, tabla y/o chart pequeño.
 */
export default function DrillDownModal({ open, title, subtitle, sections, onClose }: DrillDownModalProps) {
  const close = onClose ?? (() => {});
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drilldown-title"
    >
<div
        className="absolute inset-0 bg-black/70 anim-fade-up"
        onClick={close}
        aria-hidden="true"
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-xl border border-dash-line bg-dash-panel shadow-2xl anim-fade-up sm:mx-4 sm:rounded-xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-dash-line bg-dash-panel/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 id="drilldown-title" className="text-base font-semibold tracking-tight text-dash-ink">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[12px] text-dash-ink-2">{subtitle}</p>
            )}
          </div>
<button
            type="button"
            onClick={close}
            className="rounded-md p-1.5 text-dash-ink-2 hover:bg-dash-panel-2 hover:text-dash-ink"
            aria-label="Cerrar modal"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-5">
            {sections.map((sec, i) => (
              <section key={i} aria-labelledby={`drill-sec-${i}`}>
                <h3
                  id={`drill-sec-${i}`}
                  className="mb-2 text-[10px] font-medium uppercase tracking-wider text-dash-ink-3"
                >
                  {sec.titulo}
                </h3>
                {sec.tipo === 'kpis' && sec.kpis && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {sec.kpis.map((k, idx) => (
                      <div key={idx} className="rounded-lg border border-dash-line bg-dash-surface p-3">
                        <div className="text-[10px] uppercase tracking-wider text-dash-ink-3">{k.label}</div>
                        <div className="mt-1 text-base font-semibold tabular-nums text-dash-ink" style={k.accent ? { color: k.accent } : undefined}>
                          {k.value}
                        </div>
                        {k.sublabel && (
                          <div className="mt-0.5 text-[10px] text-dash-ink-3">{k.sublabel}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {sec.tipo === 'tabla' && sec.tabla && (
                  <div className="overflow-hidden rounded-lg border border-dash-line">
                    <table className="w-full text-[12px]">
                      <thead className="bg-dash-surface text-[10px] uppercase tracking-wider text-dash-ink-3">
                        <tr>
                          {sec.tabla.columnas.map((c) => (
                            <th
                              key={c.key}
                              className={'px-3 py-2 ' + (c.align === 'right' ? 'text-right' : 'text-left')}
                            >
                              {c.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dash-line">
                        {sec.tabla.filas.slice(0, sec.tabla.maxFilas ?? 10).map((row, ridx) => (
                          <tr key={ridx} className="text-dash-ink-2">
                            {sec.tabla!.columnas.map((c) => (
                              <td
                                key={c.key}
                                className={
                                  'px-3 py-2 tabular-nums ' +
                                  (c.align === 'right' ? 'text-right font-semibold text-dash-ink' : 'text-left')
                                }
                              >
                                {String(row[c.key] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {sec.tipo === 'chart' && sec.chart && (
                  <div className="h-48 rounded-lg border border-dash-line bg-dash-surface p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sec.chart.data} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                        <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey={sec.chart.labelKey}
                          stroke="var(--color-line)"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: 'var(--color-ink-2)', fontSize: 10 }}
                          tickFormatter={(v: string) => formatMesCorto(v)}
                          interval="preserveStartEnd"
                          minTickGap={20}
                        />
                        <YAxis
                          stroke="var(--color-line)"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: 'var(--color-ink-2)', fontSize: 10 }}
                          tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1_000).toFixed(0)}K`}
                          width={40}
                        />
                        <Tooltip
                          cursor={{ fill: 'var(--color-panel-2)' }}
                          content={({ active, payload }) => {
                            if (!active || !payload || payload.length === 0) return null;
                            const item = payload[0];
                            return (
                              <div className="rounded-md border border-dash-line bg-dash-panel-2 px-2.5 py-1.5 text-xs shadow-lg">
                                <div className="font-medium text-dash-ink-2">{formatMesCorto(String(item.payload[sec.chart!.labelKey]))}</div>
                                <div className="tabular text-sm font-semibold text-dash-ink">{formatARS(Number(item.value))}</div>
                              </div>
                            );
                          }}
                        />
                        <Bar
                          dataKey={sec.chart.dataKey}
                          fill={sec.chart.color ?? '#3B82F6'}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={true}
                          animationDuration={400}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {sec.nota && (
                  <p className="mt-2 text-[11px] text-dash-ink-3">{sec.nota}</p>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper para construir el desglose de un KPI (los 6-12 meses
 * que componen el valor, en una tabla + chart pequeño).
 */
export function buildKpiDrillDown(opts: {
  titulo: string;
  subtitulo: string;
  filas: Array<{ mes: string; ventas: number; pedidos: number; ticket: number }>;
  ventasTotal: number;
  pedidosTotal: number;
  variacion: number;
}): DrillDownModalProps {
  const { titulo, subtitulo, filas, ventasTotal, pedidosTotal, variacion } = opts;
  const mejor = filas.reduce((a, b) => (b.ventas > a.ventas ? b : a), filas[0] ?? { mes: '', ventas: 0, pedidos: 0, ticket: 0 });
  const peor = filas.reduce((a, b) => (b.ventas < a.ventas ? b : a), filas[0] ?? { mes: '', ventas: 0, pedidos: 0, ticket: 0 });
  const promedio = filas.length > 0 ? Math.round(ventasTotal / filas.length) : 0;

  return {
    open: true,
    title: titulo,
    subtitle: subtitulo,
    sections: [
      {
        titulo: 'Resumen',
        tipo: 'kpis',
        kpis: [
          { label: 'Acumulado', value: formatARS(ventasTotal), accent: '#3B82F6' },
          { label: 'Pedidos', value: formatNumber(pedidosTotal), accent: '#10B981' },
          { label: 'Variación', value: formatPercent(variacion), accent: variacion > 0 ? '#10B981' : variacion < 0 ? '#EF4444' : undefined },
          { label: 'Mejor mes', value: mejor.mes ? formatARS(mejor.ventas) : '—', sublabel: mejor.mes ? formatMesCorto(mejor.mes) : undefined, accent: '#F59E0B' },
          { label: 'Peor mes', value: peor.mes ? formatARS(peor.ventas) : '—', sublabel: peor.mes ? formatMesCorto(peor.mes) : undefined, accent: '#EF4444' },
          { label: 'Promedio mensual', value: formatARS(promedio), accent: '#94A3B8' },
        ],
      },
      {
        titulo: 'Desglose mensual',
        tipo: 'chart',
        chart: {
          data: filas.map((f) => ({ mes: f.mes, ventas: f.ventas })),
          dataKey: 'ventas',
          labelKey: 'mes',
          color: '#3B82F6',
        },
        nota: 'Cada barra representa la facturación de un mes del rango seleccionado.',
      },
      {
        titulo: 'Tabla de meses',
        tipo: 'tabla',
        tabla: {
          columnas: [
            { key: 'mes', label: 'Mes', align: 'left' },
            { key: 'ventas', label: 'Ventas', align: 'right' },
            { key: 'pedidos', label: 'Pedidos', align: 'right' },
            { key: 'ticket', label: 'Ticket prom.', align: 'right' },
          ],
          filas: filas.map((f) => ({
            mes: formatMesCorto(f.mes),
            ventas: formatARS(f.ventas),
            pedidos: formatNumber(f.pedidos),
            ticket: formatARS(f.ticket),
          })),
          maxFilas: 12,
        },
      },
    ],
  };
}
