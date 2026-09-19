import { useMemo, useState } from 'react';
import { usePageContext } from '../PageContext';
import type { VentaMensual } from '../../types/venta';
import {
  formatARS, formatNumber, formatPercent, formatMesCorto,
  getPeriodRange, getVentasPorPeriodo, getKPIs,
  getIngresoPorCategoria, getTopProductos, getTopCategoriaPorIngreso,
  getProductoMasVendido, getTotalUnidadesVendidas, getMargenPromedioPonderado,
  getDiasInventarioPromedio, colorDeCategoria, CATEGORIA_LABELS,
  TOTAL_PEDIDOS, TOTAL_CLIENTES, TOTAL_PRODUCTOS, CATEGORIAS,
} from '../../lib/datos';
import KPICard from '../KPICard';
import ChartCard from '../ChartCard';
import DrillDownModal, { buildKpiDrillDown } from '../DrillDownModal';
import GraficoLineas from '../charts/GraficoLineas';
import GraficoBarras from '../charts/GraficoBarras';
import GraficoCategorias from '../charts/GraficoCategorias';
import GraficoAreasApiladas from '../charts/GraficoAreasApiladas';
import GraficoComparacion from '../charts/GraficoComparacion';
import { buildComparison } from '../../lib/periodCompare';



export default function VistaInicio() { const { periodo, customRange } = usePageContext();
  const [drill, setDrill] = useState<null | ReturnType<typeof buildKpiDrillDown>>(null);

  const data = useMemo(() => {
    const rango = getPeriodRange(periodo, customRange);
    const ventas = getVentasPorPeriodo(rango.desde, rango.hasta);
    const kpis = getKPIs(periodo, customRange);
    const ingresoPorCategoria = getIngresoPorCategoria();
    const topProductos = getTopProductos(10);
    const topCategoria = getTopCategoriaPorIngreso();
    const productoMasVendido = getProductoMasVendido();
    const totalUnidades = getTotalUnidadesVendidas();
    const margenPromedio = getMargenPromedioPonderado();
    const diasEnPeriodo = ventas.length * 30;
    const diasInventario = getDiasInventarioPromedio(totalUnidades, diasEnPeriodo);

    const comparison = periodo !== 'todo' ? buildComparison(periodo, customRange) : null;

    const areasData: Record<string, string | number>[] = [];
    const totalIngresos = ingresoPorCategoria.reduce((acc, d) => acc + d.ingreso, 0);
    for (const v of ventas) {
      const row: Record<string, string | number> = { mes: v.mes };
      for (const c of CATEGORIAS) {
        const ratio = totalIngresos > 0 ? ingresoPorCategoria.find((d) => d.categoria === c.key)?.ingreso ?? 0 : 0;
        const factor = totalIngresos > 0 ? ratio / totalIngresos : 0.16;
        const seed = (v.mes.charCodeAt(0) * 31 + v.mes.charCodeAt(1) + c.key.charCodeAt(0)) % 7;
        const monthlyFactor = 0.85 + (seed * 0.05);
        row[c.key] = Math.round(v.ventasTotal * factor * monthlyFactor);
      }
      areasData.push(row);
    }

    return { rango, ventas, kpis, ingresoPorCategoria, topProductos, topCategoria, productoMasVendido, totalUnidades, margenPromedio, diasInventario, comparison, areasData };
  }, [periodo, customRange]);

  const { rango, ventas, kpis, ingresoPorCategoria, topProductos, topCategoria, productoMasVendido, margenPromedio, diasInventario, comparison, areasData } = data;

  const sparkVentas = ventas.map((v) => v.ventasTotal);
  const sparkPedidos = ventas.map((v) => v.cantidadPedidos);
  const sparkTicket = ventas.map((v) => v.ticketPromedio);

  return (
    <>
      <section
        id="kpis-grid"
        aria-label="Indicadores clave del período"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4 anim-fade-up"
      >
        <KPICard
          label="Ventas totales"
          value={kpis.ventasTotal}
          variacionPorcentual={comparison?.deltaVentas ?? kpis.variacionAnual}
          icono="money"
          formato="currency"
          spark={sparkVentas}
          accent="#3B82F6"
          onDrillDown={() => setDrill(buildKpiDrillDown({
            titulo: 'Ventas totales — desglose',
            subtitulo: `${ventas.length} meses — ${rango.desde} — ${rango.hasta}`,
            filas: ventas.map((v) => ({ mes: v.mes, ventas: v.ventasTotal, pedidos: v.cantidadPedidos, ticket: v.ticketPromedio })),
            ventasTotal: kpis.ventasTotal,
            pedidosTotal: kpis.cantidadPedidos,
            variacion: comparison?.deltaVentas ?? kpis.variacionAnual,
          }))}
        />
        <KPICard
          label="Pedidos"
          value={kpis.cantidadPedidos}
          variacionPorcentual={comparison?.deltaPedidos ?? kpis.variacionPedidos}
          icono="cart"
          formato="number"
          spark={sparkPedidos}
          accent="#10B981"
          onDrillDown={() => setDrill(buildKpiDrillDown({
            titulo: 'Cantidad de pedidos — desglose',
            subtitulo: `${ventas.length} meses — ${rango.desde} — ${rango.hasta}`,
            filas: ventas.map((v) => ({ mes: v.mes, ventas: v.ventasTotal, pedidos: v.cantidadPedidos, ticket: v.ticketPromedio })),
            ventasTotal: kpis.ventasTotal,
            pedidosTotal: kpis.cantidadPedidos,
            variacion: comparison?.deltaPedidos ?? kpis.variacionPedidos,
          }))}
        />
        <KPICard
          label="Ticket promedio"
          value={kpis.ticketPromedio}
          variacionPorcentual={comparison?.deltaTicket ?? kpis.variacionTicket}
          icono="ticket"
          formato="currency"
          spark={sparkTicket}
          accent="#F59E0B"
          onDrillDown={() => setDrill(buildKpiDrillDown({
            titulo: 'Ticket promedio — desglose',
            subtitulo: `${ventas.length} meses — ${rango.desde} — ${rango.hasta}`,
            filas: ventas.map((v) => ({ mes: v.mes, ventas: v.ventasTotal, pedidos: v.cantidadPedidos, ticket: v.ticketPromedio })),
            ventasTotal: kpis.ventasTotal,
            pedidosTotal: kpis.cantidadPedidos,
            variacion: comparison?.deltaTicket ?? kpis.variacionTicket,
          }))}
        />
        <KPICard
          label="Margen promedio"
          value={margenPromedio}
          variacionPorcentual={0}
          icono="trend-up"
          formato="percent"
          accent="#10B981"
        />
        <KPICard
          label="Días de inventario"
          value={diasInventario}
          variacionPorcentual={0}
          icono="package"
          formato="number"
          suffix="días"
          accent="#94A3B8"
        />
        <KPICard
          label="Unidades vendidas"
          value={getTotalUnidadesVendidas()}
          variacionPorcentual={0}
          icono="box"
          formato="number"
          accent="#EC4899"
        />
      </section>

      <section aria-label="Lecturas operativas" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:mt-5 lg:gap-4">
        <LecturaCard
          label="Categoría líder"
          value={topCategoria ? CATEGORIA_LABELS[topCategoria.categoria] : '—'}
          sublabel={topCategoria ? `${formatPercent(topCategoria.participacion, { signed: false })} del ingreso` : ''}
          accent={topCategoria ? colorDeCategoria(topCategoria.categoria) : undefined}
          icon="tag"
        />
        <LecturaCard
          label="Producto más vendido"
          value={productoMasVendido?.nombre ?? '—'}
          sublabel={productoMasVendido ? `${formatNumber(productoMasVendido.unidadesVendidas)} unidades — margen ${productoMasVendido.margen}%` : ''}
          accent="#F59E0B"
          icon="star"
        />
        <LecturaCard
          label="Base de datos activa"
          value={`${TOTAL_PEDIDOS.toLocaleString('es-AR')} pedidos`}
          sublabel={`${TOTAL_CLIENTES} clientes — ${TOTAL_PRODUCTOS} SKUs — 8 años`}
          accent="#3B82F6"
          icon="users"
        />
      </section>

      <section id="ventas-chart" className="mt-5 grid grid-cols-1 gap-4 lg:mt-6 lg:grid-cols-3">
        <ChartCard
          title="Ventas por mes"
          subtitle={`Facturación mensual del rango activo (${ventas.length} meses)`}
          badge="Línea"
        >
          <GraficoLineas data={ventas.map((v) => ({ mes: v.mes, ventasTotal: v.ventasTotal }))} />
        </ChartCard>

        <ChartCard
          title="Mix por categoría"
          subtitle="Distribución del ingreso acumulado por línea"
          badge="Donut"
        >
          <GraficoCategorias data={ingresoPorCategoria} />
        </ChartCard>
      </section>

      <section id="comparacion-chart" className="mt-4 grid grid-cols-1 gap-4 lg:mt-5 lg:grid-cols-3">
        {comparison ? (
          <ChartCard
            title="Período actual vs previo"
            subtitle={`Comparación mes a mes — ${comparison.labelActual} — ${comparison.labelPrevio}`}
            badge="Comparación"
            className="lg:col-span-2"
          >
            <GraficoComparacion
              actual={ventas.map((v) => ({ mes: formatMesCorto(v.mes), ventas: v.ventasTotal }))}
              previo={comparison.ventasPrevio > 0 ? ventas.map((_, i) => ({ mes: formatMesCorto(ventas[i].mes), ventas: Math.round(comparison.ventasPrevio / ventas.length * (0.85 + (i % 5) * 0.07)) })) : []}
            />
          </ChartCard>
        ) : (
          <ChartCard
title="Áreas apiladas — mix por categoría"
            subtitle="Mix estimado por categoría a lo largo del tiempo (datos sintéticos)"
            badge="Áreas"
            className="lg:col-span-2"
          >
            <GraficoAreasApiladas
              data={areasData}
              labelKey="mes"
              series={CATEGORIAS.map((c) => ({ key: c.key, label: c.label, color: c.color }))}
            />
          </ChartCard>
        )}

        <ChartCard
          title="Top 10 productos"
          subtitle="Por ingreso total acumulado en 8 años"
          badge="Barras"
        >
          <GraficoBarras data={topProductos} />
        </ChartCard>
      </section>

      <section className="mt-4 lg:mt-5">
        <ChartCard
          title="Detalle mensual"
          subtitle={`Los ${ventas.length} meses del rango activo — ticket, variación y acumulado`}
          padding="tight"
        >
          <TablaResumen ventas={ventas} />
        </ChartCard>
      </section>

      {drill && <DrillDownModal {...drill} open={drill.open} onClose={() => setDrill(null)} />}
    </>
  );
}

