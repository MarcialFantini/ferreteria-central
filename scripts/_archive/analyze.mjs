import fs from 'node:fs';
import path from 'node:path';
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);if(e.isDirectory()&&!['node_modules','dist','.astro'].includes(e.name))return walk(p);if(/\.(astro|tsx|ts|css|json)$/.test(e.name))return [p];return [];});}
const files = walk('src');
let totalFffd = 0;
const byFile = [];
files.forEach(f => {
  const buf = fs.readFileSync(f);
  let txt; try { txt = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { txt = new TextDecoder('utf-8', { fatal: false }).decode(buf); }
  const cnt = (txt.match(/\uFFFD/g) || []).length;
  if (cnt > 0) byFile.push([cnt, f]);
  totalFffd += cnt;
});
byFile.sort((a,b) => b[0] - a[0]);
byFile.forEach(([c, f]) => console.log(c, f));
console.log('Total FFFD:', totalFffd);
console.log('Files with FFFD:', byFile.length, '/', files.length);