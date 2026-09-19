import { useMemo, useState } from 'react';
import { usePageContext } from '../PageContext';
import type { Periodo, RangoVentas } from '../../types/venta';
import {
  formatARS, formatNumber, formatMesCorto,
  getPeriodRange, getVentasPorPeriodo, getVentasDiariasPorPeriodo,
} from '../../lib/datos';
import {
  buildHeatmapAnual, buildEstacionalidadMensual, buildEstadisticasPorDiaSemana,
  buildWaterfallMensual, buildScatterVentasVsPedidos,
} from '../../lib/tendencias';
import ChartCard from '../ChartCard';
import KPICard from '../KPICard';
import GraficoHeatmap from '../charts/GraficoHeatmap';
import GraficoScatter from '../charts/GraficoScatter';
import GraficoWaterfall from '../charts/GraficoWaterfall';
import GraficoRadar from '../charts/GraficoRadar';

export default function VistaTendencias() {
  const { periodo, customRange } = usePageContext();
  const [añoHeatmap, setAñoHeatmap] = useState<number>(2025);

  const data = useMemo(() => {
    const rango = getPeriodRange(periodo, customRange);
    const ventas = getVentasPorPeriodo(rango.desde, rango.hasta);
    const diarias = getVentasDiariasPorPeriodo(rango.desde, rango.hasta);
    const heatmap = buildHeatmapAnual(diarias, añoHeatmap);
    const estacionalidad = buildEstacionalidadMensual(ventas);
    const diasSemana = buildEstadisticasPorDiaSemana(diarias);
    const waterfall = buildWaterfallMensual(ventas);
    const scatter = buildScatterVentasVsPedidos(diarias);
    const añosDisponibles = Array.from(new Set(diarias.map((d) => d.anio))).sort((a, b) => b - a);
    return { rango, ventas, diarias, heatmap, estacionalidad, diasSemana, waterfall, scatter, añosDisponibles };
  }, [periodo, customRange, añoHeatmap]);

  const { rango, ventas, diarias, heatmap, estacionalidad, diasSemana, waterfall, scatter, añosDisponibles } = data;

  const totalVentas = ventas.reduce((acc, v) => acc + v.ventasTotal, 0);
  const mejorMes = estacionalidad.reduce((a, b) => (b.promedioVentas > a.promedioVentas ? b : a), estacionalidad[0] ?? { promedioVentas: 0 });
  const mejorDia = diasSemana.reduce((a, b) => (b.promedioVentas > a.promedioVentas ? b : a), diasSemana[0] ?? { promedioVentas: 0 });

  return (
    <>
      <section aria-label="Indicadores de tendencias" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <KPICard label="Ventas acumuladas" value={totalVentas} variacionPorcentual={0} icono="money" formato="currency" accent="#3B82F6" />
        <KPICard label="Mejor mes (promedio)" value={mejorMes.promedioVentas} variacionPorcentual={0} icono="calendar" formato="currency" accent="#10B981" />
        <KPICard label="Mejor día de la semana" value={mejorDia.promedioVentas} variacionPorcentual={0} icono="trend-up" formato="currency" accent="#F59E0B" />
        <KPICard label="Días analizados" value={diarias.length} variacionPorcentual={0} icono="calendar" formato="number" accent="#EC4899" />
      </section>

      <section className="mt-4 lg:mt-5">
        <ChartCard
          title="Heatmap anual"
          subtitle={`Cada celda es un día — intensidad = facturación (${añoHeatmap})`}
          badge="Heatmap"
          action={
            <select
              value={añoHeatmap}
              onChange={(e) => setAñoHeatmap(Number(e.target.value))}
              aria-label="Año del heatmap"
              className="rounded-md border border-dash-line bg-dash-panel px-2 py-1 text-[11px] text-dash-ink focus:border-dash-accent focus:outline-none"
            >
              {añosDisponibles.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          }
        >
          <GraficoHeatmap
            cells={heatmap.cells}
            maxValue={heatmap.maxValue}
            totalValue={heatmap.totalValue}
            totalCount={heatmap.totalCount}
            año={añoHeatmap}
          />
        </ChartCard>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:mt-5 lg:grid-cols-2">
        <ChartCard
          title="Estacionalidad mensual"
          subtitle="Promedio histórico de cada mes (8 años) — radar"
          badge="Radar"
        >
          <GraficoRadar
            data={estacionalidad.map((e) => ({ axis: e.mesLabel, value: e.promedioVentas, fullMark: Math.max(...estacionalidad.map((x) => x.promedioVentas), 1) }))}
            color="#F59E0B"
            label="Promedio mensual"
          />
        </ChartCard>

        <ChartCard
          title="Día de la semana"
          subtitle="Promedio de facturación por día — radar"
          badge="Radar"
        >
          <GraficoRadar
            data={diasSemana.map((d) => ({ axis: d.diaLabel.slice(0, 3), value: d.promedioVentas, fullMark: Math.max(...diasSemana.map((x) => x.promedioVentas), 1) }))}
            color="#3B82F6"
            label="Promedio por día"
          />
        </ChartCard>
      </section>

      <section className="mt-4 lg:mt-5">
        <ChartCard
          title="Waterfall — variación mes a mes"
          subtitle={`${ventas.length} meses — barras verdes = suba — rojas = baja`}
          badge="Waterfall"
        >
          <GraficoWaterfall data={waterfall} />
        </ChartCard>
      </section>

      <section className="mt-4 lg:mt-5">
        <ChartCard
          title="Pedidos vs facturación (por día)"
          subtitle={`${diarias.length} puntos — un punto por día del rango activo`}
          badge="Scatter"
        >
          <GraficoScatter
            data={scatter}
            xLabel="Pedidos"
            yLabel="Facturación (M ARS)"
          />
        </ChartCard>
      </section>

      <section className="mt-4 lg:mt-5">
        <ChartCard
          title="Tabla mensual"
          subtitle="Estacionalidad agregada por mes (promedio de 8 años)"
          padding="tight"
        >
          <TablaEstacionalidad data={estacionalidad} />
        </ChartCard>
      </section>
    </>
  );
}

function TablaEstacionalidad({ data }: { data: ReturnType<typeof buildEstacionalidadMensual> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-dash-line">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-dash-surface text-[10px] uppercase tracking-wider text-dash-ink-3">
            <tr>
              <th className="px-3 py-2 text-left">Mes</th>
              <th className="px-3 py-2 text-right">Promedio ventas</th>
              <th className="px-3 py-2 text-right">Promedio pedidos</th>
              <th className="px-3 py-2 text-right">vs promedio gral.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dash-line">
            {data.map((row) => (
              <tr key={row.mesNum} className="text-dash-ink-2 hover:bg-dash-surface/40">
                <td className="px-3 py-2">{row.mesLabel}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-dash-ink">{formatARS(row.promedioVentas)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumber(row.promedioPedidos)}</td>
                <td className={'px-3 py-2 text-right tabular-nums ' + (row.variacionVsPromedio > 0 ? 'text-dash-success' : row.variacionVsPromedio < 0 ? 'text-dash-danger' : 'text-dash-ink-3')}>
                  {row.variacionVsPromedio > 0 ? '+' : ''}{row.variacionVsPromedio.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