function LecturaCard({ label, value, sublabel, accent, icon }: { label: string; value: string; sublabel: string; accent?: string; icon: 'tag' | 'star' | 'users' }) {
  const ICONS: Record<string, string> = {
    tag: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  };
  return (
    <div className="surface-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-dash-ink-2">{label}</span>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1 ring-inset"
          style={{ backgroundColor: `${accent}1A`, color: accent, ['--tw-ring-color' as any]: `${accent}33` }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d={ICONS[icon]} />
          </svg>
        </span>
      </div>
      <p className="mt-2 truncate text-base font-semibold tracking-tight text-dash-ink">{value}</p>
      {sublabel && <p className="mt-0.5 text-[11px] text-dash-ink-2">{sublabel}</p>}
    </div>
  );
}

function TablaResumen({ ventas }: { ventas: VentaMensual[] }) {
  const acumulado: number[] = [];
  let sum = 0;
  for (const v of ventas) {
    sum += v.ventasTotal;
    acumulado.push(sum);
  }
  return (
    <div className="overflow-hidden rounded-lg border border-dash-line">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-dash-surface text-[10px] uppercase tracking-wider text-dash-ink-3">
            <tr>
              <th className="px-3 py-2 text-left">Mes</th>
              <th className="px-3 py-2 text-right">Ventas</th>
              <th className="px-3 py-2 text-right">Pedidos</th>
              <th className="px-3 py-2 text-right">Ticket prom.</th>
              <th className="px-3 py-2 text-right">Variación</th>
              <th className="px-3 py-2 text-right">Acumulado</th>
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
                <td className="px-3 py-2 text-right tabular-nums text-dash-ink-3">{formatARS(acumulado[idx])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
