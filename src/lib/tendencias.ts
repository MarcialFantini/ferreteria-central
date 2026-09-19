/**
 * Análisis temporal — agregaciones para /tendencias.
 */

import type { VentaDiaria, VentaMensual, Pedido, Cliente } from '../types/venta';

export interface HeatmapCell {
  semana: number;     // 0..51 (semana del año)
  dia: number;        // 0..6 (lunes..domingo)
  value: number;
  count: number;
}

/**
 * Construye una matriz heatmap de 7×53 (lunes..domingo — semanas del año)
 * a partir de datos diarios. —til para ver patrones semanales/anuales.
 */
export function buildHeatmapAnual(diarias: readonly VentaDiaria[], año: number): {
  cells: HeatmapCell[];
  maxValue: number;
  totalValue: number;
  totalCount: number;
} {
  const matrix: HeatmapCell[][] = [];
  for (let s = 0; s < 53; s++) {
    matrix.push(new Array(7).fill(null).map(() => ({ semana: s, dia: 0, value: 0, count: 0 })));
  }

  let maxValue = 0;
  let totalValue = 0;
  let totalCount = 0;

  for (const d of diarias) {
    if (d.anio !== año) continue;
    const date = new Date(d.fecha + 'T12:00:00Z');
    // Lunes=0..Domingo=6
    const dow = (date.getUTCDay() + 6) % 7;
    // Calcular semana del año (ISO week approx)
    const start = new Date(date.getUTCFullYear(), 0, 1);
    const diff = (date.getTime() - start.getTime()) / (24 * 3600 * 1000);
    const semana = Math.floor((diff + start.getUTCDay()) / 7);
    if (semana < 0 || semana >= 53) continue;
    matrix[semana][dow] = {
      semana,
      dia: dow,
      value: matrix[semana][dow].value + d.ventasTotal,
      count: matrix[semana][dow].count + d.cantidadPedidos,
    };
    maxValue = Math.max(maxValue, matrix[semana][dow].value);
    totalValue += d.ventasTotal;
    totalCount += d.cantidadPedidos;
  }

  return { cells: matrix.flat(), maxValue, totalValue, totalCount };
}

export interface MesEstacionalidad {
  mesNum: number;
  mesLabel: string;
  promedioVentas: number;
  promedioPedidos: number;
  variacionVsPromedio: number;
}

const MES_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function buildEstacionalidadMensual(ventas: readonly VentaMensual[]): MesEstacionalidad[] {
  const acumulado = new Map<number, { ventas: number; pedidos: number; count: number }>();
  for (let m = 1; m <= 12; m++) acumulado.set(m, { ventas: 0, pedidos: 0, count: 0 });

  for (const v of ventas) {
    const mesNum = Number(v.mes.split('-')[1]);
    const cur = acumulado.get(mesNum)!;
    acumulado.set(mesNum, {
      ventas: cur.ventas + v.ventasTotal,
      pedidos: cur.pedidos + v.cantidadPedidos,
      count: cur.count + 1,
    });
  }

  const result: MesEstacionalidad[] = [];
  let totalPromedio = 0;
  let countMeses = 0;
  for (const [mesNum, data] of acumulado.entries()) {
    if (data.count === 0) continue;
    const promedioVentas = Math.round(data.ventas / data.count);
    const promedioPedidos = Math.round(data.pedidos / data.count);
    totalPromedio += promedioVentas;
    countMeses += 1;
    result.push({
      mesNum,
      mesLabel: MES_LABELS[mesNum - 1],
      promedioVentas,
      promedioPedidos,
      variacionVsPromedio: 0,
    });
  }

  const promedioGeneral = countMeses > 0 ? Math.round(totalPromedio / countMeses) : 0;
  for (const row of result) {
    row.variacionVsPromedio = promedioGeneral > 0
      ? Math.round(((row.promedioVentas - promedioGeneral) / promedioGeneral) * 1000) / 10
      : 0;
  }
  return result.sort((a, b) => a.mesNum - b.mesNum);
}

export interface DiaSemanaStats {
  diaNum: number;
  diaLabel: string;
  promedioVentas: number;
  promedioPedidos: number;
  ticketPromedio: number;
}

