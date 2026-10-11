import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5185'],{stdio:'pipe'});
let browser;
try {
 for(let n=0;n<60;n++){try{const r=await fetch('http://127.0.0.1:5185');if(r.ok)break}catch{}await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const tab=await browser.newPage();await tab.goto('http://127.0.0.1:5185');
 const result=await tab.evaluate(async()=>{
  const {renderArtwork,hitTestRegion,countRemaining}=await import('/src/engine/render.ts');
  const catalog=await(await fetch('/art/catalog.json')).json();const problems=[],pages=[];
  const c=document.createElement('canvas');c.width=200;c.height=260;const ctx=c.getContext('2d',{willReadFrequently:true});
  for(const meta of catalog){
   const p=await(await fetch(meta.file)).json();const state={fills:{},strokes:[],shading:true};
   for(const r of p.regions){if(hitTestRegion(ctx,p,...r.label)?.id!==r.id)problems.push(`${p.id}/${r.id}: label is not independently tappable`);if(p.palette[r.number-1]!==r.color)problems.push(`${p.id}/${r.id}: palette mismatch`);state.fills[r.id]={color:r.color};}
   if(countRemaining(p,state)!==0)problems.push(`${p.id}: cannot complete`);
   ctx.setTransform(.2,0,0,.2,0,0);renderArtwork(ctx,p,state);const actual=ctx.getImageData(0,0,200,260).data;
   renderArtwork(ctx,p,{fills:{},strokes:[],shading:true},{reference:true});const reference=ctx.getImageData(0,0,200,260).data;
   if(actual.some((v,i)=>v!==reference[i]))problems.push(`${p.id}: filled suggested palette differs from rendered reference`);
   pages.push({id:p.id,regions:p.regions.length,labelsTappable:true,completion:true,alignedReference:true});
  }
  return {pageCount:catalog.length,totalRegions:pages.reduce((n,p)=>n+p.regions,0),problems,pages};
 });
 await mkdir('docs',{recursive:true});await writeFile('docs/library-checks.json',JSON.stringify(result,null,2));
 if(result.problems.length)throw Error(result.problems.join('\n'));
 console.log(`PASS: ${result.pageCount} pages / ${result.totalRegions} individually reachable regions; every page completes; suggested coloring matches reference pixel for pixel.`);
}finally{await browser?.close();server.kill();}
