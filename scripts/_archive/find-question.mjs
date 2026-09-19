import fs from 'node:fs';
const files = [
  'src/lib/periodCompare.ts',
  'src/components/DateRangeBar.tsx',
  'src/components/vistas/VistaInicio.tsx',
  'src/components/vistas/VistaVentas.tsx',
  'src/components/vistas/VistaTendencias.tsx',
];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf-8');
  // Find " ? " in template literal positions like ${...} ? ${
  const re = /\$\{[^}]*\} \? \$\{/g;
  let m;
  while ((m = re.exec(t)) !== null) {
    const start = t.lastIndexOf('\n', m.index) + 1;
    const end = t.indexOf('\n', m.index);
    console.log(f + ':' + m.index + ' ' + JSON.stringify(t.slice(start, end === -1 ? t.length : end)));
  }
}