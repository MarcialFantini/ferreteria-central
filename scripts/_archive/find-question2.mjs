import fs from 'node:fs';
const files = [
  'src/components/vistas/VistaInicio.tsx',
  'src/components/vistas/VistaVentas.tsx',
  'src/components/vistas/VistaTendencias.tsx',
];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf-8');
  // Find literal "} ? " pattern (not ternary)
  const re = /\} \? [^:?]/g;
  let m;
  while ((m = re.exec(t)) !== null) {
    const lineStart = t.lastIndexOf('\n', m.index) + 1;
    const lineEnd = t.indexOf('\n', m.index);
    console.log(f + ':' + m.index + ' ' + JSON.stringify(t.slice(lineStart, lineEnd === -1 ? t.length : lineEnd)));
  }
}