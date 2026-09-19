// Replace `} ? ${` with `} — ${` — separator pattern in template literals.
import fs from 'node:fs';
import path from 'node:path';

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory() && !['node_modules', 'dist', '.astro'].includes(e.name)) return walk(p);
    if (/\.(astro|tsx|ts|css|json)$/.test(e.name)) return [p];
    return [];
  });
}

const RE = /\} \? \$\{/g;
const REP = '} — ${';
let total = 0;
for (const f of walk('src')) {
  const txt = fs.readFileSync(f, 'utf-8');
  const before = (txt.match(RE) || []).length;
  if (before === 0) continue;
  const out = txt.replace(RE, REP);
  fs.writeFileSync(f, out, 'utf-8');
  total++;
  console.log('[em-dash]', f, ':', before, 'replaced');
}
console.log('Done. Files touched:', total);