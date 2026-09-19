// Last-mile encoding fix v5 — handle remaining edge cases
import fs from 'node:fs';
import path from 'node:path';

const FFFD = '\uFFFD';

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory() && !['node_modules', 'dist', '.astro'].includes(e.name)) return walk(p);
    if (/\.(astro|tsx|ts|css|json)$/.test(e.name)) return [p];
    return [];
  });
}

const RULES = [
  // === Remaining broken names in clientes.json ===
  ['Mart' + FFFD + 'n D', 'Martín D'],
  ['Tom' + FFFD + 's B', 'Tomás B'],

  // === VistaInicio.tsx: title/badges with leading FFFD before "Áreas" ===
  [FFFD + '\u00C1reas', '\u00c1reas'],
  [FFFD + 'reas', '\u00c1reas'],

  // === tendencias.ts: heatmap de 7×53 ===
  ['7' + FFFD + '53', '7×53'],

  // === index.astro: Visualizá el desempeño ===
  ['Visualiz— el desempe' + FFFD + 'o', 'Visualizá el desempeño'],

  // === Empty/placeholder FFFD in JSX/TSX strings → em-dash ===
  ["'" + FFFD + "'", "'—'"],
  ['>' + FFFD + '</span>', '>—</span>'],

  // === DeltaBadge neutral fallback ===
  // already covered by "'<FFFD>'" pattern
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let total = 0;
for (const f of walk('src')) {
  const buf = fs.readFileSync(f);
  let txt;
  try { txt = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { txt = new TextDecoder('utf-8', { fatal: false }).decode(buf); }
  const before = (txt.match(/\uFFFD/g) || []).length;
  if (before === 0) continue;
  let out = txt;
  for (const [pat, repl] of RULES) {
    out = out.replace(new RegExp(escapeRegex(pat), 'g'), repl);
  }
  const after = (out.match(/\uFFFD/g) || []).length;
  fs.writeFileSync(f, out, 'utf-8');
  total++;
  if (before !== after) console.log('[v5]', f, 'FFFD', before, '->', after);
}
console.log('Processed', total, 'files.');