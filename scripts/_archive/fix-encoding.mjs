import fs from 'node:fs';
import path from 'node:path';
const ROOT='src';
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);if(e.isDirectory()&&!['node_modules','dist'].includes(e.name))return walk(p);if(/\.(astro|tsx|ts|css|json)$/.test(e.name))return [p];return [];});}
const FFFD=String.fromCharCode(0xFFFD);
const P=(pattern,repl)=>[new RegExp(pattern,'g'),repl];
const PATTERNS=[
P('(per)'+FFFD+'(odo)','$1\u00ED$2'),
P('(Per)'+FFFD+'(odo)','$1\u00ED$2'),
P('(per)'+FFFD+'(odos)','$1\u00ED$2'),
P('(per)'+FFFD+'(odo\\/rango)','$1\u00ED$2'),
P('(d)'+FFFD+'(a\\W)','$1\u00ED$2'),
P('(d)'+FFFD+'(a$)','$1\u00ED$2'),
P('(D)'+FFFD+'(as)','$1\u00ED$2'),
P('(7 d)'+FFFD+'(as)','$1\u00ED$2'),
P('(l)'+FFFD+'(der\\b)','$1\u00ED$2'),
P('(l)'+FFFD+'(der)','$1\u00ED$2'),
P('(L)'+FFFD+'(der)','$1\u00ED$2'),
P('(l)'+FFFD+'(nea)','$1\u00ED$2'),
P('(L)'+FFFD+'(nea)','$1\u00ED$2'),
P('(t)'+FFFD+'(tulo\\b)','$1\u00ED$2'),
P('(t)'+FFFD+'(tulo)','$1\u00ED$2'),
P('(tegor)'+FFFD+'(as?)','$1\u00ED$2'),
P('(gor)'+FFFD+'(a)','$1\u00ED$2'),
P('(gor)'+FFFD+'(as)','$1\u00ED$2'),
P('(Gor)'+FFFD+'(a)','$1\u00ED$2'),
P('(Gor)'+FFFD+'(as)','$1\u00ED$2'),
P('(electric)'+FFFD+'(as?)','$1\u00ED$2'),
P('(lomer)'+FFFD+'(a)','$1\u00ED$2'),
P('(turer)'+FFFD+'(a)','$1\u00ED$2'),
P('(Subi)'+FFFD+'( )','$1\u00F3$2'),
P('(Baj)'+FFFD+'( )','$1\u00F3$2'),
P('(aci)'+FFFD+'(n[^a])','$1\u00F3$2'),
P('(aci)'+FFFD+'(n )','$1\u00F3$2 '),
P('(aci)'+FFFD+'(n$)','$1\u00F3$2'),
P('(ribuc)'+FFFD+'(n)','$1\u00F3$2'),
P('(parac)'+FFFD+'(n)','$1\u00F3$2'),
P('(sentac)'+FFFD+'(n)','$1\u00F3$2'),
P('(nimac)'+FFFD+'(n)','$1\u00F3$2'),
P('(utac)'+FFFD+'(n)','$1\u00F3$2'),
P('(marc)'+FFFD+'(n)','$1\u00F3$2'),
P('(orac)'+FFFD+'(n)','$1\u00F3$2'),
P('(nte c)'+FFFD+'(mo)','$1\u00F3$2'),
P('(n c)'+FFFD+'(mo)','$1\u00F3$2'),
P('(ubi)'+FFFD+'( )','$1\u00F3$2'),
P('(Gr)'+FFFD+'(fico)','$1\u00E1$2'),
P('(gr)'+FFFD+'(fico)','$1\u00E1$2'),
P('(cat)'+FFFD+'(logo)','$1\u00E1$2'),
P('(Cat)'+FFFD+'(logo)','$1\u00E1$2'),
P('(An)'+FFFD+'(lisis)','$1\u00E1$2'),
P('(an)'+FFFD+'(lisis)','$1\u00E1$2'),
P('(S)'+FFFD+'(bado)','$1\u00E1$2'),
P('(s)'+FFFD+'(bado)','$1\u00E1$2'),
P('(P)'+FFFD+'(gina)','$1\u00E1$2'),
P('(p)'+FFFD+'(gina)','$1\u00E1$2'),
P('(m)'+FFFD+'(ximo)','$1\u00E1$2'),
P('(m)'+FFFD+'(s )','$1\u00E1$2'),
P('(m)'+FFFD+'(s$)','$1\u00E1$2'),
P('(m)'+FFFD+'(s,)','$1\u00E1$2'),
P('(M)'+FFFD+'(s)','$1\u00E1$2'),
P('( )'+FFFD+'(rea)',' \u00E1$2'),
[/ltimo/g,'último'],
[/ltima/g,'última'],
[/ltimos/g,'últimos'],
[/ltimas/g,'últimas'],
P('(y )'+FFFD+'(ltimo)','$1\u00FA$2'),
P('(y )'+FFFD+'(ltima)','$1\u00FA$2'),
P('(seg)'+FFFD+'(n el)','$1\u00FA$2'),
P('(men)'+FFFD+'( de)','$1\u00FA$2'),
P('(mer )'+FFFD+'(ltim)','$1\u00FA$2'),
P('(M)'+FFFD+'(todo)','$1\u00E9$2'),
P('(m)'+FFFD+'(todo)','$1\u00E9$2'),
P('(Mi)'+FFFD+'(rcoles)','$1\u00E9$2'),
P('(mi)'+FFFD+'(rcoles)','$1\u00E9$2'),
P('(a)'+FFFD+'(o )','$1\u00F1$2'),
P('(a)'+FFFD+'(o\\W)','$1\u00F1$2'),
P('(a)'+FFFD+'(o$)','$1\u00F1$2'),
P('(a)'+FFFD+'(o:)','$1\u00F1$2'),
P('(a)'+FFFD+'(o)','$1\u00F1$2'),
P('(A)'+FFFD+'(o)','$1\u00F1$2'),
P('( Demo)'+FFFD+'( datos)','$1\u00B7$2'),
P('(u\\.)'+FFFD+'( margen)','$1\u00B7$2'),
P('(line")'+FFFD+'(<\\/span>)','$1\u00B7$2'),
P("(')"+FFFD+("(', )"),'$1\u2014$2'),
P('(esto )'+FFFD+'( r)','$1\u2014$2'),
P('(2018)'+FFFD+'(2025)','$1\u2013$2'),
];
function fixText(txt){let r=txt;let safety=0;let last;do{last=r.length;for(const[x,y]of PATTERNS)r=r.replace(x,y);safety++;if(safety>10)break;}while(r.length!==last);return r;}
let total=0;
for(const f of walk(ROOT)){const buf=fs.readFileSync(f);let txt;try{txt=new TextDecoder('utf-8',{fatal:true}).decode(buf);}catch{txt=new TextDecoder('utf-8',{fatal:false}).decode(buf);}
const before=(txt.match(/\uFFFD/g)||[]).length;
let stray=false;for(const b of buf){if(b===0xF1||b===0xF3||b===0xFA||b===0xED||b===0xE1||b===0xB7||b===0x97||b===0x96||b===0x9B){stray=true;break;}}
if(before===0&&!stray)continue;
const fixed=fixText(txt);
const after=(fixed.match(/\uFFFD/g)||[]).length;
fs.writeFileSync(f,fixed,'utf-8');
total++;
console.log('[ok] '+f+': FFFD '+before+' -> '+after+(stray?' (stray)':''));}
console.log('Processed '+walk(ROOT).length+' files; rewrote '+total+'.');