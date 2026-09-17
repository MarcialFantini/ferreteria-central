import { useMemo, useState } from 'react';

import type { Periodo } from '../types/venta';
import { PERIODO_LABELS } from '../types/venta';
import { CATEGORIA_LABELS } from '../types/producto';

import {
  formatARS,
  formatNumber,
  getKPIs,
  getPeriodRange,
  getTopProductos,
  getVentasPorPeriodo,
  TOTAL_PRODUCTOS,
} from '../lib/datos';

import KPICard from './KPICard';
import GraficoLineas from './GraficoLineas';
import GraficoBarras from './GraficoBarras';
import PeriodoSelector from './PeriodoSelector';

/* ============================================================
   Dashboard
   ============================================================ */

const TOP_N_PRODUCTOS = 10;

/**
 * Orquesta el estado del selector de período y re-deriva todos los datos
 * derivados del rango activo. Garantiza que `kpis.ventasTotal` sea igual
 * a la suma de los puntos del LineChart en el mismo rango (T10.16) porque
 * `getKPIs` consume el mismo `getVentasPorPeriodo` que el gráfico.
 */
export default function Dashboard() {
  const [periodo, setPeriodo] = useState<Periodo>('ultimo_anio');

  // Derivados memoizados — cambian solo cuando cambia el período.
  const { rango, ventasRango, kpis, topProductos } = useMemo(() => {
    const rango = getPeriodRange(periodo);
    const ventasRango = getVentasPorPeriodo(rango.desde, rango.hasta);
    const kpis = getKPIs(periodo);
    const topProductos = getTopProductos(TOP_N_PRODUCTOS);
    return { rango, ventasRango, kpis, topProductos };
  }, [periodo]);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Fila de control: Período activo */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <PeriodoSelector value={periodo} onChange={setPeriodo} />
        <p className="text-xs text-dash-ink-2 tabular">
          Mostrando <span className="font-semibold text-dash-ink">{ventasRango.length}</span>{' '}
          {ventasRango.length === 1 ? 'mes' : 'meses'}
          <span className="mx-2 text-dash-line">·</span>
          {PERIODO_LABELS[periodo]}
        </p>
      </div>

      {/* Grid de KPIs */}
      <section
        aria-label="Indicadores clave del período"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4"
      >
        <KPICard
          label="Ventas totales"
          value={kpis.ventasTotal}
          variacionPorcentual={kpis.variacionAnual}
          icono="money"
          formato="currency"
        />
        <KPICard
          label="Cantidad de pedidos"
          value={kpis.cantidadPedidos}
          variacionPorcentual={kpis.variacionPedidos}
          icono="cart"
          formato="number"
        />
        <KPICard
          label="Ticket promedio"
          value={kpis.ticketPromedio}
          variacionPorcentual={kpis.variacionTicket}
          icono="ticket"
          formato="currency"
        />
        <KPICard
          label="Variación anual"
          value={kpis.variacionAnual}
          variacionPorcentual={0}
          icono="trend-up"
          formato="percent"
        />
      </section>

      {/* Gráfico de líneas */}
      <section
        aria-label="Tendencia de ventas"
        className="surface-card p-4 sm:p-5"
      >
        <header className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold tracking-tight text-dash-ink">
              Ventas por mes
            </h2>
            <p className="text-xs text-dash-ink-2">
              Facturación total mensual en ARS <span className="text-dash-line">·</span> {ventasRango.length}{' '}
              {ventasRango.length === 1 ? 'mes' : 'meses'}
            </p>
          </div>
          <span className="text-[11px] uppercase tracking-wider text-dash-ink-3 tabular">
            {rango.desde} <span className="text-dash-line">→</span> {rango.hasta}
          </span>
        </header>
        <GraficoLineas data={ventasRango} />
      </section>

      {/* Gráfico de barras + Tabla top productos */}
      <section
        aria-label="Top productos por ingreso"
        className="grid grid-cols-1 gap-4 lg:grid-cols-5"
      >
        <div className="surface-card p-4 sm:p-5 lg:col-span-3">
          <header className="mb-4 flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold tracking-tight text-dash-ink">
              Top {TOP_N_PRODUCTOS} productos por ingreso
            </h2>
            <p className="text-xs text-dash-ink-2">
              Ranking acumulado <span className="text-dash-line">·</span> Color por categoría
            </p>
          </header>
          <GraficoBarras data={topProductos} />
        </div>

        <div className="surface-card p-4 sm:p-5 lg:col-span-2">
          <header className="mb-4">
            <h2 className="text-sm font-semibold tracking-tight text-dash-ink">
              Detalle de productos
            </h2>
            <p className="text-xs text-dash-ink-2">
              {TOP_N_PRODUCTOS} de {TOTAL_PRODUCTOS} del catálogo
            </p>
          </header>
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-dash-ink-3">
                <tr>
                  <th scope="col" className="px-4 py-2 sm:px-5">
                    Producto
                  </th>
                  <th scope="col" className="px-2 py-2 text-right">
                    Ingreso
                  </th>
                  <th scope="col" className="px-2 py-2 text-right">
                    Uds.
                  </th>
                  <th scope="col" className="px-4 py-2 text-right sm:px-5">
                    Margen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-line text-dash-ink">
                {topProductos.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-dash-panel/50">
                    <td className="px-4 py-2 sm:px-5">
                      <div className="font-medium">{p.nombre}</div>
                      <div className="text-[10px] uppercase tracking-wider text-dash-ink-3">
                        {CATEGORIA_LABELS[p.categoria]}
                      </div>
                    </td>
                    <td className="tabular-nums whitespace-nowrap px-2 py-2 text-right text-dash-ink">
                      {formatARS(p.ingresoTotal)}
                    </td>
                    <td className="tabular-nums whitespace-nowrap px-2 py-2 text-right text-dash-ink-2">
                      {formatNumber(p.unidadesVendidas)}
                    </td>
                    <td className="tabular-nums whitespace-nowrap px-4 py-2 text-right sm:px-5">
                      <span
                        className={
                          p.margen >= 40
                            ? 'text-dash-success'
                            : p.margen >= 30
                              ? 'text-dash-ink'
                              : 'text-dash-warning'
                        }
                      >
                        {p.margen}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}