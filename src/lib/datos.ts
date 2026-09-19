import ventasData from '../data/ventas.json';
import ventasDiariasData from '../data/ventas-diarias.json';
import pedidosData from '../data/pedidos.json';
import productosData from '../data/productos.json';
import clientesData from '../data/clientes.json';
import categoriasData from '../data/categorias.json';

import type {
  Periodo,
  VentaMensual,
  VentaDiaria,
  KPIs,
  RangoVentas,
  Cliente,
  Pedido,
  CategoriaMeta,
} from '../types/venta';
import type { Producto, CategoriaProducto } from '../types/producto';

export const VENTAS: readonly VentaMensual[] = ventasData as VentaMensual[];
export const VENTAS_DIARIAS: readonly VentaDiaria[] = ventasDiariasData as VentaDiaria[];
export const PEDIDOS: readonly Pedido[] = pedidosData as Pedido[];
export const PRODUCTOS: readonly Producto[] = productosData as Producto[];
export const CLIENTES: readonly Cliente[] = clientesData as Cliente[];
export const CATEGORIAS: readonly CategoriaMeta[] = categoriasData as CategoriaMeta[];

export const TOTAL_MESES = VENTAS.length;
export const PRIMER_MES = VENTAS[0]?.mes ?? '';
export const ULTIMO_MES = VENTAS[TOTAL_MESES - 1]?.mes ?? '';
export const TOTAL_PRODUCTOS = PRODUCTOS.length;
export const TOTAL_PEDIDOS = PEDIDOS.length;
export const TOTAL_CLIENTES = CLIENTES.length;

const CATEGORIA_COLOR_MAP: Record<CategoriaProducto, string> = CATEGORIAS.reduce(
  (acc, c) => ({ ...acc, [c.key]: c.color }),
  {} as Record<CategoriaProducto, string>,
);

export function colorDeCategoria(c: CategoriaProducto): string {
  return CATEGORIA_COLOR_MAP[c] ?? '#94A3B8';
}

export const CATEGORIA_LABELS: Record<CategoriaProducto, string> = CATEGORIAS.reduce(
  (acc, c) => ({ ...acc, [c.key]: c.label }),
  {} as Record<CategoriaProducto, string>,
);

export function getPeriodRange(periodo: Periodo, customRange?: RangoVentas): RangoVentas {
  if (TOTAL_MESES === 0) return { desde: '', hasta: '' };
  switch (periodo) {
    case 'ultimos_6': {
      const idx = Math.max(0, TOTAL_MESES - 6);
      return { desde: VENTAS[idx].mes, hasta: ULTIMO_MES };
    }
    case 'ultimo_anio': {
      const idx = Math.max(0, TOTAL_MESES - 12);
      return { desde: VENTAS[idx].mes, hasta: ULTIMO_MES };
    }
    case 'todo': {
      return { desde: PRIMER_MES, hasta: ULTIMO_MES };
    }
    case 'personalizado': {
      const desde = customRange?.desde || PRIMER_MES;
      const hasta = customRange?.hasta || ULTIMO_MES;
      if (desde > hasta) return { desde: PRIMER_MES, hasta: ULTIMO_MES };
      return { desde, hasta };
    }
  }
}

export function getVentasPorPeriodo(desde: string, hasta: string): VentaMensual[] {
  return VENTAS.filter((v) => v.mes >= desde && v.mes <= hasta);
}

export function getVentasDiariasPorPeriodo(desde: string, hasta: string): VentaDiaria[] {
  return VENTAS_DIARIAS.filter((v) => v.mes >= desde && v.mes <= hasta);
}

export function getKPIs(periodo: Periodo, customRange?: RangoVentas): KPIs {
  const { desde, hasta } = getPeriodRange(periodo, customRange);
  const filas = getVentasPorPeriodo(desde, hasta);

  const ventasTotal = filas.reduce((acc, v) => acc + v.ventasTotal, 0);
  const cantidadPedidos = filas.reduce((acc, v) => acc + v.cantidadPedidos, 0);
  const ticketPromedio = cantidadPedidos > 0 ? Math.round(ventasTotal / cantidadPedidos) : 0;

  let variacionAnual = 0, variacionPedidos = 0, variacionTicket = 0;
  if (filas.length >= 2) {
    const a = filas[0], b = filas[filas.length - 1];
    if (a.ventasTotal > 0) variacionAnual = Math.round(((b.ventasTotal - a.ventasTotal) / a.ventasTotal) * 1000) / 10;
    if (a.cantidadPedidos > 0) variacionPedidos = Math.round(((b.cantidadPedidos - a.cantidadPedidos) / a.cantidadPedidos) * 1000) / 10;
    if (a.ticketPromedio > 0) variacionTicket = Math.round(((b.ticketPromedio - a.ticketPromedio) / a.ticketPromedio) * 1000) / 10;
  }

  return { ventasTotal, cantidadPedidos, ticketPromedio, variacionAnual, variacionPedidos, variacionTicket };
}

