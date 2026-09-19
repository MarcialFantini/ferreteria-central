#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * DatosPyme � Deterministic sales mock generator (Ferreter�a Central).
 *
 * Produce:
 *   src/data/ventas.json              � 96 meses (8 a�os) agregados por mes
 *   src/data/ventas-diarias.json      � �ltimos 24 meses de ventas diarias
 *                                       (para heatmap y an�lisis temporal)
 *   src/data/pedidos.json             � ~3000+ pedidos individuales
 *   src/data/productos.json           � 32 productos en 6 categor�as
 *   src/data/clientes.json            � segmentaci�n de clientes
 *   src/data/categorias.json          � definici�n de categor�as + paleta
 *
 * Mismo seed ? mismos n�meros en cada build.
 *
 * Run: node scripts/generate-data.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- PRNG determin�stico (Mulberry32) ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20180101);
const gauss = () => {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ---------- Cat�logo de productos (32 SKUs) ----------
const PRODUCTOS = [
  // Herramientas manuales
  { id: 'P-001', nombre: 'Martillo galponero 25cm',         categoria: 'herramientas_manuales',  precio: 7000,    margen: 35, popularidad: 0.85 },
  { id: 'P-002', nombre: 'Destornillador Phillips PH2 x3',   categoria: 'herramientas_manuales',  precio: 1400,    margen: 45, popularidad: 0.92 },
  { id: 'P-003', nombre: 'Llave francesa 12"',               categoria: 'herramientas_manuales',  precio: 6000,    margen: 38, popularidad: 0.78 },
  { id: 'P-004', nombre: 'Alicate diagonal 6"',              categoria: 'herramientas_manuales',  precio: 3600,    margen: 42, popularidad: 0.80 },
  { id: 'P-005', nombre: 'Set llaves combinadas x12',        categoria: 'herramientas_manuales',  precio: 18500,   margen: 33, popularidad: 0.72 },
  { id: 'P-006', nombre: 'Cinta m�trica 5m',                 categoria: 'herramientas_manuales',  precio: 2400,    margen: 50, popularidad: 0.88 },

  // Herramientas el�ctricas
  { id: 'P-007', nombre: 'Taladro percutor 1/2" 600W',       categoria: 'herramientas_electricas', precio: 40000, margen: 25, popularidad: 0.65 },
  { id: 'P-008', nombre: 'Lijadora orbital 320W',            categoria: 'herramientas_electricas', precio: 32000, margen: 28, popularidad: 0.55 },
  { id: 'P-009', nombre: 'Sierra caladora 500W',             categoria: 'herramientas_electricas', precio: 36000, margen: 26, popularidad: 0.50 },
  { id: 'P-010', nombre: 'Amoladora angular 7"',             categoria: 'herramientas_electricas', precio: 48000, margen: 24, popularidad: 0.58 },
  { id: 'P-011', nombre: 'Soldador inverter 200A',           categoria: 'herramientas_electricas', precio: 85000, margen: 22, popularidad: 0.40 },

  // Fijaciones
  { id: 'P-012', nombre: 'Caja tornillos autoperforantes x200', categoria: 'fijaciones',          precio: 800,  margen: 48, popularidad: 0.95 },
  { id: 'P-013', nombre: 'Caja clavos 2" x1kg',                 categoria: 'fijaciones',          precio: 600,  margen: 50, popularidad: 0.96 },
  { id: 'P-014', nombre: 'Bulones 1/4" x10',                    categoria: 'fijaciones',          precio: 1200, margen: 45, popularidad: 0.82 },
  { id: 'P-015', nombre: 'Tarugos pl�sticos x50',               categoria: 'fijaciones',          precio: 500,  margen: 52, popularidad: 0.90 },
  { id: 'P-016', nombre: 'Tuercas y arandelas surtidas x100',   categoria: 'fijaciones',          precio: 1800, margen: 47, popularidad: 0.75 },

  // Plomer�a
  { id: 'P-017', nombre: 'Canilla monocomando cocina',       categoria: 'plomeria',             precio: 30000,  margen: 30, popularidad: 0.60 },
  { id: 'P-018', nombre: 'Ca�o PVC 110mm x4m',               categoria: 'plomeria',             precio: 10000,  margen: 32, popularidad: 0.65 },
  { id: 'P-019', nombre: 'Sellador siliconas transparente',  categoria: 'plomeria',             precio: 4000,   margen: 40, popularidad: 0.78 },
  { id: 'P-020', nombre: 'Pipa flexible 40cm',               categoria: 'plomeria',             precio: 8500,   margen: 35, popularidad: 0.55 },
  { id: 'P-021', nombre: 'Llave de paso 1/2"',               categoria: 'plomeria',             precio: 5500,   margen: 38, popularidad: 0.62 },

  // Electricidad
  { id: 'P-022', nombre: 'Cable unipolar 2.5mm x100m',       categoria: 'electricidad',         precio: 12000,  margen: 35, popularidad: 0.72 },
  { id: 'P-023', nombre: 'Llave de luz armada',              categoria: 'electricidad',         precio: 2000,   margen: 44, popularidad: 0.85 },
  { id: 'P-024', nombre: 'Ficha macho 10A',                  categoria: 'electricidad',         precio: 1100,   margen: 46, popularidad: 0.88 },
  { id: 'P-025', nombre: 'T�rmica bipolar 25A',              categoria: 'electricidad',         precio: 6800,   margen: 36, popularidad: 0.58 },
  { id: 'P-026', nombre: 'Ca�o corrugado 3/4" x10m',         categoria: 'electricidad',         precio: 3200,   margen: 42, popularidad: 0.65 },

  // Pinturer�a
  { id: 'P-027', nombre: 'Pintura l�tex interior 20L',       categoria: 'pintureria',           precio: 45000,  margen: 28, popularidad: 0.75 },
  { id: 'P-028', nombre: 'Pincel cerda natural 2"',          categoria: 'pintureria',           precio: 3000,   margen: 42, popularidad: 0.80 },
  { id: 'P-029', nombre: 'Rodillo poliuretano 23cm',         categoria: 'pintureria',           precio: 3000,   margen: 44, popularidad: 0.78 },
  { id: 'P-030', nombre: 'Cinta de papel 48mm x50m',         categoria: 'pintureria',           precio: 1500,   margen: 50, popularidad: 0.82 },
  { id: 'P-031', nombre: 'Enduido interior x4kg',            categoria: 'pintureria',           precio: 6200,   margen: 38, popularidad: 0.55 },
  { id: 'P-032', nombre: 'Lija al agua x6',                  categoria: 'pintureria',           precio: 1800,   margen: 46, popularidad: 0.70 },
];

// ---------- Categor�as (definici�n + paleta) ----------
const CATEGORIAS = [
  { key: 'herramientas_manuales',  label: 'Herramientas manuales',   color: '#6366F1' },
  { key: 'herramientas_electricas', label: 'Herramientas el�ctricas', color: '#10B981' },
  { key: 'fijaciones',              label: 'Fijaciones',              color: '#F59E0B' },
  { key: 'plomeria',                label: 'Plomer�a',                color: '#EF4444' },
  { key: 'electricidad',            label: 'Electricidad',            color: '#8B5CF6' },
  { key: 'pintureria',              label: 'Pinturer�a',              color: '#14B8A6' },
];

// ---------- Tipos de cliente (segmentaci�n) ----------
const TIPOS_CLIENTE = [
  { key: 'profesional',  label: 'Profesional',  color: '#6366F1', factorTicket: 1.6, factorFrecuencia: 0.6 },
  { key: 'obra',         label: 'Obra',         color: '#F59E0B', factorTicket: 2.2, factorFrecuencia: 0.4 },
  { key: 'hogar',        label: 'Hogar',        color: '#10B981', factorTicket: 0.7, factorFrecuencia: 1.4 },
  { key: 'industria',    label: 'Industria',    color: '#EF4444', factorTicket: 3.5, factorFrecuencia: 0.2 },
  { key: 'institucion',  label: 'Instituci�n',  color: '#8B5CF6', factorTicket: 2.8, factorFrecuencia: 0.3 },
];

const NOMBRES_CLIENTE = [
  'Juan P�rez', 'Mar�a Gonz�lez', 'Carlos Rodr�guez', 'Ana Fern�ndez', 'Luis Mart�nez',
  'Sof�a L�pez', 'Diego S�nchez', 'Luc�a Romero', 'Mart�n D�az', 'Valentina Castro',
  'Pablo Acosta', 'Camila Su�rez', 'Federico Torres', 'Florencia M�ndez', 'Esteban Ruiz',
  'Constanza Vega', 'Hern�n Cabrera', 'Julieta Morales', 'Andr�s Pereyra', 'Roc�o Gim�nez',
  'Mateo Coronel', 'Victoria �balos', 'Tom�s B�ez', 'Rita Maidana', 'Joaqu�n Britos',
  'Sara Ledesma', 'Bruno Aguirre', 'Lara Corbal�n', 'Iv�n Quiroga', 'Noelia Bustamante',
  'Sergio Ojeda', 'Carolina Rivero', 'Rafael Salinas', 'Daniela Escobar', 'Ariel Montenegro',
  'B�rbara Maidana', 'Hugo Vera', 'Malena Pereyra', 'Leandro P�ez', 'Estela Romero',
  'Cristian P�rraga', 'In�s Olivera', 'Marcelo B�ez', 'Nora Villagra', 'Omar Soria',
  'Patricia Rold�n', 'Ricardo Ferreyra', 'Alicia Nieva', 'Sergio Villafa�e', 'Adriana Coronel',
];

const ZONAS = ['Palermo', 'Recoleta', 'Villa Crespo', 'Caballito', 'Flores', 'Balvanera', 'San Telmo', 'Belgrano', 'Nu�ez', 'Almagro', 'Boedo', 'Barracas'];
const CALLES = ['Av. Rivadavia', 'Av. Corrientes', 'Av. Santa Fe', 'Av. C�rdoba', 'Av. San Mart�n', 'Av. Gaona', 'Av. Directorio', 'Av. Independencia', 'Av. La Plata', 'Av. Caseros'];
const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito', 'mercadopago'];
const CANALES = ['mostrador', 'telefono', 'whatsapp', 'app'];
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Mi�rcoles', 'Jueves', 'Viernes', 'S�bado'];

// ---------- Generar clientes (80) ----------
const CLIENTES = [];
for (let i = 0; i < 80; i++) {
  const tipo = TIPOS_CLIENTE[i % TIPOS_CLIENTE.length];
  const nombre = NOMBRES_CLIENTE[i % NOMBRES_CLIENTE.length] + (i >= NOMBRES_CLIENTE.length ? ` ${Math.floor(i / NOMBRES_CLIENTE.length) + 1}` : '');
  CLIENTES.push({
    id: `C-${String(i + 1).padStart(3, '0')}`,
    nombre,
    tipo: tipo.key,
    tipoLabel: tipo.label,
    color: tipo.color,
    zona: ZONAS[Math.floor(rand() * ZONAS.length)],
    calle: `${CALLES[Math.floor(rand() * CALLES.length)]} ${Math.floor(rand() * 4500) + 100}`,
    telefono: `+54 11 ${String(Math.floor(rand() * 9000) + 1000)}-${String(Math.floor(rand() * 9000) + 1000)}`,
    email: nombre.toLowerCase().replace(/[^a-z0-9.]/g, '') + '@' + pick(['gmail.com','hotmail.com','yahoo.com']),
    fechaAlta: `${2018 + Math.floor(rand() * 7)}-${String(Math.floor(rand() * 12) + 1).padStart(2, '0')}-${String(Math.floor(rand() * 28) + 1).padStart(2, '0')}`,
    activo: rand() > 0.15,
    ltvBase: Math.round(50000 + rand() * 800000), // valor base para segmentaci�n
  });
}

// ---------- Generar rango de fechas: 8 a�os mensuales, 2 a�os diarios ----------
// "Hoy" fijo para reproducibilidad: 2025-12-31
const HOY = new Date('2025-12-31T12:00:00Z');
HOY.setUTCHours(12, 0, 0, 0);

// 96 meses hacia atr�s = 8 a�os
const MESES_TOTALES = 96;
const mesesGenerados = [];

function formatMes(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatFecha(d) {
  return d.toISOString().slice(0, 10);
}

// ---------- Generar 8 a�os de datos mensuales ----------
const ventasPorMes = new Map();
const productosPorMes = new Map();
const categoriasPorMes = new Map();
const clientesPorMes = new Map();

for (let i = MESES_TOTALES - 1; i >= 0; i--) {
  const fecha = new Date(HOY);
  fecha.setUTCDate(1); fecha.setUTCMonth(HOY.getUTCMonth() - i);
  const mes = formatMes(fecha);
  const yearRel = (MESES_TOTALES - 1 - i) / 12; // 0 ? 7

  // Tendencia anual: las ventas crecen ~14% por a�o (negocio en expansi�n)
  const tendenciaAnual = Math.pow(1.14, yearRel);

  // Estacionalidad: marzo-julio (obra), octubre-diciembre (fiestas)
  const m = fecha.getUTCMonth(); // 0-11
  const estacionalidad = 1
    + 0.18 * Math.sin((m - 2) / 12 * 2 * Math.PI)  // pico en oto�o
    + 0.12 * Math.cos((m - 11) / 12 * 2 * Math.PI) // pico en diciembre
    - 0.08 * Math.cos((m - 1) / 12 * 2 * Math.PI); // valle en febrero

  // Ruido gaussiano
  const ruido = 1 + gauss() * 0.06;
  const factorMes = tendenciaAnual * estacionalidad * ruido;

  // Base 4M ARS en el primer a�o (2018), crece con factorMes
  const baseARS = 4_000_000 * factorMes;
  const basePedidos = 290 * factorMes;

  // Para los a�os recientes, agregar un evento aleatorio (un mes malo o bueno)
  let evento = 1;
  const eventoRoll = rand();
  if (eventoRoll < 0.05) evento = 0.78;       // mes malo
  else if (eventoRoll > 0.97) evento = 1.18;  // mes excelente

  const ventasTotal = Math.round(baseARS * evento);
  const cantidadPedidos = Math.round(basePedidos * evento * (0.96 + rand() * 0.08));
  const ticketPromedio = Math.round(ventasTotal / Math.max(cantidadPedidos, 1));

  // Variaci�n porcentual signed vs mes anterior (calculada al final)
  ventasPorMes.set(mes, { mes, ventasTotal, cantidadPedidos, ticketPromedio, variacion: 0 });

  // Generar ~30-50 pedidos diarios promedio para ese mes
  const diasDelMes = new Date(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 0).getDate();
  const pedidosDelMes = [];

  // Distribuir productos en el mes
  const distribucionProductos = new Map();
  const distribucionCategorias = new Map();
  const distribucionClientes = new Map();

  for (let dia = 1; dia <= diasDelMes; dia++) {
    const fechaDia = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), dia));
    const dow = fechaDia.getUTCDay();
    // M�s pedidos entre semana, pico s�bados
    const factorDow = dow === 6 ? 1.35 : dow === 0 ? 0.55 : 1 + (dow === 5 ? 0.15 : 0);
    const pedidosDiarios = Math.max(1, Math.round((cantidadPedidos / diasDelMes) * factorDow * (0.85 + rand() * 0.3)));

    for (let p = 0; p < pedidosDiarios; p++) {
      // Cada pedido tiene 1-4 items
      const numItems = 1 + Math.floor(rand() * 4);
      const items = [];
      let subtotal = 0;

      for (let it = 0; it < numItems; it++) {
        // Seleccionar producto con peso de popularidad
        let prod;
        let roll = rand();
        let acumulado = 0;
        for (const candidate of PRODUCTOS) {
          acumulado += candidate.popularidad;
          if (roll * PRODUCTOS.reduce((s, p) => s + p.popularidad, 0) < acumulado) {
            prod = candidate;
            break;
          }
        }
        if (!prod) prod = PRODUCTOS[Math.floor(rand() * PRODUCTOS.length)];

        const unidades = 1 + Math.floor(rand() * (prod.categoria === 'fijaciones' ? 8 : 3));
        const precioConVariacion = Math.round(prod.precio * (0.95 + rand() * 0.1));
        const totalItem = unidades * precioConVariacion;
        subtotal += totalItem;

        items.push({
          productoId: prod.id,
          productoNombre: prod.nombre,
          categoria: prod.categoria,
          unidades,
          precioUnitario: precioConVariacion,
          total: totalItem,
        });

        // Acumular
        const prev = distribucionProductos.get(prod.id) ?? { unidades: 0, ingreso: 0 };
        distribucionProductos.set(prod.id, {
          unidades: prev.unidades + unidades,
          ingreso: prev.ingreso + totalItem,
        });

        const prevCat = distribucionCategorias.get(prod.categoria) ?? { unidades: 0, ingreso: 0 };
        distribucionCategorias.set(prod.categoria, {
          unidades: prevCat.unidades + unidades,
          ingreso: prevCat.ingreso + totalItem,
        });
      }

      // Cliente aleatorio (m�s probable hogar, menos industria)
      const rollTipo = rand();
      let tipo;
      if (rollTipo < 0.42) tipo = TIPOS_CLIENTE[2]; // hogar
      else if (rollTipo < 0.62) tipo = TIPOS_CLIENTE[0]; // profesional
      else if (rollTipo < 0.78) tipo = TIPOS_CLIENTE[3]; // obra
      else if (rollTipo < 0.92) tipo = TIPOS_CLIENTE[1]; // industria
      else tipo = TIPOS_CLIENTE[4]; // instituci�n

      // Aplicar factor de ticket al subtotal
      const totalPedido = Math.round(subtotal * tipo.factorTicket * (0.92 + rand() * 0.16));

      const clienteIdx = Math.floor(rand() * CLIENTES.length);
      const cliente = CLIENTES[clienteIdx];

      const pedido = {
        id: `PED-${fecha.getUTCFullYear()}${String(fecha.getUTCMonth() + 1).padStart(2, '0')}${String(dia).padStart(2, '0')}-${String(p).padStart(3, '0')}`,
        fecha: formatFecha(fechaDia),
        mes,
        clienteId: cliente.id,
        clienteTipo: tipo.key,
        total: totalPedido,
        metodoPago: METODOS_PAGO[Math.floor(rand() * METODOS_PAGO.length)],
        canal: CANALES[Math.floor(rand() * CANALES.length)],
        diaSemana: DIAS_SEMANA[dow],
      };

      if (rand() < 0.35) pedidosDelMes.push(pedido);

      const prevCli = distribucionClientes.get(cliente.id) ?? { pedidos: 0, ingreso: 0 };
      distribucionClientes.set(cliente.id, {
        pedidos: prevCli.pedidos + 1,
        ingreso: prevCli.ingreso + totalPedido,
      });
    }
  }

  productosPorMes.set(mes, distribucionProductos);
  categoriasPorMes.set(mes, distribucionCategorias);
  clientesPorMes.set(mes, distribucionClientes);

  // Solo guardamos pedidos diarios para los �ltimos 24 meses (para heatmap y tabla)
  if (i < 18) {
    // Acumular al map global de pedidos
    if (!globalThis.__pedidosBuffer) globalThis.__pedidosBuffer = [];
    globalThis.__pedidosBuffer.push(...pedidosDelMes);
  }
}

