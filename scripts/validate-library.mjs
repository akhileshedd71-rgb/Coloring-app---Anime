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
  const {renderArtwork,hitTestRegion,countRemaining,prepareArtwork}=await import('/src/engine/render.ts');
  const catalog=await(await fetch('/art/catalog.json')).json();const problems=[],pages=[];
  const c=document.createElement('canvas');c.width=200;c.height=260;const ctx=c.getContext('2d',{willReadFrequently:true});
  for(const meta of catalog){
   const p=await(await fetch(meta.file)).json();await prepareArtwork(p);const state={fills:{},strokes:[],shading:true};
   for(const r of p.regions){if(hitTestRegion(ctx,p,...r.label)?.id!==r.id)problems.push(`${p.id}/${r.id}: label is not independently tappable`);if(p.palette[r.number-1]!==r.color)problems.push(`${p.id}/${r.id}: palette mismatch`);state.fills[r.id]={color:r.color};}
   if(countRemaining(p,state)!==0)problems.push(`${p.id}: cannot complete`);
   const width=p.rasterInk?p.width:200,height=p.rasterInk?p.height:Math.round(200*p.height/p.width);
   c.width=width;c.height=height;ctx.setTransform(width/p.width,0,0,height/p.height,0,0);
   renderArtwork(ctx,p,state);const actual=ctx.getImageData(0,0,width,height).data;
   renderArtwork(ctx,p,{fills:{},strokes:[],shading:true},{reference:true});const reference=ctx.getImageData(0,0,width,height).data;
   if(actual.some((v,i)=>v!==reference[i]))problems.push(`${p.id}: filled suggested palette differs from rendered reference`);
   let pngReference, pngLineart;
   if(p.rasterInk){
    const img=new Image();img.src=meta.reference;await img.decode();
    if(img.naturalWidth!==p.width||img.naturalHeight!==p.height)problems.push(`${p.id}: published PNG dimensions differ from geometry`);
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);ctx.drawImage(img,0,0,width,height);
    const published=ctx.getImageData(0,0,width,height).data;let error=0,largePixels=0;
    for(let n=0;n<published.length;n+=4){let maximum=0;for(let k=0;k<3;k++){const delta=Math.abs(published[n+k]-reference[n+k]);error+=delta;maximum=Math.max(maximum,delta);}if(maximum>32)largePixels++;}
    const meanChannelError=error/(width*height*3),largePixelFraction=largePixels/(width*height);
    pngReference={width,height,meanChannelError:Number(meanChannelError.toFixed(4)),largePixelFraction:Number(largePixelFraction.toFixed(6))};
    // Published references use the same native Canvas path rasterizer and source
    // ink as the app, so even dense hair and tiny eye boundaries must be exact.
    if(error)problems.push(`${p.id}: published PNG differs from engine reference (${JSON.stringify(pngReference)})`);
    renderArtwork(ctx,p,{fills:{},strokes:[],shading:false},{lineart:true});const blank=ctx.getImageData(0,0,width,height).data;
    const lineart=new Image();lineart.src=meta.lineart;await lineart.decode();
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);ctx.drawImage(lineart,0,0,width,height);
    const linePixels=ctx.getImageData(0,0,width,height).data;let differingChannels=0;
    for(let n=0;n<linePixels.length;n++)if(linePixels[n]!==blank[n])differingChannels++;
    pngLineart={width,height,differingChannels};
    if(differingChannels)problems.push(`${p.id}: blank coloring canvas does not preserve published lineart PNG exactly (${differingChannels} channels)`);
   }
   pages.push({id:p.id,regions:p.regions.length,labelsTappable:true,completion:true,alignedReference:true,...(pngReference?{pngReference,pngLineart}:{})});
  }
  return {pageCount:catalog.length,totalRegions:pages.reduce((n,p)=>n+p.regions,0),problems,pages};
 });
 await mkdir('docs',{recursive:true});await writeFile('docs/library-checks.json',JSON.stringify(result,null,2));
 if(result.problems.length)throw Error(result.problems.join('\n'));
 console.log(`PASS: ${result.pageCount} pages / ${result.totalRegions} individually reachable regions; every page completes; suggested coloring matches reference pixel for pixel.`);
}finally{await browser?.close();server.kill();}
