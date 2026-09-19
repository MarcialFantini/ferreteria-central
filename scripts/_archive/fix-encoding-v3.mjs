// Fix the "ú-run" corruption pattern that appears in many files.
// The pattern is: original_word_start_char + run_of_ú + rest_of_word
// We identify specific known cases and replace with clean text.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'src';
function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory() && !['node_modules', 'dist', '.astro'].includes(e.name)) return walk(p);
    if (/\.(astro|tsx|ts|css|json)$/.test(e.name)) return [p];
    return [];
  });
}

const RULES = [
  // The "ú-run" corruption: original char + 2+ "ú" + word body
  // Each pattern is [regex, replacement]
  // ultimaCompra family
  [/uú{2,}ltimaCompra/g, 'ultimaCompra'],
  [/Uú{2,}ltimaCompra/g, 'ultimaCompra'],
  [/úú{2,}ltimaCompra/g, 'ultimaCompra'],
  // Última compra family (label)
  [/Úú{2,}ltima compra/g, 'Última compra'],
  // Último / Últimos family
  [/Úú{2,}ltimo /g, 'Último '],
  [/úú{2,}ltimo /g, 'último '],
  [/Úú{2,}ltimos /g, 'Últimos '],
  [/úú{2,}ltimos /g, 'últimos '],
  // ultimo_ / ultimos_ identifiers
  [/uú{2,}ltimo_/g, 'ultimo_'],
  [/uú{2,}ltimos_/g, 'ultimos_'],
  [/Uú{2,}ltimo_/g, 'ultimo_'],
  // Special: just "uúltima" without any leading char (already accounted above)
];

let total = 0;
for (const f of walk(ROOT)) {
  const buf = fs.readFileSync(f);
  let txt;
  try { txt = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { txt = new TextDecoder('utf-8', { fatal: false }).decode(buf); }

  const beforeRuns = (txt.match(/ú{4,}/g) || []).length;
  if (beforeRuns === 0) continue;

  let out = txt;
  for (const [re, repl] of RULES) out = out.replace(re, repl);
  const afterRuns = (out.match(/ú{4,}/g) || []).length;
  fs.writeFileSync(f, out, 'utf-8');
  total++;
  console.log('[run] ' + f + ': ú-runs ' + beforeRuns + ' -> ' + afterRuns);
}
console.log('Processed ' + total + ' files with ú-runs.');