// Calcular variaci�n mensual
const mesesOrdenados = Array.from(ventasPorMes.values()).sort((a, b) => a.mes < b.mes ? -1 : 1);
for (let i = 0; i < mesesOrdenados.length; i++) {
  if (i > 0) {
    const prev = mesesOrdenados[i - 1].ventasTotal;
    const curr = mesesOrdenados[i].ventasTotal;
    if (prev > 0) {
      mesesOrdenados[i].variacion = Math.round(((curr - prev) / prev) * 1000) / 10;
    }
  }
}

// ---------- Generar ventas diarias (�ltimos 24 meses) ----------
const ventasDiarias = [];
for (let i = 23; i >= 0; i--) {
  const fecha = new Date(HOY);
  fecha.setUTCDate(1); fecha.setUTCMonth(HOY.getUTCMonth() - i);
  const year = fecha.getUTCFullYear();
  const month = fecha.getUTCMonth();
  const diasDelMes = new Date(year, month + 1, 0).getDate();

  const mesData = ventasPorMes.get(formatMes(fecha));
  if (!mesData) continue;
  const promedioDiario = Math.round(mesData.ventasTotal / diasDelMes);

  for (let dia = 1; dia <= diasDelMes; dia++) {
    const fechaDia = new Date(Date.UTC(year, month, dia));
    const dow = fechaDia.getUTCDay();
    const factorDow = dow === 6 ? 1.35 : dow === 0 ? 0.55 : 1 + (dow === 5 ? 0.15 : 0);
    const ruido = 1 + gauss() * 0.12;
    const ventas = Math.max(0, Math.round(promedioDiario * factorDow * ruido));
    const pedidos = Math.max(1, Math.round(ventas / (mesData.ticketPromedio * (0.95 + rand() * 0.1))));
    ventasDiarias.push({
      fecha: formatFecha(fechaDia),
      mes: formatMes(fecha),
      anio: year,
      mesNum: month + 1,
      dia,
      diaSemana: dow,
      ventasTotal: ventas,
      cantidadPedidos: pedidos,
    });
  }
}

