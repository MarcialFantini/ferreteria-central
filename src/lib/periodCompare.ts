/**
 * Helpers para comparación de períodos.
 *
 * Un "período A" (e.g. los Últimos 6 meses) se compara con un
 * "período B" (e.g. los 6 meses previos, del mismo largo).
 * Las funciones devuelven valores signed que se renderizan con flechas ▲▼.
 */

import type { Periodo, RangoVentas } from '../types/venta';
import { getPeriodRange, getVentasPorPeriodo } from './datos';

export interface PeriodComparison {
  /** Etiqueta humana del período actual. */
  labelActual: string;
  /** Etiqueta humana del período previo. */
  labelPrevio: string;
  ventasActual: number;
  ventasPrevio: number;
  pedidosActual: number;
  pedidosPrevio: number;
  ticketActual: number;
  ticketPrevio: number;
  /** Variación % ventas actual vs previo (signed). */
  deltaVentas: number;
  /** Variación % pedidos actual vs previo (signed). */
  deltaPedidos: number;
  /** Variación % ticket actual vs previo (signed). */
  deltaTicket: number;
}

/**
 * Calcula el "período previo" del mismo largo que el actual, inmediatamente
 * anterior. Para 6 meses (jul-dic 2025), el previo es (ene-jun 2025).
 *
 * Si el período actual arranca al inicio del dataset (no hay datos previos),
 * el previo devuelve ceros para que los deltas salgan 0%.
 */
export function getPeriodoPrevio(rango: RangoVentas, mesesLargo: number): RangoVentas {
  // Calcular desplazando el rango hacia atrás por `mesesLargo` meses
  const [y1, m1] = rango.desde.split('-').map(Number);
  const [y2, m2] = rango.hasta.split('-').map(Number);
  if (!y1 || !m1 || !y2 || !m2) return { desde: '', hasta: '' };

  // desdePrevio = primer día del mes (y1, m1 - mesesLargo)
  const desdeDate = new Date(y1, m1 - 1 - mesesLargo, 1);
  // hastaPrevio = Último día del mes anterior a (y1, m1)
  const hastaDate = new Date(y1, m1 - 1, 0);

  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return { desde: fmt(desdeDate), hasta: fmt(hastaDate) };
}

/**
 * Construye la comparación completa entre el período activo y su previo.
 */
export function buildComparison(
  periodo: Periodo,
  customRange: RangoVentas,
): PeriodComparison {
  const rangoActual = getPeriodRange(periodo, customRange);
  const filasActual = getVentasPorPeriodo(rangoActual.desde, rangoActual.hasta);

  // Largo del período en meses (mínimo 1)
  const mesesLargo = Math.max(1, filasActual.length);

  const rangoPrevio = getPeriodoPrevio(rangoActual, mesesLargo);
  const filasPrevio = getVentasPorPeriodo(rangoPrevio.desde, rangoPrevio.hasta);

  const ventasActual = filasActual.reduce((acc, v) => acc + v.ventasTotal, 0);
  const ventasPrevio = filasPrevio.reduce((acc, v) => acc + v.ventasTotal, 0);
  const pedidosActual = filasActual.reduce((acc, v) => acc + v.cantidadPedidos, 0);
  const pedidosPrevio = filasPrevio.reduce((acc, v) => acc + v.cantidadPedidos, 0);
  const ticketActual = pedidosActual > 0 ? Math.round(ventasActual / pedidosActual) : 0;
  const ticketPrevio = pedidosPrevio > 0 ? Math.round(ventasPrevio / pedidosPrevio) : 0;

  const pct = (a: number, b: number) =>
    b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : 0;

  return {
labelActual: `${rangoActual.desde} — ${rangoActual.hasta}`,
    labelPrevio: `${rangoPrevio.desde} — ${rangoPrevio.hasta}`,
    ventasActual,
    ventasPrevio,
    pedidosActual,
    pedidosPrevio,
    ticketActual,
    ticketPrevio,
    deltaVentas: pct(ventasActual, ventasPrevio),
    deltaPedidos: pct(pedidosActual, pedidosPrevio),
    deltaTicket: pct(ticketActual, ticketPrevio),
  };
}
