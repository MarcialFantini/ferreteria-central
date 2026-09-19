import { useMemo } from 'react';
import { usePageContext } from '../PageContext';
import type { Periodo, RangoVentas } from '../../types/venta';
import {
  formatARS, formatNumber, formatPercent, formatMesCorto, formatFechaLarga,
  PEDIDOS, getPeriodRange, getVentasPorPeriodo, getKPIs,
} from '../../lib/datos';
import KPICard from '../KPICard';
import ChartCard from '../ChartCard';
import DataTable, { type DataTableColumn } from '../DataTable';
import GraficoLineas from '../charts/GraficoLineas';

export default function VistaVentas() {
  const { periodo, customRange } = usePageContext();
  const data = useMemo(() => {
    const rango = getPeriodRange(periodo, customRange);
    const ventas = getVentasPorPeriodo(rango.desde, rango.hasta);
    const kpis = getKPIs(periodo, customRange);
    const pedidos = PEDIDOS.filter((p) => p.mes >= rango.desde && p.mes <= rango.hasta);
    return { rango, ventas, kpis, pedidos };
  }, [periodo, customRange]);

  const { rango, ventas, kpis, pedidos } = data;

  const columns: ReadonlyArray<DataTableColumn<typeof pedidos[number]>> = [
    {
      key: 'id', label: 'Pedido', sortable: true, accessor: (r) => r.id, width: '160px',
      render: (r) => <span className="font-mono text-[11px] text-dash-accent">{r.id}</span>,
    },
    {
      key: 'fecha', label: 'Fecha', sortable: true, accessor: (r) => r.fecha, width: '140px',
      render: (r) => formatFechaLarga(r.fecha),
    },
    {
      key: 'clienteId', label: 'Cliente', sortable: true, accessor: (r) => r.clienteId, width: '100px',
      render: (r) => <span className="font-mono text-[11px]">{r.clienteId}</span>,
    },
    {
      key: 'clienteTipo', label: 'Tipo', sortable: true, accessor: (r) => r.clienteTipo, width: '120px',
      render: (r) => (
        <span className="inline-flex items-center rounded-md border border-dash-line bg-dash-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-dash-ink-2">
          {r.clienteTipo}
        </span>
      ),
    },
    {
      key: 'total', label: 'Total', sortable: true, align: 'right', accessor: (r) => r.total,
      render: (r) => <span className="font-semibold text-dash-ink">{formatARS(r.total)}</span>,
    },
    {
      key: 'metodoPago', label: 'Método', sortable: true, accessor: (r) => r.metodoPago, width: '120px',
    },
    {
      key: 'canal', label: 'Canal', sortable: true, accessor: (r) => r.canal, width: '100px',
    },
    {
      key: 'diaSemana', label: 'Día', sortable: true, accessor: (r) => r.diaSemana, width: '100px',
    },
  ];

  const filters = [
    {
      key: 'clienteTipo',
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
      key: 'metodoPago',
      label: 'Pago',
      options: [
        { value: 'efectivo', label: 'Efectivo' },
        { value: 'transferencia', label: 'Transferencia' },
        { value: 'tarjeta_debito', label: 'Tarjeta débito' },
        { value: 'tarjeta_credito', label: 'Tarjeta crédito' },
        { value: 'mercadopago', label: 'MercadoPago' },
      ],
    },
    {
      key: 'canal',
      label: 'Canal',
      options: [
        { value: 'mostrador', label: 'Mostrador' },
        { value: 'telefono', label: 'Teléfono' },
        { value: 'whatsapp', label: 'WhatsApp' },
        { value: 'app', label: 'App' },
      ],
    },
  ];

  const totalVentas = ventas.reduce((acc, v) => acc + v.ventasTotal, 0);
  const totalPedidos = ventas.reduce((acc, v) => acc + v.cantidadPedidos, 0);
  const promedioTicket = totalPedidos > 0 ? Math.round(totalVentas / totalPedidos) : 0;

  return (
    <>
      <section aria-label="Indicadores del listado" className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
        <KPICard label="Pedidos en el rango" value={pedidos.length} variacionPorcentual={0} icono="cart" formato="number" accent="#10B981" />
        <KPICard label="Facturación del rango" value={totalVentas} variacionPorcentual={kpis.variacionAnual} icono="money" formato="currency" accent="#3B82F6" />
        <KPICard label="Ticket promedio" value={promedioTicket} variacionPorcentual={kpis.variacionTicket} icono="ticket" formato="currency" accent="#F59E0B" />
      </section>

      <section className="mt-4 lg:mt-5">
        <ChartCard
          title="Facturación por mes"
          subtitle={`Serie mensual del rango activo (${ventas.length} meses)`}
        >
          <GraficoLineas data={ventas.map((v) => ({ mes: v.mes, ventasTotal: v.ventasTotal }))} />
        </ChartCard>
      </section>

      <section className="mt-4 lg:mt-5">
        <ChartCard
          title="Listado de pedidos"
          subtitle={`${pedidos.length.toLocaleString('es-AR')} pedidos en ${rango.desde} — ${rango.hasta}. Filtró, ordenó, exportó.`}
          padding="tight"
        >
          <DataTable
            rows={pedidos}
            columns={columns}
            filters={filters}
            searchPlaceholder="Buscar por ID, cliente, método..."
            pageSize={20}
            filename={`ventas-${rango.desde}-a-${rango.hasta}`}
            emptyMessage="No hay pedidos en el rango seleccionado."
          />
        </ChartCard>
      </section>

      <section className="mt-4 lg:mt-5">
        <ChartCard
          title="Detalle mensual"
          subtitle={`Tabla rápida de los ${ventas.length} meses del rango`}
          padding="tight"
        >
          <TablaMeses ventas={ventas} />
        </ChartCard>
      </section>
    </>
  );
}

function TablaMeses({ ventas }: { ventas: ReturnType<typeof getVentasPorPeriodo> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-dash-line">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-dash-surface text-[10px] uppercase tracking-wider text-dash-ink-3">
            <tr>
              <th className="px-3 py-2 text-left">Mes</th>
              <th className="px-3 py-2 text-right">Ventas</th>
              <th className="px-3 py-2 text-right">Pedidos</th>
              <th className="px-3 py-2 text-right">Ticket</th>
              <th className="px-3 py-2 text-right">vs mes ant.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dash-line">
            {ventas.map((v, idx) => (
              <tr key={v.mes} className="text-dash-ink-2 hover:bg-dash-surface/40">
                <td className="px-3 py-2">{formatMesCorto(v.mes)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-dash-ink">{formatARS(v.ventasTotal)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumber(v.cantidadPedidos)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatARS(v.ticketPromedio)}</td>
                <td className={'px-3 py-2 text-right tabular-nums ' + (v.variacion > 0 ? 'text-dash-success' : v.variacion < 0 ? 'text-dash-danger' : 'text-dash-ink-3')}>
                  {idx === 0 ? '—' : formatPercent(v.variacion)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