export interface IngresoPorCategoria {
  categoria: CategoriaProducto;
  ingreso: number;
  unidades: number;
  participacion: number;
  margen: number;
}

export function getIngresoPorCategoria(): IngresoPorCategoria[] {
  const totalIngreso = PRODUCTOS.reduce((acc, p) => acc + p.ingresoTotal, 0);
  const map = new Map<CategoriaProducto, { ingreso: number; unidades: number; margenAcum: number; peso: number }>();
  for (const p of PRODUCTOS) {
    const cur = map.get(p.categoria) ?? { ingreso: 0, unidades: 0, margenAcum: 0, peso: 0 };
    map.set(p.categoria, {
      ingreso: cur.ingreso + p.ingresoTotal,
      unidades: cur.unidades + p.unidadesVendidas,
      margenAcum: cur.margenAcum + p.margen * p.ingresoTotal,
      peso: cur.peso + p.ingresoTotal,
    });
  }
  return Array.from(map.entries())
    .map(([categoria, { ingreso, unidades, margenAcum, peso }]) => ({
      categoria,
      ingreso,
      unidades,
      participacion: totalIngreso > 0 ? (ingreso / totalIngreso) * 100 : 0,
      margen: peso > 0 ? Math.round(margenAcum / peso) : 0,
    }))
    .sort((a, b) => b.ingreso - a.ingreso);
}

export function getTopProductos(n: number): Producto[] {
  return [...PRODUCTOS].sort((a, b) => b.ingresoTotal - a.ingresoTotal).slice(0, n);
}

export function getTotalUnidadesVendidas(): number {
  return PRODUCTOS.reduce((acc, p) => acc + p.unidadesVendidas, 0);
}

export function getMargenPromedioPonderado(): number {
  const totalIngreso = PRODUCTOS.reduce((acc, p) => acc + p.ingresoTotal, 0);
  if (totalIngreso === 0) return 0;
  const margenAcum = PRODUCTOS.reduce((acc, p) => acc + p.margen * p.ingresoTotal, 0);
  return Math.round((margenAcum / totalIngreso) * 10) / 10;
}

export function getDiasInventarioPromedio(totalUnidades: number, diasEnPeriodo: number, factorCobertura = 30): number {
  if (diasEnPeriodo <= 0) return 0;
  return Math.round((totalUnidades / diasEnPeriodo) * factorCobertura);
}

export function getTopCategoriaPorIngreso(): IngresoPorCategoria | null {
  const rows = getIngresoPorCategoria();
  return rows.length > 0 ? rows[0] : null;
}

export function getProductoMasVendido(): Producto | null {
  let top: Producto | null = null;
  for (const p of PRODUCTOS) {
    if (!top || p.unidadesVendidas > top.unidadesVendidas) top = p;
  }
  return top;
}

// ---------- Helpers de formato ----------

export function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-AR').format(value);
}

export function formatPercent(value: number, opts?: { signed?: boolean }): string {
  const sign = opts?.signed === false ? '' : value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatARSCompact(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export function formatMesCorto(mes: string): string {
  const [y, m] = mes.split('-');
  if (!y || !m) return mes;
  const date = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat('es-AR', { month: 'short', year: 'numeric' }).format(date);
}

export function formatFechaCorta(fecha: string): string {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(fecha));
}

export function formatFechaLarga(fecha: string): string {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(fecha));
}

export function formatDiaSemana(diaSemana: number): string {
  return ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][diaSemana] ?? '';
}

export function formatMesLargo(mes: string): string {
  const [y, m] = mes.split('-');
  if (!y || !m) return mes;
  const date = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(date);
}
