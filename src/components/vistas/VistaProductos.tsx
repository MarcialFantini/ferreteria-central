import { useMemo } from 'react';
import {
  formatARS, formatNumber, formatPercent,
  PRODUCTOS, getIngresoPorCategoria, colorDeCategoria, CATEGORIA_LABELS,
  getTopProductos,
} from '../../lib/datos';
import ChartCard from '../ChartCard';
import KPICard from '../KPICard';
import DataTable, { type DataTableColumn } from '../DataTable';
import GraficoBarras from '../charts/GraficoBarras';
import GraficoCategorias from '../charts/GraficoCategorias';

export default function VistaProductos() {
  const data = useMemo(() => {
    const productos = [...PRODUCTOS];
    const ingresoPorCategoria = getIngresoPorCategoria();
    const totalIngreso = productos.reduce((acc, p) => acc + p.ingresoTotal, 0);
    const totalUnidades = productos.reduce((acc, p) => acc + p.unidadesVendidas, 0);
    const top10 = getTopProductos(10);
    const topCategoria = ingresoPorCategoria[0];
    const topProducto = productos[0];
    return { productos, ingresoPorCategoria, totalIngreso, totalUnidades, top10, topCategoria, topProducto };
  }, []);

  const { productos, ingresoPorCategoria, totalIngreso, totalUnidades, top10, topCategoria, topProducto } = data;

  const columns: ReadonlyArray<DataTableColumn<typeof productos[number]>> = [
    {
      key: 'id', label: 'SKU', sortable: true, accessor: (r) => r.id, width: '90px',
      render: (r) => <span className="font-mono text-[11px] text-dash-accent">{r.id}</span>,
    },
    {
      key: 'nombre', label: 'Producto', sortable: true, accessor: (r) => r.nombre,
    },
    {
      key: 'categoria', label: 'Categoría', sortable: true, accessor: (r) => r.categoria,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-[12px]">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: colorDeCategoria(r.categoria) }} aria-hidden="true" />
          {CATEGORIA_LABELS[r.categoria]}
        </span>
      ),
    },
    {
      key: 'precioUnitario', label: 'Precio unit.', sortable: true, align: 'right', accessor: (r) => r.precioUnitario,
      render: (r) => formatARS(r.precioUnitario),
    },
    {
      key: 'unidadesVendidas', label: 'Unidades', sortable: true, align: 'right', accessor: (r) => r.unidadesVendidas,
      render: (r) => <span className="text-dash-ink">{formatNumber(r.unidadesVendidas)}</span>,
    },
    {
      key: 'ingresoTotal', label: 'Ingreso total', sortable: true, align: 'right', accessor: (r) => r.ingresoTotal,
      render: (r) => <span className="font-semibold text-dash-ink">{formatARS(r.ingresoTotal)}</span>,
    },
    {
      key: 'margen', label: 'Margen', sortable: true, align: 'right', accessor: (r) => r.margen,
      render: (r) => (
        <span className={r.margen >= 40 ? 'text-dash-success' : r.margen < 30 ? 'text-dash-warning' : 'text-dash-ink-2'}>
          {r.margen}%
        </span>
      ),
    },
    {
      key: 'participacion', label: '% del total', sortable: true, align: 'right', accessor: (r) => r.ingresoTotal / totalIngreso * 100,
      render: (r) => formatPercent(r.ingresoTotal / totalIngreso * 100, { signed: false }),
    },
  ];

  const filters = [
    {
      key: 'categoria',
      label: 'Categoría',
      options: Object.entries(CATEGORIA_LABELS).map(([k, v]) => ({ value: k, label: v })),
    },
  ];

  return (
    <>
      <section aria-label="Indicadores de catálogo" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <KPICard label="SKUs en catálogo" value={productos.length} variacionPorcentual={0} icono="box" formato="number" accent="#3B82F6" />
        <KPICard label="Ingreso acumulado 8 años" value={totalIngreso} variacionPorcentual={0} icono="money" formato="currency" accent="#10B981" />
        <KPICard label="Unidades vendidas" value={totalUnidades} variacionPorcentual={0} icono="package" formato="number" accent="#F59E0B" />
        <KPICard
          label="Categoría líder"
          value={topCategoria ? formatPercent(topCategoria.participacion, { signed: false }) : '—'}
          variacionPorcentual={0}
          icono="tag"
          formato="percent"
          accent={topCategoria ? colorDeCategoria(topCategoria.categoria) : '#94A3B8'}
        />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:mt-5 lg:grid-cols-3">
        <ChartCard
          title="Top 10 por ingreso"
          subtitle={`Líder: ${topProducto.nombre} con ${formatARS(topProducto.ingresoTotal)}`}
          className="lg:col-span-2"
        >
          <GraficoBarras data={top10} />
        </ChartCard>

        <ChartCard title="Mix por categoría" subtitle="Ingreso acumulado por línea de producto">
          <GraficoCategorias data={ingresoPorCategoria} />
        </ChartCard>
      </section>

      <section className="mt-4 lg:mt-5">
        <ChartCard
          title="Catálogo completo"
          subtitle={`${productos.length} productos — ordenados por ingreso, unidades o margen`}
          padding="tight"
        >
          <DataTable
            rows={productos}
            columns={columns}
            filters={filters}
            searchPlaceholder="Buscar por nombre, SKU o categoría..."
            pageSize={15}
            filename="catalogo-productos"
            emptyMessage="Sin productos para los filtros aplicados."
          />
        </ChartCard>
      </section>
    </>
  );
}
