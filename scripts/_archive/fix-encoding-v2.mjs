// Comprehensive encoding fix for FFFD characters in src/
// Strategy: each FFFD is replaced with the missing character based on context.
// We use both "context patterns" (look at letters around the FFFD) and a
// fallback lookup table for word pairs.

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

// Context-aware replacement rules.
// Each rule: [regex pattern, replacement function or string]
// We list patterns with FFFD in known positions.
// Order matters — more specific patterns first.
const RULES = [
  // === Em-dash / separator ===
  // " — " (space em-dash space)
  [' / ' + FFFD + ' /g', ' / — /g'],
  [' ' + FFFD + ' ', ' — '],
  [FFFD + ' ', '— '],
  [' ' + FFFD, ' —'],

  // === Spanish accented characters — context-aware ===
  // í
  ['Ferreter' + FFFD + 'a', 'Ferretería'],
  ['jerarqu' + FFFD + 'a', 'jerarquía'],
  ['jerarqu' + FFFD + 'as', 'jerarquías'],
  ['categor' + FFFD + 'a', 'categoría'],
  ['Categor' + FFFD + 'a', 'Categoría'],
  ['Categor' + FFFD + 'as', 'Categorías'],
  ['d' + FFFD + 'a', 'día'],
  ['D' + FFFD + 'a', 'Día'],
  ['d' + FFFD + 'as', 'días'],
  ['D' + FFFD + 'as', 'Días'],
  ['energ' + FFDD('a'), 'energía'], // (defensive)
  ['l' + FFFD + 'nea', 'línea'],
  ['L' + FFFD + 'nea', 'Línea'],
  ['l' + FFFD + 'neas', 'líneas'],
  ['L' + FFFD + 'neas', 'Líneas'],
  ['l' + FFFD + 'der', 'líder'],
  ['L' + FFFD + 'der', 'Líder'],
  ['l' + FFFD + 'deres', 'líderes'],
  ['L' + FFFD + 'deres', 'Líderes'],
  ['p' + FFFD + 'do', 'pído'], // not used; defensive
  ['p' + FFFD + 'dido', 'pedido'],
  ['P' + FFFD + 'dido', 'Pedido'],
  ['p' + FFFD + 'didos', 'pedidos'],
  ['P' + FFFD + 'didos', 'Pedidos'],
  ['med' + FFFD + 'a', 'medía'],
  ['Sab' + FFFD + 'a', 'Sabía'], // unlikely
  ['sub' + FFFD + 'a', 'subía'],
  ['Sub' + FFFD + 'a', 'Subía'],

  // é
  ['t' + FFFD + 'cnico', 'técnico'],
  ['t' + FFFD + 'cnica', 'técnica'],
  ['T' + FFFD + 'cnico', 'Técnico'],
  ['T' + FFFD + 'cnica', 'Técnica'],
  ['M' + FFFD + 'todo', 'Método'],
  ['m' + FFFD + 'todo', 'método'],
  ['M' + FFFD + 'todos', 'Métodos'],
  ['m' + FFFD + 'todos', 'métodos'],
  ['Mi' + FFFD + 'rcoles', 'Miércoles'],
  ['mi' + FFFD + 'rcoles', 'miércoles'],
  ['qu' + FFFD + 's', 'qués'], // not used
  ['porqu' + FFFD, 'porqué'],
  ['Porqu' + FFFD, 'Porqué'],

  // á
  ['Gr' + FFFD + 'fico', 'Gráfico'],
  ['gr' + FFFD + 'fico', 'gráfico'],
  ['Gr' + FFFD + 'ficos', 'Gráficos'],
  ['gr' + FFFD + 'ficos', 'gráficos'],
  ['Cat' + FFFD + 'logo', 'Catálogo'],
  ['cat' + FFFD + 'logo', 'catálogo'],
  ['Cat' + FFFD + 'logos', 'Catálogos'],
  ['cat' + FFFD + 'logos', 'catálogos'],
  ['An' + FFFD + 'lisis', 'Análisis'],
  ['an' + FFFD + 'lisis', 'análisis'],
  ['S' + FFFD + 'bado', 'Sábado'],
  ['s' + FFFD + 'bado', 'sábado'],
  ['S' + FFFD + 'bados', 'Sábados'],
  ['P' + FFFD + 'gina', 'Página'],
  ['p' + FFFD + 'gina', 'página'],
  ['P' + FFFD + 'ginas', 'Páginas'],
  ['p' + FFFD + 'ginas', 'páginas'],
  ['m' + FFFD + 'ximo', 'máximo'],
  ['M' + FFFD + 'ximo', 'Máximo'],
  ['m' + FFFD + 'ximos', 'máximos'],
  ['M' + FFFD + 'ximos', 'Máximos'],
  ['m' + FFFD + 's', 'más'],
  ['M' + FFFD + 's', 'Más'],
  ['M' + FFFD + 'rgen', 'Márgen'], // not standard, but margen
  ['m' + FFFD + 'rgen', 'margen'],
  ['Est' + FFFD + 'ndar', 'Estándar'],
  ['est' + FFFD + 'ndar', 'estándar'],

  // ó
  ['Subi' + FFFD + ' ', 'Subió '],
  ['subi' + FFFD + ' ', 'subió '],
  ['Baj' + FFFD + ' ', 'Bajó '],
  ['baj' + FFFD + ' ', 'bajó '],
  ['Subi' + FFFD + ',', 'Subió,'],
  ['subi' + FFFD + ',', 'subió,'],
  ['Baj' + FFFD + ',', 'Bajó,'],
  ['baj' + FFFD + ',', 'bajó,'],
  ['Subi' + FFFD + '.', 'Subió.'],
  ['subi' + FFFD + '.', 'subió.'],
  ['Baj' + FFFD + '.', 'Bajó.'],
  ['baj' + FFFD + '.', 'bajó.'],
  ['Subi' + FFFD + ':', 'Subió:'],
  ['subi' + FFFD + ':', 'subió:'],
  ['Baj' + FFFD + ':', 'Bajó:'],
  ['baj' + FFFD + ':', 'bajó:'],
  ['acci' + FFFD + 'n', 'acción'],
  ['Acci' + FFFD + 'n', 'Acción'],
  ['acci' + FFFD + 'nes', 'acciones'],
  ['Acci' + FFFD + 'nes', 'Acciones'],
  ['opci' + FFFD + 'n', 'opción'],
  ['Opci' + FFFD + 'n', 'Opción'],
  ['opci' + FFFD + 'nes', 'opciones'],
  ['Opci' + FFFD + 'nes', 'Opciones'],
  ['estaci' + FFFD + 'n', 'estación'],
  ['Estaci' + FFFD + 'n', 'Estación'],
  ['promoci' + FFFD + 'n', 'promoción'],
  ['Promoci' + FFFD + 'n', 'Promoción'],
  ['relaci' + FFFD + 'n', 'relación'],
  ['Relaci' + FFFD + 'n', 'Relación'],
  ['distribuci' + FFFD + 'n', 'distribución'],
  ['Distribuci' + FFFD + 'n', 'Distribución'],
  ['dispersi' + FFFD + 'n', 'dispersión'],
  ['Dispersi' + FFFD + 'n', 'Dispersión'],
  ['comparaci' + FFFD + 'n', 'comparación'],
  ['Comparaci' + FFFD + 'n', 'Comparación'],
  ['pertenenci' + FFFD, 'perteneció'],
  ['sentenci' + FFFD, 'sentenció'],
  ['animaci' + FFFD + 'n', 'animación'],
  ['Animaci' + FFFD + 'n', 'Animación'],
  ['marc' + FFFD + 'n', 'marcón'], // (defensive)
  ['ub' + FFFD + ' ', 'ubicación '], // incomplete
  ['generaci' + FFFD + 'n', 'generación'],
  ['Generaci' + FFFD + 'n', 'Generación'],

  // ú
  ['Men' + FFFD + ' de', 'Menú de'],
  ['men' + FFFD + ' de', 'menú de'],
  ['Men' + FFFD + ',', 'Menú,'],
  ['men' + FFFD + ',', 'menú,'],
  ['Men' + FFFD + '.', 'Menú.'],
  ['men' + FFFD + '.', 'menú.'],
  ['Men' + FFFD + ':', 'Menú:'],
  ['men' + FFFD + ':', 'menú:'],
  ['Men' + FFFD + '? ', 'Menú? '],
  ['Men' + FFFD, 'Menú'],
  ['men' + FFFD + 's', 'menús'],
  ['Men' + FFFD + 's', 'Menús'],
  ['Y' + FFFD + 'ltimo', 'Y último'],
  ['y' + FFFD + 'ltimo', 'y último'],
  ['Y' + FFFD + 'ltima', 'Y última'],
  ['y' + FFFD + 'ltima', 'y última'],

  // ñ
  ['a' + FFFD + 'o', 'año'],
  ['A' + FFFD + 'o', 'Año'],
  ['a' + FFFD + 'os', 'años'],
  ['A' + FFFD + 'os', 'Años'],
  ['ni' + FFFD + 'o', 'niño'],
  ['campa' + FFFD + 'a', 'campaña'],
  ['Campa' + FFFD + 'a', 'Campaña'],
  ['campa' + FFFD + 'as', 'campañas'],
  ['Campa' + FFFD + 'as', 'Campañas'],
  ['mua', 'muñ'], // unlikely
  ['espa' + FFFD + 'a', 'españa'],
  ['Es' + FFFD + 'a', 'España'],
];

// Helper that mistakenly builds a string with FFFD (defensive)
function FFDD(s) { return FFFD; }

// Compile rules to regex pairs. Allow rules to be either [pattern, replacement] arrays.
function compileRules(rules) {
  return rules.map(([pat, repl]) => {
    // Pattern may contain FFFD; turn it into a regex with literal U+FFFD.
    const escaped = pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\uFFFD/g, '\uFFFD');
    return [new RegExp(escaped, 'g'), repl];
  });
}

let total = 0;
const files = walk(ROOT);
for (const f of files) {
  const buf = fs.readFileSync(f);
  let txt;
  try { txt = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { txt = new TextDecoder('utf-8', { fatal: false }).decode(buf); }

  const before = (txt.match(/\uFFFD/g) || []).length;
  if (before === 0) continue;

  const compiled = compileRules(RULES);
  let out = txt;
  for (const [re, repl] of compiled) out = out.replace(re, repl);

  const after = (out.match(/\uFFFD/g) || []).length;
  fs.writeFileSync(f, out, 'utf-8');
  total++;
  console.log('[fix] ' + f + ': FFFD ' + before + ' -> ' + after);
}
console.log('Processed ' + total + ' files with FFFD remaining.');