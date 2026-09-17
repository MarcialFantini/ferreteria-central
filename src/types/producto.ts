import type { CategoriaProducto } from './venta';

// Re-export para que los componentes puedan importar CategoriaProducto
// desde producto.ts sin tener que conocer la jerarquía de tipos.
export type { CategoriaProducto };

/** Una fila del catálogo de productos vendidos. */
export interface Producto {
  /** Identificador único, ej. "P-001". */
  id: string;
  /** Nombre legible por humanos. */
  nombre: string;
  /** Categoría del producto. */
  categoria: CategoriaProducto;
  /** Unidades vendidas acumuladas en el período (12 meses). */
  unidadesVendidas: number;
  /** Ingreso total acumulado en ARS (pesos argentinos, sin decimales). */
  ingresoTotal: number;
  /** Margen promedio, en porcentaje entero (ej. 35 = 35%). */
  margen: number;
}

/** Etiqueta humana de cada categoría. */
export const CATEGORIA_LABELS: Record<CategoriaProducto, string> = {
  herramientas_manuales: 'Herramientas manuales',
  herramientas_electricas: 'Herramientas eléctricas',
  fijaciones: 'Fijaciones',
  plomeria: 'Plomería',
  electricidad: 'Electricidad',
  pintureria: 'Pinturería',
};