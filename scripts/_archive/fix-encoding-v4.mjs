// Comprehensive encoding fix v4 — context-aware Spanish replacement.
// Targets the FFFD character with explicit patterns covering Spanish names,
// product labels, UI text, and accented words seen in this codebase.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'src';
const FFFD = '\uFFFD';

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory() && !['node_modules', 'dist', '.astro'].includes(e.name)) return walk(p);
    if (/\.(astro|tsx|ts|css|json)$/.test(e.name)) return [p];
    return [];
  });
}

// Each rule: pattern (string with FFFD) → replacement
const RULES = [
  // === Spanish surnames and names (in JSON) ===
  ['Juan P' + FFFD + 'rez', 'Juan Pérez'],
  ['Mar' + FFFD + 'a Gonz' + FFFD + 'lez', 'María González'],
  ['Carlos Rodr' + FFFD + 'guez', 'Carlos Rodríguez'],
  ['San Mart' + FFFD + 'n', 'San Martín'],
  ['Ana Fern' + FFFD + 'ndez', 'Ana Fernández'],
  ['Luis Mart' + FFFD + 'nez', 'Luis Martínez'],
  ['Instituci' + FFFD + 'n', 'Institución'],
  ['Sof' + FFFD + 'a L' + FFFD + 'pez', 'Sofía López'],
  ['Diego S' + FFFD + 'nchez', 'Diego Sánchez'],
  ['Luc' + FFFD + 'a Romero', 'Lucía Romero'],
  ['Nu' + FFFD + 'ez', 'Núñez'],
  ['C' + FFFD + 'rdoba', 'Córdoba'],
  ['Camila Su' + FFFD + 'rez', 'Camila Suárez'],
  ['Florencia M' + FFFD + 'ndez', 'Florencia Méndez'],
  ['Hern' + FFFD + 'n Cabrera', 'Hernán Cabrera'],
  ['Andr' + FFFD + 's Pereyra', 'Andrés Pereyra'],
  ['Roc' + FFFD + 'o Gim' + FFFD + 'nez', 'Rocío Giménez'],
  ['Tom' + FFFD + 's B' + FFFD + 'ez', 'Tomás Báez'],
  ['Joaqu' + FFFD + 'n Britos', 'Joaquín Britos'],
  ['Lara Corbal' + FFFD + 'n', 'Lara Corbalán'],
  ['Iv' + FFFD + 'n Quiroga', 'Iván Quiroga'],
  ['B' + FFFD + 'rbara Maidana', 'Bárbara Maidana'],
  ['Leandro P' + FFFD + 'ez', 'Leandro Páez'],
  ['Cristian P' + FFFD + 'rraga', 'Cristian Párraga'],
  ['In' + FFFD + 's Olivera', 'Inés Olivera'],
  ['Marcelo B' + FFFD + 'ez', 'Marcelo Báez'],
  ['Patricia Rold' + FFFD + 'n', 'Patricia Roldán'],
  ['Sergio Villafa' + FFFD + 'e', 'Sergio Villafañe'],
  ['Mart' + FFFD + 'n D' + FFFD + 'az', 'Martín Díaz'],

  // === Product names ===
  ['Cinta m' + FFFD + 'trica', 'Cinta métrica'],
  ['Tarugos pl' + FFFD + 'sticos', 'Tarugos plásticos'],
  ['T' + FFFD + 'rmica bipolar', 'Térmica bipolar'],
  ['Pintura l' + FFFD + 'tex', 'Pintura látex'],
  ['Herramientas el' + FFFD + 'ctricas', 'Herramientas eléctricas'],

  // === Type labels ===
  ['Tel' + FFFD + 'fono', 'Teléfono'],
  ['Tarjeta d' + FFFD + 'bito', 'Tarjeta débito'],
  ['Tarjeta cr' + FFFD + 'dito', 'Tarjeta crédito'],

  // === UI labels ===
  ['Cerrar men' + FFFD, 'Cerrar menú'],
  ['Expandir men' + FFFD, 'Expandir menú'],
  ['Colapsar men' + FFFD, 'Colapsar menú'],
  ['ATR' + FFFD + 'S', 'ATRÁS'],
  ['Atr' + FFFD + 's', 'Atrás'],

  // === Text/Comments ===
  ['bot' + FFFD + 'n', 'botón'],
  ['Bot' + FFFD + 'n', 'Botón'],
  ['Posici' + FFFD + 'n', 'Posición'],
  ['posici' + FFFD + 'n', 'posición'],
  ['M' + FFFD + 'ltiples', 'Múltiples'],
  ['m' + FFFD + 'ltiples', 'múltiples'],
  ['peque' + FFFD + 'o', 'pequeño'],
  ['Peque' + FFFD + 'o', 'Pequeño'],
  ['Composici' + FFFD + 'n', 'Composición'],
  ['composici' + FFFD + 'n', 'composición'],
  ['hist' + FFFD + 'rico', 'histórico'],
  ['Hist' + FFFD + 'rico', 'Histórico'],
  ['facturaci' + FFFD + 'n', 'facturación'],
  ['Facturaci' + FFFD + 'n', 'Facturación'],
  ['Categor' + FFFD + 'a', 'Categoría'],
  ['categor' + FFFD + 'a', 'categoría'],
  ['Categor' + FFFD + 'as', 'Categorías'],
  ['categor' + FFFD + 'as', 'categorías'],
  ['Categor' + FFFD + 'a: ', 'Categoría: '],
  ['categor' + FFFD + 'a: ', 'categoría: '],
  ['r' + FFFD + 'pida', 'rápida'],
  ['R' + FFFD + 'pida', 'Rápida'],
  ['Filtr' + FFFD + ',', 'Filtró,'],
  ['orden' + FFFD + ',', 'ordenó,'],
  ['export' + FFFD + '.', 'exportó.'],
  ['despu' + FFFD + 's', 'después'],
  ['atr' + FFFD + 's', 'atrás'],
  ['m' + FFFD + 'nimo', 'mínimo'],
  ['M' + FFFD + 'nimo', 'Mínimo'],
  ['b' + FFFD + 'squeda', 'búsqueda'],
  ['B' + FFFD + 'squeda', 'Búsqueda'],
  ['seg' + FFFD + 'n', 'según'],
  ['Seg' + FFFD + 'n', 'Según'],
  ['peri' + FFFD + 'do', 'período'],
  ['Per' + FFFD + 'odo', 'Período'],
  ['Per' + FFFD + 'odo:', 'Período:'],
  ['Per' + FFFD + 'odo ', 'Período '],
  ['Per' + FFFD + 'odo/', 'Período/'],
  ['Per' + FFFD + 'odos', 'Períodos'],
  ['periodos ', 'períodos '],
  ['periodo ', 'período '],
  ['dispersi' + FFFD + 'n', 'dispersión'],
  ['Dispersi' + FFFD + 'n', 'Dispersión'],
  ['comparaci' + FFFD + 'n', 'comparación'],
  ['Comparaci' + FFFD + 'n', 'Comparación'],
  ['Visualiz' + FFFD + ' el', 'Visualizá el'],
  ['est' + FFFD + 'ndar', 'estándar'],
  ['Est' + FFFD + 'ndar', 'Estándar'],
  ['Dise' + FFFD + 'o', 'Diseño'],
  ['dise' + FFFD + 'o', 'diseño'],
  ['a' + FFFD + 'o ', 'año '],
  ['a' + FFFD + 'os ', 'años '],
  ['(8 a' + FFFD + 'os)', '(8 años)'],
  ['8 a' + FFFD + 'os', '8 años'],

  // === Areas / charts ===
  ['mix por categor' + FFFD + 'a', 'mix por categoría'],
  ['chart peque' + FFFD + 'o', 'chart pequeño'],
  ['chart peque' + FFFD + 'o)', 'chart pequeño)'],
  ['reas apiladas', 'Áreas apiladas'],
  ['rea apilada', 'Área apilada'],

  // === Symbols (em-dash etc.) ===
  ['rango.desde} ' + FFFD + ' rango.hasta}', 'rango.desde} — rango.hasta}'],
  ['rango.desde} ? rango.hasta}', 'rango.desde} — rango.hasta}'],

  // === Fallback (single char FFFD in code blocks) ===
  // Generic em-dash: FFFD surrounded by spaces, or word boundaries
  // Be careful — only when surrounded by spaces or specific contexts
];

// Compile rules into [regex, replacement] pairs
function compile(rules) {
  return rules.map(([pat, repl]) => {
    const escaped = pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return [new RegExp(escaped, 'g'), repl];
  });
}

let total = 0;
for (const f of walk(ROOT)) {
  const buf = fs.readFileSync(f);
  let txt;
  try { txt = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { txt = new TextDecoder('utf-8', { fatal: false }).decode(buf); }

  const before = (txt.match(/\uFFFD/g) || []).length;
  if (before === 0) continue;

  let out = txt;
  for (const [re, repl] of compile(RULES)) out = out.replace(re, repl);
  const after = (out.match(/\uFFFD/g) || []).length;
  fs.writeFileSync(f, out, 'utf-8');
  total++;
  console.log('[v4] ' + f + ': FFFD ' + before + ' -> ' + after);
}
console.log('Processed ' + total + ' files.');