export function buildEstadisticasPorDiaSemana(diarias: readonly VentaDiaria[]): DiaSemanaStats[] {
  const acum = new Map<number, { ventas: number; pedidos: number; count: number }>();
  for (let d = 0; d < 7; d++) acum.set(d, { ventas: 0, pedidos: 0, count: 0 });
  for (const v of diarias) {
    const cur = acum.get(v.diaSemana)!;
    acum.set(v.diaSemana, {
      ventas: cur.ventas + v.ventasTotal,
      pedidos: cur.pedidos + v.cantidadPedidos,
      count: cur.count + 1,
    });
  }
  const out: DiaSemanaStats[] = [];
  for (let d = 1; d <= 7; d++) {
    const data = acum.get(d === 7 ? 0 : d)!; // lunes=1 .. domingo=0
    const diaReal = d === 7 ? 0 : d;
    const dataReal = acum.get(diaReal)!;
    out.push({
      diaNum: d,
      diaLabel: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][diaReal],
      promedioVentas: dataReal.count > 0 ? Math.round(dataReal.ventas / dataReal.count) : 0,
      promedioPedidos: dataReal.count > 0 ? Math.round(dataReal.pedidos / dataReal.count) : 0,
      ticketPromedio: dataReal.pedidos > 0 ? Math.round(dataReal.ventas / dataReal.pedidos) : 0,
    });
  }
  return out;
}

export interface WaterfallStep {
  label: string;
  value: number;       // cambio
  running: number;     // total acumulado
  tipo: 'positivo' | 'negativo' | 'neutro';
}

/**
 * Construye un waterfall: el cambio entre el primer y Último mes del rango,
 * desglosado por las contribuciones intermedias (cada mes). El primer paso
 * es el valor inicial; los siguientes son los deltas mensuales; el Úúúúúúúúúúúúltimo
 * es el valor final.
 */
export function buildWaterfallMensual(ventas: readonly VentaMensual[]): WaterfallStep[] {
  if (ventas.length < 2) return [];
  const result: WaterfallStep[] = [];
  const inicial = ventas[0].ventasTotal;
  result.push({
    label: ventas[0].mes,
    value: inicial,
    running: inicial,
    tipo: 'neutro',
  });
  let running = inicial;
  for (let i = 1; i < ventas.length; i++) {
    const delta = ventas[i].ventasTotal - ventas[i - 1].ventasTotal;
    running += delta;
    result.push({
      label: ventas[i].mes,
      value: delta,
      running,
      tipo: delta > 0 ? 'positivo' : delta < 0 ? 'negativo' : 'neutro',
    });
  }
  return result;
}

export interface ScatterPoint {
  x: number;
  y: number;
  z: number;
  label: string;
}

export function buildScatterVentasVsPedidos(diarias: readonly VentaDiaria[]): ScatterPoint[] {
  return diarias.map((d) => ({
    x: d.cantidadPedidos,
    y: d.ventasTotal / 1_000_000, // en millones
    z: d.ventasTotal,
    label: d.fecha,
  }));
}

export interface RadarAxis {
  axis: string;
  value: number;
  fullMark: number;
}

const TIPOS_PARA_RADAR: Array<{ key: string; label: string }> = [
  { key: 'profesional', label: 'Profesional' },
  { key: 'obra', label: 'Obra' },
  { key: 'hogar', label: 'Hogar' },
  { key: 'industria', label: 'Industria' },
  { key: 'institucion', label: 'Institución' },
];

export function buildRadarTipoCliente(clientes: readonly Cliente[]): RadarAxis[] {
  const maxIngreso = Math.max(...clientes.map((c) => c.ingresoTotal));
  const acum = new Map<string, number>();
  for (const t of TIPOS_PARA_RADAR) acum.set(t.key, 0);
  for (const c of clientes) acum.set(c.tipo, (acum.get(c.tipo) ?? 0) + c.ingresoTotal);
  return TIPOS_PARA_RADAR.map((t) => ({
    axis: t.label,
    value: acum.get(t.key) ?? 0,
    fullMark: maxIngreso,
  }));
}

export function buildRadarCategorias(
  ingresosPorCategoria: Array<{ categoria: string; ingreso: number }>
): RadarAxis[] {
  const max = Math.max(...ingresosPorCategoria.map((c) => c.ingreso), 1);
  return ingresosPorCategoria.map((c) => ({
    axis: c.categoria,
    value: c.ingreso,
    fullMark: max,
  }));
}
