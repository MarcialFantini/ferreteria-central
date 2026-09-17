import ventasData from '../data/ventas.json';
import productosData from '../data/productos.json';
import type {
  Periodo,
  VentaMensual,
  KPIs,
  RangoVentas,
} from '../types/venta';
import type { Producto } from '../types/producto';

/**
 * Capa de acceso a datos del dashboard.
 *
 * Los JSON son cargados estáticamente por Astro en build-time y se importan
 * aquí como arrays literales. Esto evita fetch / filesystem en runtime
 * (el dashboard es 100% SSG) y garantiza que `getVentasPorPeriodo` y
 * `getKPIs` operen sobre el mismo dataset en memoria.
 */

const VENTAS: readonly VentaMensual[] = ventasData as VentaMensual[];
const PRODUCTOS: readonly Producto[] = productosData as Producto[];

/** Cantidad total de meses en el dataset. */
export const TOTAL_MESES: number = VENTAS.length;

/** Primer mes del dataset, "YYYY-MM". */
export const PRIMER_MES: string = VENTAS[0]?.mes ?? '';

/** Último mes del dataset, "YYYY-MM". */
export const ULTIMO_MES: string = VENTAS[TOTAL_MESES - 1]?.mes ?? '';

/** Cantidad total de productos en el catálogo. */
export const TOTAL_PRODUCTOS: number = PRODUCTOS.length;

/**
 * Resuelve un período del UI al rango concreto (desde/hasta) sobre el dataset.
 *
 * @param periodo - Período seleccionado por el usuario.
 * @returns El rango (inclusive) que el UI debe mostrar.
 */
export function getPeriodRange(periodo: Periodo): RangoVentas {
  if (TOTAL_MESES === 0) {
    return { desde: '', hasta: '' };
  }
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
  }
}

/**
 * Devuelve las filas de ventas cuyo `mes` cae entre `desde` y `hasta`
 * (ambos inclusive). Mantiene el orden cronológico original.
 *
 * @param desde - Mes inicial en formato "YYYY-MM".
 * @param hasta - Mes final en formato "YYYY-MM".
 */
export function getVentasPorPeriodo(desde: string, hasta: string): VentaMensual[] {
  return VENTAS.filter((v) => v.mes >= desde && v.mes <= hasta);
}

/**
 * Devuelve los N productos con mayor `ingresoTotal`, ordenados de mayor a menor.
 *
 * @param n - Cantidad máxima de elementos en el resultado.
 */
export function getTopProductos(n: number): Producto[] {
  return [...PRODUCTOS]
    .sort((a, b) => b.ingresoTotal - a.ingresoTotal)
    .slice(0, n);
}

/**
 * Una fila de la agregación de ingresos por categoría.
 * Sirve para el GraficoCategorias (donut) y para la leyenda.
 */
export interface IngresoPorCategoria {
  categoria: import('../types/producto').CategoriaProducto;
  ingreso: number;
  unidades: number;
  participacion: number;
}

/**
 * Agrupa los productos del catálogo por categoría y devuelve el ingreso,
 * las unidades vendidas y la participación porcentual sobre el total.
 *
 * La participación se calcula sobre el ingreso total (no sobre las unidades)
 * porque para una ferretería el ingreso es el indicador de mix relevante.
 */
export function getIngresoPorCategoria(): IngresoPorCategoria[] {
  const totalIngreso = PRODUCTOS.reduce((acc, p) => acc + p.ingresoTotal, 0);
  const porCategoria = new Map<import('../types/producto').CategoriaProducto, { ingreso: number; unidades: number }>();
  for (const p of PRODUCTOS) {
    const current = porCategoria.get(p.categoria) ?? { ingreso: 0, unidades: 0 };
    porCategoria.set(p.categoria, {
      ingreso: current.ingreso + p.ingresoTotal,
      unidades: current.unidades + p.unidadesVendidas,
    });
  }
  return Array.from(porCategoria.entries())
    .map(([categoria, { ingreso, unidades }]) => ({
      categoria,
      ingreso,
      unidades,
      participacion: totalIngreso > 0 ? (ingreso / totalIngreso) * 100 : 0,
    }))
    .sort((a, b) => b.ingreso - a.ingreso);
}

