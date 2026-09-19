import fs from 'node:fs';
const path = 'src/lib/datos.ts';
let txt = fs.readFileSync(path, 'utf-8');
const lines = txt.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("case '") && (lines[i].includes('último') || lines[i].includes('uú'))) {
    console.log('Line ' + (i+1) + ':', JSON.stringify(lines[i]));
  }
}