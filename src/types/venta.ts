/**
 * Tipos compartidos del dominio de ventas — Ferretería Central.
 */

export type FormatStringMes = string;

export type CategoriaProducto =
  | 'herramientas_manuales'
  | 'herramientas_electricas'
  | 'fijaciones'
  | 'plomeria'
  | 'electricidad'
  | 'pintureria';

export interface VentaMensual {
  mes: FormatStringMes;
  ventasTotal: number;
  cantidadPedidos: number;
  ticketPromedio: number;
  /** Variación % vs el mes anterior (signed). */
  variacion: number;
}

export interface VentaDiaria {
  fecha: string;
  mes: FormatStringMes;
  anio: number;
  mesNum: number;
  dia: number;
  diaSemana: number;
  ventasTotal: number;
  cantidadPedidos: number;
}

export type Periodo = 'ultimos_6' | 'ultimo_anio' | 'todo' | 'personalizado';

export const PERIODO_LABELS: Record<Periodo, string> = {
  ultimos_6: 'Últimos 6 meses',
  ultimo_anio: 'Último año',
  todo: 'Todo',
  personalizado: 'Personalizado',
};

export interface RangoVentas {
  desde: FormatStringMes;
  hasta: FormatStringMes;
}

export interface KPIs {
  ventasTotal: number;
  cantidadPedidos: number;
  ticketPromedio: number;
  variacionAnual: number;
  variacionPedidos: number;
  variacionTicket: number;
}

export type TipoCliente = 'profesional' | 'obra' | 'hogar' | 'industria' | 'institucion';

export interface Cliente {
  id: string;
  nombre: string;
  tipo: TipoCliente;
  tipoLabel: string;
  color: string;
  zona: string;
  calle: string;
  telefono: string;
  email: string;
  fechaAlta: string;
  activo: boolean;
  ltvBase: number;
  pedidos: number;
  ingresoTotal: number;
  ticketPromedio: number;
  ultimaCompra: string | null;
  scoreActividad: number;
}

export interface Pedido {
  id: string;
  fecha: string;
  mes: string;
  clienteId: string;
  clienteTipo: TipoCliente;
  total: number;
  metodoPago: string;
  canal: string;
  diaSemana: string;
}

export interface CategoriaMeta {
  key: CategoriaProducto;
  label: string;
  color: string;
}

export interface Route {
  key: 'inicio' | 'ventas' | 'productos' | 'clientes' | 'tendencias';
  label: string;
  href: string;
  description: string;
  badge?: string | number;
}
