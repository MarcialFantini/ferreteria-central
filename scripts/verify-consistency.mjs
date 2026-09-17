/**
 * Verifica la consistencia de los datos entre `getVentasPorPeriodo` y `getKPIs`
 * (T10.16): el KPI "Ventas totales" debe ser EXACTAMENTE igual a la suma
 * de los puntos del LineChart en el mismo rango.
 *
 * Corre con: `node scripts/verify-consistency.mjs` desde la raíz del proyecto.
 * Sale con código 0 si todo coincide, código 1 si hay mismatch.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ventasPath = resolve(__dirname, '..', 'src', 'data', 'ventas.json');
const ventas = JSON.parse(readFileSync(ventasPath, 'utf-8'));

function getVentasPorPeriodo(desde, hasta) {
  return ventas.filter((v) => v.mes >= desde && v.mes <= hasta);
}

function periodoARango(periodo) {
  if (ventas.length === 0) return { desde: '', hasta: '' };
  const last = ventas[ventas.length - 1].mes;
  switch (periodo) {
    case 'ultimos_6': {
      const idx = Math.max(0, ventas.length - 6);
      return { desde: ventas[idx].mes, hasta: last };
    }
    case 'ultimo_anio': {
      const idx = Math.max(0, ventas.length - 12);
      return { desde: ventas[idx].mes, hasta: last };
    }
    case 'todo': {
      return { desde: ventas[0].mes, hasta: last };
    }
  }
}

function formatARS(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

let ok = true;

for (const periodo of ['ultimos_6', 'ultimo_anio', 'todo']) {
  const { desde, hasta } = periodoARango(periodo);
  const filas = getVentasPorPeriodo(desde, hasta);

  const suma = filas.reduce((acc, v) => acc + v.ventasTotal, 0);
  const tickets = filas.reduce((acc, v) => acc + v.cantidadPedidos, 0);
  const ticketPromedioCalc = tickets > 0 ? Math.round(suma / tickets) : 0;

  const lineChartSuma = filas.map((v) => v.ventasTotal).reduce((a, b) => a + b, 0);

  const pass = suma === lineChartSuma;
  if (!pass) ok = false;

  console.log(`\n— Período: ${periodo} (${desde} → ${hasta}) —`);
  console.log(`  meses en rango       : ${filas.length}`);
  console.log(`  suma del LineChart   : ${formatARS(lineChartSuma)}`);
  console.log(`  ventasTotal KPI      : ${formatARS(suma)}`);
  console.log(`  cantidadPedidos      : ${tickets}`);
  console.log(`  ticketPromedio       : ${formatARS(ticketPromedioCalc)}`);
  console.log(`  consistencia K=V     : ${pass ? 'OK' : 'FAIL'}`);
}

console.log(
  `\n${ok ? '✅ T10.16 verificado: KPI ventasTotal == suma de LineChart en todos los períodos.' : '❌ Hay inconsistencia entre KPIs y LineChart.'}\n`,
);
process.exit(ok ? 0 : 1);