// Construir cat�logo final de productos con unidades e ingreso totales (sumando todos los meses)
const productosFinal = PRODUCTOS.map((p) => {
  let totalUnidades = 0;
  let totalIngreso = 0;
  for (const dist of productosPorMes.values()) {
    const r = dist.get(p.id);
    if (r) {
      totalUnidades += r.unidades;
      totalIngreso += r.ingreso;
    }
  }
  return {
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    precioUnitario: p.precio,
    margen: p.margen,
    unidadesVendidas: totalUnidades,
    ingresoTotal: totalIngreso,
  };
});

// ---------- Generar segmentaci�n de clientes agregada ----------
const clientesFinal = CLIENTES.map((c) => {
  let pedidos = 0;
  let ingreso = 0;
  let ultimaCompra = null;
  for (const dist of clientesPorMes.values()) {
    const r = dist.get(c.id);
    if (r) {
      pedidos += r.pedidos;
      ingreso += r.ingreso;
    }
  }
  // �ltima compra aleatoria en los �ltimos 60 d�as para clientes activos
  if (c.activo) {
    const diasAtras = Math.floor(rand() * 60);
    const f = new Date(HOY);
    f.setUTCDate(f.getUTCDate() - diasAtras);
    ultimaCompra = formatFecha(f);
  }
  // Calcular ticket promedio
  const ticketPromedio = pedidos > 0 ? Math.round(ingreso / pedidos) : 0;
  // Score de actividad
  const scoreActividad = c.activo
    ? Math.round(60 + Math.min(40, pedidos / 50 * 40 + (ingreso / 1_000_000) * 0.5))
    : Math.round(rand() * 40);

  return {
    ...c,
    pedidos,
    ingresoTotal: ingreso,
    ticketPromedio,
    ultimaCompra,
    scoreActividad,
  };
});

