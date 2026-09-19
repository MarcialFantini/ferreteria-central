import type { CategoriaProducto } from './venta';

export type { CategoriaProducto };

export interface Producto {
  id: string;
  nombre: string;
  categoria: CategoriaProducto;
  precioUnitario: number;
  margen: number;
  unidadesVendidas: number;
  ingresoTotal: number;
}

export const CATEGORIA_LABELS: Record<CategoriaProducto, string> = {
  herramientas_manuales: 'Herramientas manuales',
  herramientas_electricas: 'Herramientas eléctricas',
  fijaciones: 'Fijaciones',
  plomeria: 'Plomería',
  electricidad: 'Electricidad',
  pintureria: 'Pinturería',
};
