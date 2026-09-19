import fs from 'node:fs';
const buf = fs.readFileSync('src/lib/datos.ts');
const txt = buf.toString('utf-8');
const lines = txt.split('\n');
console.log('Total lines:', lines.length);
for (let i = 45; i < 75; i++) {
  console.log(i + 1, '|', JSON.stringify(lines[i]));
}