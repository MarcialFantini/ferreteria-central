/**
 * Helpers para segmentación de clientes — /clientes.
 */

import type { Cliente, TipoCliente } from '../types/venta';

const RFM_SCORES = {
  recenciaMax: 365,
  frecuenciaMax: 50,
  monetarioMax: 5_000_000,
};

function diasEntre(fecha: string, ref: Date): number {
  const f = new Date(fecha + 'T12:00:00Z');
  return Math.max(0, Math.round((ref.getTime() - f.getTime()) / (24 * 3600 * 1000)));
}

export interface ClienteSegmentado {
  cliente: Cliente;
  recencia: number;        // días desde Última compra
  frecuencia: number;      // pedidos totales
  monetario: number;       // ingreso total
  rScore: number;          // 1..5 (5 = más reciente)
  fScore: number;          // 1..5 (5 = más frecuente)
  mScore: number;          // 1..5 (5 = más monetario)
  segmento: 'Campeones' | 'Leales' | 'Potenciales' | 'En riesgo' | 'Hibernando';
}

export function segmentarClientes(clientes: readonly Cliente[], fechaRef: Date): ClienteSegmentado[] {
  const enriched = clientes.map((c) => {
    const recencia = c.ultimaCompra ? diasEntre(c.ultimaCompra, fechaRef) : RFM_SCORES.recenciaMax;
    const frecuencia = c.pedidos;
    const monetario = c.ingresoTotal;
    return {
      cliente: c,
      recencia,
      frecuencia,
      monetario,
      rScore: scoreFromValue(recencia, 0, RFM_SCORES.recenciaMax, true),
      fScore: scoreFromValue(frecuencia, 0, RFM_SCORES.frecuenciaMax, false),
      mScore: scoreFromValue(monetario, 0, RFM_SCORES.monetarioMax, false),
      segmento: 'Potenciales' as ClienteSegmentado['segmento'],
    };
  });

// Asignar segmento según los scores R/F/M
  for (const seg of enriched) {
    if (seg.rScore >= 4 && seg.fScore >= 4) seg.segmento = 'Campeones';
    else if (seg.rScore >= 3 && seg.fScore >= 3) seg.segmento = 'Leales';
    else if (seg.rScore >= 3 && seg.mScore >= 3) seg.segmento = 'Potenciales';
    else if (seg.rScore <= 2 && seg.fScore >= 3) seg.segmento = 'En riesgo';
    else seg.segmento = 'Hibernando';
  }

  return enriched;
}

function scoreFromValue(value: number, min: number, max: number, invert: boolean): number {
  if (max === min) return 3;
  const t = (value - min) / (max - min);
  const clamped = Math.max(0, Math.min(1, t));
  const s = Math.ceil(clamped * 5);
  return invert ? 6 - s : s;
}

export interface SegmentoStats {
  segmento: ClienteSegmentado['segmento'];
  cantidad: number;
  ingresoTotal: number;
  ticketPromedio: number;
}

export const SEGMENTO_COLORS: Record<ClienteSegmentado['segmento'], string> = {
  'Campeones': '#10B981',     // emerald
  'Leales':    '#3B82F6',     // blue
  'Potenciales': '#F59E0B',   // amber
  'En riesgo': '#EF4444',     // red
  'Hibernando':'#94A3B8',     // slate
};

export function statsPorSegmento(seg: readonly ClienteSegmentado[]): SegmentoStats[] {
  const map = new Map<string, { cant: number; ingreso: number; pedidos: number }>();
  for (const s of seg) {
    const cur = map.get(s.segmento) ?? { cant: 0, ingreso: 0, pedidos: 0 };
    map.set(s.segmento, {
      cant: cur.cant + 1,
      ingreso: cur.ingreso + s.monetario,
      pedidos: cur.pedidos + s.frecuencia,
    });
  }
  return Array.from(map.entries())
    .map(([segmento, data]) => ({
      segmento: segmento as ClienteSegmentado['segmento'],
      cantidad: data.cant,
      ingresoTotal: data.ingreso,
      ticketPromedio: data.pedidos > 0 ? Math.round(data.ingreso / data.pedidos) : 0,
    }))
    .sort((a, b) => b.ingresoTotal - a.ingresoTotal);
}

export interface TipoStats {
  tipo: TipoCliente;
  tipoLabel: string;
  color: string;
  cantidad: number;
  ingresoTotal: number;
  ticketPromedio: number;
}

export function statsPorTipo(clientes: readonly Cliente[]): TipoStats[] {
  const map = new Map<string, { cant: number; ingreso: number; pedidos: number; label: string; color: string }>();
  for (const c of clientes) {
    const cur = map.get(c.tipo) ?? { cant: 0, ingreso: 0, pedidos: 0, label: c.tipoLabel, color: c.color };
    map.set(c.tipo, {
      cant: cur.cant + 1,
      ingreso: cur.ingreso + c.ingresoTotal,
      pedidos: cur.pedidos + c.pedidos,
      label: cur.label,
      color: cur.color,
    });
  }
  return Array.from(map.entries())
    .map(([tipo, data]) => ({
      tipo: tipo as TipoCliente,
      tipoLabel: data.label,
      color: data.color,
      cantidad: data.cant,
      ingresoTotal: data.ingreso,
      ticketPromedio: data.pedidos > 0 ? Math.round(data.ingreso / data.pedidos) : 0,
    }))
    .sort((a, b) => b.ingresoTotal - a.ingresoTotal);
}
