export const ellipse=(cx,cy,rx,ry)=>`M ${cx-rx} ${cy} a ${rx} ${ry} 0 1 0 ${rx*2} 0 a ${rx} ${ry} 0 1 0 ${-rx*2} 0 Z`;
export const circle=(x,y,r)=>ellipse(x,y,r,r);
export const rect=(x,y,w,h,r=0)=>r?`M ${x+r} ${y} H ${x+w-r} Q ${x+w} ${y} ${x+w} ${y+r} V ${y+h-r} Q ${x+w} ${y+h} ${x+w-r} ${y+h} H ${x+r} Q ${x} ${y+h} ${x} ${y+h-r} V ${y+r} Q ${x} ${y} ${x+r} ${y} Z`:`M${x} ${y}h${w}v${h}h${-w}Z`;
export const poly=(pts)=>'M'+pts.map(p=>p.join(' ')).join('L')+'Z';
export const star=(cx,cy,r,n=5,inner=r*.45)=>poly(Array.from({length:n*2},(_,i)=>{const a=i*Math.PI/n-Math.PI/2;const rr=i%2?inner:r;return [+(cx+Math.cos(a)*rr).toFixed(2),+(cy+Math.sin(a)*rr).toFixed(2)]}));
export const leaf=(x,y,s=1,flip=1)=>`M${x} ${y}q${-35*s*flip} ${-58*s} ${8*s*flip} ${-110*s}q${65*s*flip} ${68*s} ${-8*s*flip} ${110*s}Z`;
export const petal=(x,y,r,a)=>{const dx=Math.cos(a),dy=Math.sin(a),px=-dy,py=dx;return `M${x} ${y} Q${x+dx*r*.4+px*r*.6} ${y+dy*r*.4+py*r*.6} ${x+dx*r} ${y+dy*r} Q${x+dx*r*.4-px*r*.6} ${y+dy*r*.4-py*r*.6} ${x} ${y}Z`};
export function makePage(id,title,category,difficulty,tags,palette,description,transparent=false){return {id,title,category,difficulty,tags,palette,width:1000,height:1300,regions:[],lines:[],shades:[],description,transparent};}
export function region(p,id,d,color,label,name=id,strokeWidth=2.8){if(!p.palette.includes(color))p.palette.push(color);p.regions.push({id,d,color,name,number:p.palette.indexOf(color)+1,label,strokeWidth});}
export function line(p,d,width=2.5,color='#383144',opacity=1){p.lines.push({d,width,color,opacity});}
export function flower(p,id,x,y,r,colors=['#F8B4CB','#FFE3B5'],count=5){for(let j=0;j<count;j++){const a=j*Math.PI*2/count;region(p,`${id}-petal-${j}`,petal(x,y,r,a),colors[0],[x+Math.cos(a)*r*.58,y+Math.sin(a)*r*.58],'Flower petal',1.8);}region(p,`${id}-heart`,circle(x,y,r*.18),colors[1],[x,y],'Flower center',1.8);}
export function rng(seed){let s=seed;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
