import fs from 'node:fs';
const p = process.argv[2];
const oldText = process.argv[3];
const newText = process.argv[4];
let s = fs.readFileSync(p, 'utf8');
if (!s.includes(oldText)) { console.error('NOT FOUND'); process.exit(1); }
s = s.replace(oldText, newText);
fs.writeFileSync(p, s);
console.log('patched');
