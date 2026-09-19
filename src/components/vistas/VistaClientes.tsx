import { useMemo } from 'react';
import { formatARS, formatNumber, formatPercent, formatFechaLarga, CLIENTES } from '../../lib/datos';
import {
  segmentarClientes, statsPorSegmento, statsPorTipo,
  SEGMENTO_COLORS, type ClienteSegmentado,
} from '../../lib/clientes';
import { buildRadarTipoCliente } from '../../lib/tendencias';
import ChartCard from '../ChartCard';
import KPICard from '../KPICard';
import DataTable, { type DataTableColumn } from '../DataTable';
import GraficoRadar from '../charts/GraficoRadar';
import GraficoCategorias from '../charts/GraficoCategorias';

export default function VistaClientes() {
  const data = useMemo(() => {
    const HOY = new Date('2025-12-31T12:00:00Z');
    const seg = segmentarClientes(CLIENTES, HOY);
    const segStats = statsPorSegmento(seg);
    const tipoStats = statsPorTipo(CLIENTES);
    const radar = buildRadarTipoCliente(CLIENTES);
    const activos = CLIENTES.filter((c) => c.activo).length;
    const ingresoTotal = CLIENTES.reduce((acc, c) => acc + c.ingresoTotal, 0);
    const ticketPromedio = CLIENTES.length > 0 ? Math.round(ingresoTotal / CLIENTES.reduce((acc, c) => acc + c.pedidos, 0)) : 0;
    return { seg, segStats, tipoStats, radar, activos, ingresoTotal, ticketPromedio };
  }, []);

  const { seg, segStats, tipoStats, radar, activos, ingresoTotal, ticketPromedio } = data;

  const columns: ReadonlyArray<DataTableColumn<ClienteSegmentado>> = [
    {
      key: 'clienteId', label: 'ID', sortable: true, accessor: (r) => r.cliente.id, width: '80px',
      render: (r) => <span className="font-mono text-[11px] text-dash-accent">{r.cliente.id}</span>,
    },
    {
      key: 'nombre', label: 'Cliente', sortable: true, accessor: (r) => r.cliente.nombre,
    },
    {
      key: 'tipo', label: 'Tipo', sortable: true, accessor: (r) => r.cliente.tipo, width: '120px',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-[12px]">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: r.cliente.color }} aria-hidden="true" />
          {r.cliente.tipoLabel}
        </span>
      ),
    },
    {
      key: 'zona', label: 'Zona', sortable: true, accessor: (r) => r.cliente.zona, width: '120px',
    },
    {
      key: 'segmento', label: 'Segmento RFM', sortable: true, accessor: (r) => r.segmento, width: '130px',
      render: (r) => (
        <span
          className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ borderColor: `${SEGMENTO_COLORS[r.segmento]}55`, color: SEGMENTO_COLORS[r.segmento], backgroundColor: `${SEGMENTO_COLORS[r.segmento]}15` }}
        >
          {r.segmento}
        </span>
      ),
    },
    {
      key: 'rScore', label: 'R', sortable: true, align: 'right', accessor: (r) => r.rScore, width: '50px',
      render: (r) => <span className="font-mono text-[11px]">{r.rScore}</span>,
    },
    {
      key: 'fScore', label: 'F', sortable: true, align: 'right', accessor: (r) => r.fScore, width: '50px',
      render: (r) => <span className="font-mono text-[11px]">{r.fScore}</span>,
    },
    {
      key: 'mScore', label: 'M', sortable: true, align: 'right', accessor: (r) => r.mScore, width: '50px',
      render: (r) => <span className="font-mono text-[11px]">{r.mScore}</span>,
    },
    {
      key: 'recencia', label: 'Recencia', sortable: true, align: 'right', accessor: (r) => r.recencia, width: '90px',
      render: (r) => <span className="text-dash-ink-2">{r.recencia}d</span>,
    },
    {
      key: 'frecuencia', label: 'Pedidos', sortable: true, align: 'right', accessor: (r) => r.frecuencia, width: '90px',
      render: (r) => <span className="text-dash-ink">{formatNumber(r.frecuencia)}</span>,
    },
    {
      key: 'monetario', label: 'LTV', sortable: true, align: 'right', accessor: (r) => r.monetario,
      render: (r) => <span className="font-semibold text-dash-ink">{formatARS(r.monetario)}</span>,
    },
    {
      key: 'ultimaCompra', label: 'Última compra', sortable: true, accessor: (r) => r.cliente.ultimaCompra ?? '', width: '140px',
      render: (r) => r.cliente.ultimaCompra ? formatFechaLarga(r.cliente.ultimaCompra) : <span className="text-dash-ink-3">—</span>,
    },
  ];

  const filters = [
    {
      key: 'tipo',
      label: 'Tipo',
      options: [
        { value: 'profesional', label: 'Profesional' },
        { value: 'obra', label: 'Obra' },
        { value: 'hogar', label: 'Hogar' },
        { value: 'industria', label: 'Industria' },
        { value: 'institucion', label: 'Institución' },
      ],
    },
    {
      key: 'activo',
      label: 'Estado',
      options: [
        { value: 'true', label: 'Activos' },
        { value: 'false', label: 'Inactivos' },
      ],
    },
  ];

  return (
    <>
      <section aria-label="Indicadores de cartera" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <KPICard label="Clientes totales" value={CLIENTES.length} variacionPorcentual={0} icono="users" formato="number" accent="#3B82F6" />
        <KPICard label="Activos" value={activos} variacionPorcentual={0} icono="trend-up" formato="number" accent="#10B981" />
        <KPICard label="LTV total" value={ingresoTotal} variacionPorcentual={0} icono="money" formato="currency" accent="#F59E0B" />
        <KPICard label="Ticket promedio" value={ticketPromedio} variacionPorcentual={0} icono="ticket" formato="currency" accent="#EC4899" />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:mt-5 lg:grid-cols-3">
        <ChartCard
          title="Segmentación RFM"
          subtitle="5 segmentos — recencia + frecuencia + monetario"
          badge="RFM"
          className="lg:col-span-2"
        >
          <SegmentationBars segStats={segStats} />
        </ChartCard>

        <ChartCard title="Mix por tipo" subtitle="Distribución del ingreso por segmento de cliente" badge="Donut">
          <GraficoCategorias
            data={tipoStats.map((t) => ({
              categoria: t.tipo as any,
              ingreso: t.ingresoTotal,
              unidades: 0,
              participacion: ingresoTotal > 0 ? (t.ingresoTotal / ingresoTotal) * 100 : 0,
              margen: 0,
            }))}
          />
        </ChartCard>
      </section>

      <section className="mt-4 lg:mt-5">
        <ChartCard title="Perfil de cliente" subtitle="Distribución del ingreso por tipo de cliente (radar)" badge="Radar">
          <GraficoRadar
            data={radar}
            color="#3B82F6"
            label="Ingreso por tipo"
          />
        </ChartCard>
      </section>

      <section className="mt-4 lg:mt-5">
        <ChartCard
          title="Cartera de clientes"
          subtitle={`${CLIENTES.length} clientes — segmentación RFM individual`}
          padding="tight"
        >
          <DataTable
            rows={seg}
            columns={columns}
            filters={filters}
            searchPlaceholder="Buscar por nombre, zona, ID..."
            pageSize={20}
            filename="cartera-clientes"
            emptyMessage="Sin clientes para los filtros aplicados."
          />
        </ChartCard>
      </section>
    </>
  );
}

function SegmentationBars({ segStats }: { segStats: ReturnType<typeof statsPorSegmento> }) {
  const max = Math.max(...segStats.map((s) => s.ingresoTotal), 1);
  return (
    <div className="flex flex-col gap-3">
      {segStats.map((s) => {
        const pct = (s.ingresoTotal / max) * 100;
        const color = SEGMENTO_COLORS[s.segmento];
        return (
          <div key={s.segmento}>
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="flex items-center gap-2 font-medium text-dash-ink">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                {s.segmento}
              </span>
              <span className="flex items-baseline gap-2 tabular-nums">
                <span className="text-[10px] uppercase tracking-wider text-dash-ink-3">{s.cantidad} clientes</span>
                <span className="font-semibold text-dash-ink">{formatARS(s.ingresoTotal)}</span>
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-dash-surface">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
                aria-hidden="true"
              />
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-dash-ink-3">
              Ticket prom. {formatARS(s.ticketPromedio)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