// ---------- Outputs ----------
const dataDir = resolve(__dirname, '..', 'src', 'data');
await mkdir(dataDir, { recursive: true });

const pedidosBuffer = globalThis.__pedidosBuffer ?? [];

// 1. ventas.json � 96 meses agregados
await writeFile(
  resolve(dataDir, 'ventas.json'),
  JSON.stringify(mesesOrdenados, null, 2)
);

// 2. ventas-diarias.json � �ltimos 24 meses diarios
await writeFile(
  resolve(dataDir, 'ventas-diarias.json'),
  JSON.stringify(ventasDiarias, null, 2)
);

// 3. pedidos.json � ~3000 pedidos detallados (�ltimos 24 meses)
await writeFile(
  resolve(dataDir, 'pedidos.json'),
  JSON.stringify(pedidosBuffer, null, 2)
);

// 4. productos.json � 32 productos con totales acumulados
await writeFile(
  resolve(dataDir, 'productos.json'),
  JSON.stringify(productosFinal, null, 2)
);

// 5. clientes.json � 80 clientes segmentados
await writeFile(
  resolve(dataDir, 'clientes.json'),
  JSON.stringify(clientesFinal, null, 2)
);

// 6. categorias.json � definici�n + paleta
await writeFile(
  resolve(dataDir, 'categorias.json'),
  JSON.stringify(CATEGORIAS, null, 2)
);

console.log(`Wrote ventas.json:           ${mesesOrdenados.length} meses`);
console.log(`Wrote ventas-diarias.json:   ${ventasDiarias.length} d�as`);
console.log(`Wrote pedidos.json:          ${pedidosBuffer.length} pedidos`);
console.log(`Wrote productos.json:        ${productosFinal.length} SKUs`);
console.log(`Wrote clientes.json:         ${clientesFinal.length} clientes`);
console.log(`Wrote categorias.json:       ${CATEGORIAS.length} categor�as`);
