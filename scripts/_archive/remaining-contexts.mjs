import fs from 'node:fs';
import path from 'node:path';
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);if(e.isDirectory()&&!['node_modules','dist','.astro'].includes(e.name))return walk(p);if(/\.(astro|tsx|ts|css|json)$/.test(e.name))return [p];return [];});}
const files = walk('src');
const contexts = new Map();
files.forEach(f => {
  const txt = fs.readFileSync(f, 'utf-8');
  for (let i=0; i<txt.length; i++) {
    if (txt.charCodeAt(i) === 0xFFFD) {
      const before = txt.substring(Math.max(0,i-4), i);
      const after = txt.substring(i+1, i+4);
      const key = before + '____' + after;
      contexts.set(key, (contexts.get(key) || 0) + 1);
    }
  }
});
const sorted = [...contexts.entries()].sort((a,b) => b[1] - a[1]);
console.log('Total contexts:', sorted.length);
sorted.slice(0, 70).forEach(([k,v]) => console.log(v, '|', JSON.stringify(k)));