import { generatePages as portraits } from './art/portraits.mjs';
import { generatePages as scenes } from './art/scenes.mjs';
import { generatePages as kawaii } from './art/kawaii.mjs';
import { generatePages as collectibles } from './art/collectible.mjs';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const root=resolve(import.meta.dirname,'..');
for(const folder of ['pages','thumbs','references','lineart'])await mkdir(`${root}/public/art/${folder}`,{recursive:true});
const art=[...portraits(),...scenes(),...kawaii(),...collectibles()];
if(art.length<100)throw Error(`Expected at least 100 illustrations, received ${art.length}`);
const ids=new Set(),geometry=new Set(),catalog=[],report=[];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const tab=await browser.newPage();
function esc(s){return s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');}
function svg(p,reference){return `<svg xmlns="http://www.w3.org/2000/svg" width="${p.width}" height="${p.height}" viewBox="0 0 ${p.width} ${p.height}"><title>${esc(p.title)}</title><rect width="100%" height="100%" fill="#fffdf8"/>${p.regions.map(r=>`<path d="${r.d}" fill="${reference?r.color:'#fffdf8'}" stroke="#383144" stroke-width="${r.strokeWidth??2.8}" stroke-linejoin="round" stroke-linecap="round"/>`).join('')}${reference?p.shades.map((s,i)=>`<path d="${s.d}" fill="${s.color||'#383144'}" opacity="${s.opacity}"/>`).join(''):''}${p.lines.map(l=>`<path d="${l.d}" fill="none" stroke="${l.color||'#383144'}" stroke-width="${l.width??2.5}" opacity="${l.opacity??1}" stroke-linejoin="round" stroke-linecap="round"/>`).join('')}${(p.ink||[]).map(shape=>`<path d="${shape.d}" fill="${shape.color}"/>`).join('')}</svg>`;}
try{
for(const p of art){
 if(ids.has(p.id))throw Error(`Duplicate art id ${p.id}`);ids.add(p.id);
 const hash=createHash('sha256').update(p.regions.map(r=>r.d).join('|')).digest('hex');
 if(geometry.has(hash))throw Error(`Geometry duplicated in ${p.id}`);geometry.add(hash);
 const regionIds=new Set();for(const r of p.regions){if(regionIds.has(r.id))throw Error(`Duplicate region ${p.id}/${r.id}`);regionIds.add(r.id);if(!/[zZ]\s*$/.test(r.d)||/NaN|undefined|Infinity/.test(r.d))throw Error(`Invalid region ${p.id}/${r.id}`);if(!/^#[a-f\d]{6}$/i.test(r.color))throw Error(`Invalid color ${r.color}`);}
 const originalCount=p.regions.length;
 // Visible-region masks use the same Path2D fill order as the app. Place labels at
 // the maximum interior distance, never at a mathematical centroid outside a shape.
 const metrics=await tab.evaluate(p=>{
  const w=p.width,h=p.height,c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});
  const paths=p.regions.map(r=>new Path2D(r.d));ctx.clearRect(0,0,w,h);
  const identities=new Map();
  p.regions.forEach((r,i)=>{const n=Math.imul(i+1,2654435761)&0xffffff;identities.set(n,i+1);ctx.fillStyle=`rgb(${n&255},${n>>8&255},${n>>16&255})`;ctx.fill(paths[i]);});
  (p.ink||[]).forEach(shape=>{ctx.fillStyle='rgb(0,0,0)';ctx.fill(new Path2D(shape.d));});
  const data=ctx.getImageData(0,0,w,h).data,mask=new Uint32Array(w*h),dist=new Uint16Array(w*h),counts=new Uint32Array(p.regions.length+1),best=new Uint16Array(p.regions.length+1),anchors=new Uint32Array(p.regions.length+1);
  for(let j=0;j<mask.length;j++){const n=data[j*4]|data[j*4+1]<<8|data[j*4+2]<<16;const id=identities.get(n);if(data[j*4+3]===255&&id){mask[j]=id;counts[id]++;}}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const j=y*w+x,n=mask[j];if(!n||!x||!y||x===w-1||y===h-1||mask[j-1]!==n||mask[j+1]!==n||mask[j-w]!==n||mask[j+w]!==n)dist[j]=0;else dist[j]=Math.min(dist[j-1],dist[j-w])+1;}
  for(let y=h-2;y>0;y--)for(let x=w-2;x>0;x--){const j=y*w+x,n=mask[j];if(!n||!dist[j])continue;dist[j]=Math.min(dist[j],dist[j+1]+1,dist[j+w]+1);if(dist[j]>best[n]){best[n]=dist[j];anchors[n]=j;}}
  return p.regions.map((r,i)=>{const n=i+1,j=anchors[n];return {id:r.id,area:counts[n],radius:best[n],anchor:[j%w+.5,Math.floor(j/w)+.5]};});
 },p);
 const hidden=metrics.filter(m=>m.area===0||m.radius===0).map(m=>m.id);
 // Fully occluded regions have no visible coloring surface; remove them so a page
 // can always reach 100%. Retain all visible tiny shapes and expose via deep zoom.
 p.regions=p.regions.filter(r=>!hidden.includes(r.id));
 for(const r of p.regions){const m=metrics.find(m=>m.id===r.id);r.label=m.anchor;r.number=p.palette.indexOf(r.color)+1;}
 const palette=[...new Set(p.regions.map(r=>r.color))];p.palette=palette;p.regions.forEach(r=>r.number=palette.indexOf(r.color)+1);
 const smallest=Math.min(...metrics.filter(m=>!hidden.includes(m.id)).map(m=>m.area));
 const tiny=metrics.filter(m=>m.area>0&&m.area<250).length;
 // Difficulty is grounded in both region count and actual detail size.
 if(p.difficulty==='Easy'&&(p.regions.length>65||tiny>8))p.difficulty='Medium';
 if(p.regions.length>100||tiny>24)p.difficulty='Hard';
 const colored=svg(p,true),lineart=svg(p,false);
 await writeFile(`${root}/public/art/pages/${p.id}.json`,JSON.stringify(p));
 await writeFile(`${root}/public/art/references/${p.id}.svg`,colored);
 await writeFile(`${root}/public/art/lineart/${p.id}.svg`,lineart);
 await sharp(Buffer.from(colored)).resize(360,468).webp({quality:83,effort:4}).toFile(`${root}/public/art/thumbs/${p.id}.webp`);
 const {regions,lines,shades,ink,width,height,...meta}=p;
 catalog.push({...meta,regionCount:p.regions.length,file:`./art/pages/${p.id}.json`,thumbnail:`./art/thumbs/${p.id}.webp`,reference:`./art/references/${p.id}.svg`});
 report.push({id:p.id,difficulty:p.difficulty,sourceRegions:originalCount,visibleRegions:p.regions.length,occludedRemoved:hidden.length,smallestRegionPixels:smallest,tinyRegions:tiny,labelsValidated:true,geometryHash:hash});
}
}finally{await browser.close();}
// Interleave categories for an inviting front page, retaining stable IDs and files.
const categories=[...new Set(catalog.map(p=>p.category))];const ordered=[];
for(let n=0;n<Math.max(...categories.map(c=>catalog.filter(p=>p.category===c).length));n++)for(const c of categories){const p=catalog.filter(p=>p.category===c)[n];if(p)ordered.push(p);}
ordered.sort((a,b)=>Number(b.tags.includes('collectible'))-Number(a.tags.includes('collectible')));
await writeFile(`${root}/public/art/catalog.json`,JSON.stringify(ordered));
await writeFile(`${root}/docs/art-validation.json`,JSON.stringify({version:1,pageCount:catalog.length,categories:categories.map(c=>({name:c,count:catalog.filter(p=>p.category===c).length})),difficulty:['Easy','Medium','Hard'].map(d=>({name:d,count:catalog.filter(p=>p.difficulty===d).length})),pages:report},null,2));
console.log(`Built ${catalog.length} distinct vector illustrations, aligned references, line art, thumbnails and verified visible-region labels.`);
console.log(JSON.stringify(['Easy','Medium','Hard'].map(d=>({difficulty:d,pages:catalog.filter(p=>p.difficulty===d).length}))));