/**
 * Calcula el margen promedio ponderado por ingreso del catálogo entero.
 *
 * El promedio simple de los márgenes por producto penaliza productos de
 * alto volumen con margen bajo. La ponderación por ingreso refleja cuánto
 * pesa cada producto en la facturación total.
 */
export function getMargenPromedioPonderado(): number {
  const totalIngreso = PRODUCTOS.reduce((acc, p) => acc + p.ingresoTotal, 0);
  if (totalIngreso === 0) return 0;
  const aporte = PRODUCTOS.reduce(
    (acc, p) => acc + (p.margen * p.ingresoTotal) / 100,
    0,
  );
  return Math.round((aporte / totalIngreso) * 10) / 10;
}

/**
 * Suma de unidades vendidas en el catálogo.
 */
export function getTotalUnidadesVendidas(): number {
  return PRODUCTOS.reduce((acc, p) => acc + p.unidadesVendidas, 0);
}

/**
 * Calcula los KPIs agregados para el período solicitado.
 *
 * `ventasTotal` se calcula como la suma de los puntos que devolvería
 * `getVentasPorPeriodo(desde, hasta)` sobre el mismo rango, para que el
 * KPI coincida con la suma del LineChart (T10.16 — consistencia de datos).
 *
 * `variacionAnual` se calcula como la variación porcentual (signed) entre
 * el primer y el último mes del rango, redondeada a una décima.
 * Cuando hay menos de 2 meses en el rango, devuelve 0.
 *
 * @param periodo - Período seleccionado por el usuario.
 */
export function getKPIs(periodo: Periodo): KPIs {
  const { desde, hasta } = getPeriodRange(periodo);
  const filas = getVentasPorPeriodo(desde, hasta);

  const ventasTotal = filas.reduce((acc, v) => acc + v.ventasTotal, 0);
  const cantidadPedidos = filas.reduce((acc, v) => acc + v.cantidadPedidos, 0);
  const ticketPromedio =
    cantidadPedidos > 0 ? Math.round(ventasTotal / cantidadPedidos) : 0;

  let variacionAnual = 0;
  let variacionPedidos = 0;
  let variacionTicket = 0;
  if (filas.length >= 2) {
    const firstVentas = filas[0].ventasTotal;
    const lastVentas = filas[filas.length - 1].ventasTotal;
    if (firstVentas > 0) {
      variacionAnual = Math.round(((lastVentas - firstVentas) / firstVentas) * 1000) / 10;
    }

    const firstPedidos = filas[0].cantidadPedidos;
    const lastPedidos = filas[filas.length - 1].cantidadPedidos;
    if (firstPedidos > 0) {
      variacionPedidos = Math.round(((lastPedidos - firstPedidos) / firstPedidos) * 1000) / 10;
    }

    const firstTicket = filas[0].ticketPromedio;
    const lastTicket = filas[filas.length - 1].ticketPromedio;
    if (firstTicket > 0) {
      variacionTicket = Math.round(((lastTicket - firstTicket) / firstTicket) * 1000) / 10;
    }
  }

  return {
    ventasTotal,
    cantidadPedidos,
    ticketPromedio,
    variacionAnual,
    variacionPedidos,
    variacionTicket,
  };
}

/**
 * Helpers de formato. Se exponen aquí para evitar importar una utilidad
 * de formato desde cada componente.
 */

/** Formatea un número como moneda ARS (es-AR), sin decimales. */
export function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Formatea un número con separador de miles (es-AR). */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-AR').format(value);
}

/** Formatea una variación porcentual signed como "+12.3%" / "0.0%" / "-5.4%". */
export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/** Convierte "2025-01" en "Ene 2025" usando la locale es-AR. */
export function formatMesCorto(mes: string): string {
  const [y, m] = mes.split('-');
  if (!y || !m) return mes;
  const date = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat('es-AR', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}