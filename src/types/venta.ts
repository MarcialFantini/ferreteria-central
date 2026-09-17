/**
 * Tipos compartidos para el dominio de ventas.
 *
 * Los datos se cargan desde src/data/ventas.json y se filtran/agreguen
 * en src/lib/datos.ts antes de llegar al Dashboard.
 */

/** Mes en formato ISO abreviado, ej. "2025-01". */
export type FormatStringMes = string;

/** Categoría de un producto del catálogo. */
export type CategoriaProducto =
  | 'herramientas_manuales'
  | 'herramientas_electricas'
  | 'fijaciones'
  | 'plomeria'
  | 'electricidad'
  | 'pintureria';

/** Una fila del dataset mensual de ventas. */
export interface VentaMensual {
  /** Mes en formato "YYYY-MM". */
  mes: FormatStringMes;
  /** Facturación total del mes en ARS (pesos argentinos, sin decimales). */
  ventasTotal: number;
  /** Cantidad de pedidos cerrados en el mes. */
  cantidadPedidos: number;
  /** ticketPromedio = round(ventasTotal / cantidadPedidos). */
  ticketPromedio: number;
  /** Variación porcentual (signed) vs el mes anterior.
   *  Positivo = crecimiento, negativo = caída, 0 = sin cambio (o sin mes previo). */
  variacion: number;
}

/** Períodos disponibles para el selector. */
export type Periodo = 'ultimos_6' | 'ultimo_anio' | 'todo' | 'personalizado';

/** Etiqueta humana de cada período. */
export const PERIODO_LABELS: Record<Periodo, string> = {
  ultimos_6: 'Últimos 6 meses',
  ultimo_anio: 'Último año',
  todo: 'Todo',
  personalizado: 'Personalizado',
};

/** Rango temporal concreto, devuelto por getVentasPorPeriodo. */
export interface RangoVentas {
  /** Mes inicial inclusive, formato "YYYY-MM". */
  desde: FormatStringMes;
  /** Mes final inclusive, formato "YYYY-MM". */
  hasta: FormatStringMes;
}

/** KPIs agregados del dashboard. */
export interface KPIs {
  /** Suma de ventasTotal en el rango. Coincide con la suma de puntos del LineChart. */
  ventasTotal: number;
  /** Suma de pedidos en el rango. */
  cantidadPedidos: number;
  /** ventasTotal / cantidadPedidos, redondeado. */
  ticketPromedio: number;
  /** Variación porcentual (signed) entre el último mes y el primer mes del rango.
   *  0 cuando el rango tiene un único mes o no hay datos. */
  variacionAnual: number;
  /** Variación porcentual (signed) de `cantidadPedidos` extremo a extremo. */
  variacionPedidos: number;
  /** Variación porcentual (signed) de `ticketPromedio` extremo a extremo. */
  variacionTicket: number;
}