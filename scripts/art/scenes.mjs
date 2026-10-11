import { makePage, region, line, ellipse, circle, rect, poly, star, flower, leaf } from './helpers.mjs';

// All geometry is original, authored in a shared 1000 × 1300 coordinate system.
// Each closed shape is both the painted region and the source of its reference.
const C={ink:'#34324B',cream:'#FFF6EA',paper:'#F4EEE8',skin:'#F3C7B6',skin2:'#DCA68F',skin3:'#AD7766',rose:'#DB809B',light:'#FFDCE8',lavender:'#B9ACDE',purple:'#716391',blue:'#758BB5',navy:'#39476E',mint:'#A9CFC2',green:'#648F83',gold:'#E8C17D',white:'#FFFCF6',red:'#B7647C',night:'#333D64',sky:'#BFCFDE'};
const arities={M:2,L:2,Q:4,C:6,S:4,T:2,H:1,V:1,A:7,Z:0};
function mapPath(d,x,y,s){
 const tokens=d.match(/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)||[];
 let out=[],cmd='M',i=0;
 while(i<tokens.length){
  if(/[A-Za-z]/.test(tokens[i])){cmd=tokens[i++];out.push(cmd);if(cmd.toUpperCase()==='Z')continue;}
  let n=arities[cmd.toUpperCase()],v=tokens.slice(i,i+n).map(Number);i+=n;
  if(!n||v.length<n)break;
  const abs=cmd===cmd.toUpperCase(),u=cmd.toUpperCase();
  if(u==='A'){v[0]*=s;v[1]*=s;v[5]=v[5]*s+(abs?x:0);v[6]=v[6]*s+(abs?y:0);}
  else if(u==='H')v[0]=v[0]*s+(abs?x:0);
  else if(u==='V')v[0]=v[0]*s+(abs?y:0);
  else v=v.map((a,j)=>a*s+(abs?(j%2?y:x):0));
  out.push(...v.map(a=>Number(a.toFixed(2))));
 }
 return out.join(' ');
}
function place(p,q,id,x,y,s){
 for(const r of q.regions)region(p,`${id}-${r.id}`,mapPath(r.d,x,y,s),r.color,[x+r.label[0]*s,y+r.label[1]*s],r.name,Math.max(1.5,(r.strokeWidth||2.8)*s));
 for(const l of q.lines)line(p,mapPath(l.d,x,y,s),(l.width||2.5)*s,l.color,l.opacity);
 for(const a of q.shades)p.shades.push({...a,d:mapPath(a.d,x,y,s)});
}
function r(p,id,d,c,x,y,name=id,w=2.6){region(p,id,d,c,[x,y],name,w);}
function detail(p,d,w=2){line(p,d,w,C.ink);}
function bloom(p,id,x,y,size,col=C.light){flower(p,id,x,y,size,[col,C.gold],5);}
function sprig(p,id,x,y,s=1,col=C.green){r(p,id+'-stem',`M${x-2} ${y}Q${x+8*s} ${y-65*s} ${x+36*s} ${y-130*s}L${x+41*s} ${y-129*s}Q${x+11*s} ${y-60*s} ${x+3} ${y}Z`,col,x+12*s,y-65*s,'Flower stem',1.5);for(let i=0;i<3;i++){let yy=y-i*34*s;r(p,id+'-leaf'+i,leaf(x+10*s+i*7*s,yy,.25*s,i%2?-1:1),C.mint,x+10*s+i*7*s+(i%2?-3:3),yy-17*s,'Leaf',1.5);}}
function mug(p,id,x,y,s=1,col=C.rose){r(p,id+'-handle',`M${x+65*s} ${y+12*s}C${x+113*s} ${y-1*s} ${x+110*s} ${y+71*s} ${x+65*s} ${y+61*s}L${x+64*s} ${y+49*s}C${x+93*s} ${y+58*s} ${x+96*s} ${y+12*s} ${x+65*s} ${y+25*s}Z`,col,x+85*s,y+33*s,'Cup handle');r(p,id,`M${x} ${y}Q${x+34*s} ${y-12*s} ${x+70*s} ${y}L${x+63*s} ${y+66*s}Q${x+34*s} ${y+83*s} ${x+8*s} ${y+66*s}Z`,col,x+34*s,y+35*s,'Tea cup');r(p,id+'-tea',ellipse(x+35*s,y,35*s,8*s),C.gold,x+35*s,y,'Tea',1.7);detail(p,`M${x+20*s} ${y-16*s}Q${x+3*s} ${y-39*s} ${x+25*s} ${y-56*s}M${x+49*s} ${y-17*s}Q${x+66*s} ${y-43*s} ${x+49*s} ${y-65*s}`,1.5);}
function book(p,id,x,y,s=1,col=C.navy){r(p,id+'-left',`M${x} ${y}Q${x+54*s} ${y-25*s} ${x+100*s} ${y}V${y+123*s}Q${x+56*s} ${y+100*s} ${x} ${y+120*s}Z`,C.cream,x+50*s,y+55*s,'Book page');r(p,id+'-right',`M${x+100*s} ${y}Q${x+153*s} ${y-25*s} ${x+200*s} ${y}V${y+120*s}Q${x+147*s} ${y+100*s} ${x+100*s} ${y+123*s}Z`,C.white,x+150*s,y+55*s,'Book page');r(p,id+'-cover',`M${x-4*s} ${y+121*s}Q${x+48*s} ${y+106*s} ${x+100*s} ${y+128*s}Q${x+145*s} ${y+106*s} ${x+204*s} ${y+121*s}V${y+132*s}Q${x+145*s} ${y+115*s} ${x+100*s} ${y+140*s}Q${x+48*s} ${y+115*s} ${x-4*s} ${y+132*s}Z`,col,x+50*s,y+119*s,'Book binding');for(let j=0;j<4;j++){let yy=y+(23+j*17)*s;detail(p,`M${x+18*s} ${yy}Q${x+51*s} ${yy-8*s} ${x+83*s} ${yy+2*s}M${x+116*s} ${yy+2*s}Q${x+151*s} ${yy-8*s} ${x+181*s} ${yy}`,1.2);}}

// A detailed waist-up figure, with deliberately separated hair locks, garment
// panels, eye highlights and accessory pieces. Four body poses and seven outfits.
function figure(opts={}){
 const {sex='f',hair='long',outfit='uniform',pose='rest',v=0}=opts;
 const female=sex==='f',skin=[C.skin,C.skin2,C.skin3,'#EAC0A2'][v%4];
 const hairC=[C.navy,'#625373','#B07D77','#94A7C2','#544958','#D3B78B','#667F88','#987793'][v%8];
 const hairHi=[C.blue,C.lavender,'#D3A390','#CBD7E8','#807383','#ECD3A7','#9BB9BB','#C3A0B8'][v%8];
 const cloth=[C.blue,C.rose,C.mint,C.lavender,C.navy,C.green,C.red,C.purple][v%8];
 const q=makePage('figure','Figure','','Hard',[],[],'');
 const add=(id,d,c,x,y,name)=>r(q,id,d,c,x,y,name);
 if(hair==='long'||hair==='braid'||hair==='pony'){
  add('back-hair','M51 126C26 41 99 13 158 26C241 24 282 73 262 182C249 266 312 344 271 402C245 359 238 373 224 402C218 316 216 265 191 224L101 245C89 302 100 358  sixty 390Q73 307 49 258Q22 191 51 126Z'.replace('sixty','60'),hairC,67,247,'Flowing back hair');
  add('back-lock-left','M68 174C25 248 66 337 30 381C83 377 99 338 93 282C88 231 90 207 103 191Z',hairC,70,306,'Outer hair lock');
  add('back-lock-right','M227 151C276 194 247 291 289 335C258 345 246 324 239 312C241 358 268 373 264 398C226 378 211 346 222 279Z',hairC,241,269,'Outer hair lock');
 }
 if(hair==='bob')add('back-hair','M48 151C27 50 94 23 154 27C226 19 280 79 252 178L273 277Q251 306 210 287L80 290Q44 281 37 262Z',hairC,58,240,'Bob silhouette');
 if(hair==='short'||hair==='spiky')add('back-hair','M50 164L27 124L47 119L25 80L76 92L63 50L111 58L139 17L163 42L199 22L211 49L251 43L244 83L278 96L256 126L268 150L231 175Z',hairC,151,65,'Tousled hair');
 if(hair==='pony'){
  add('ponytail','M238 96C299 40 329 110 298 170C279 203 318 238 296 285C289 251 257 227 260 190C240 158 274 124 238 125Z',hairC,285,150,'Ponytail');
  add('ponytail-ribbon','M244 108Q228 70 211 79L223 117L204 140Q231 144 246 119Q276 127 287 102Q264 94 244 108Z',C.rose,230,108,'Ponytail ribbon');
 }
 // Neck and ears sit behind the face and collar.
 add('neck','M123 239L119 307Q149 331 185 303L177 239Z',skin,151,286,'Neck');
 add('neck-shadow','M124 251Q151 268 179 248L179 272Q151 291 123 269Z',skin,151,266,'Neck shadow plane');
 add('ear-l','M58 162Q36 145 40 181Q44 211 65 210L75 177Z',skin,53,183,'Left ear');
 add('ear-r','M237 165Q260 146 258 179Q253 212 234 211L225 179Z',skin,245,184,'Right ear');
 detail(q,'M51 172Q43 182 55 193M246 173Q253 181 241 195',1.7);
 add('face','M65 112C82 66 199 54 231 116C243 159 231 211 210 233Q182 263 151 274Q116 259 87 226C66 201 53 151 65 112Z',skin,151,207,'Face');
 q.shades.push({d:'M226 133Q240 181 210 230Q182 261 151 274L164 255Q210 224 219 189Z',opacity:.13,color:'#8E617C'});
 // Eye geometry follows an anime almond, with independent iris, pupil and light.
 const eyeCol=[C.purple,C.green,C.blue,C.rose,'#AF9755'][v%5];
 for(const [side,cx] of [['l',106],['r',199]]){
  const yy=174,high=female?20:14;
  add('eye-'+side,`M${cx-28} ${yy}Q${cx-4} ${yy-high-6} ${cx+27} ${yy-2}Q${cx+17} ${yy+20} ${cx-6} ${yy+17}Q${cx-22} ${yy+12} ${cx-28} ${yy}Z`,C.white,cx-21,yy+3,'Eye white');
  add('iris-'+side,ellipse(cx+2,yy+1,14,female?17:14),eyeCol,cx+9,yy+8,'Iris');
  add('pupil-'+side,ellipse(cx+2,yy,6,10),C.ink,cx+2,yy,'Pupil');
  add('eye-light-'+side,ellipse(cx-4,yy-7,5,6),C.white,cx-4,yy-7,'Eye light');
  add('eye-spark-'+side,circle(cx+9,yy+8,2.8),C.white,cx+9,yy+8,'Small eye light');
  detail(q,`M${cx-30} ${yy-1}Q${cx-5} ${yy-high-6} ${cx+29} ${yy-3}`,female?4:3.3);
  if(female)detail(q,`M${cx-28} ${yy-2}L${cx-34} ${yy-8}M${cx-22} ${yy-7}L${cx-27} ${yy-13}`,2.8);
  add('eyebrow-'+side,`M${cx-25} ${yy-34}Q${cx} ${yy-48} ${cx+24} ${yy-34}Q${cx} ${yy-41} ${cx-25} ${yy-29}Z`,hairC,cx,yy-37,'Eyebrow');
 }
 detail(q,'M155 187Q149 202 158 207M144 211Q151 214 157 211',1.5);
 if(v%3===0){add('smile','M134 233Q151 244 171 231Q157 252 143 243Z',C.rose,153,238,'Smile');detail(q,'M136 234Q153 239 169 232',1.4);}
 else detail(q,'M137 236Q151 231 166 235M148 243Q154 246 160 242',1.7);
 detail(q,'M85 214L92 217M95 216L101 219M202 215L208 212M211 212L217 209',1.3);
 // Forehead hair is split into shaped locks, never a repeated color grid.
 if(hair==='short'||hair==='spiky'){
  add('fringe-1','M55 136Q43 67 113 54Q106 104 65 150L75 114Z',hairC,80,99,'Side fringe');
  add('fringe-2','M94 71Q139 30 179 58Q149 99 135 150Q123 132 127 111L103 130Q105 91 94 71Z',hairC,134,90,'Central fringe');
  add('fringe-3','M157 55Q229 38 252 109L236 159Q230 133 205 115L223 143Q173 114 157 55Z',hairC,200,88,'Swept fringe');
  add('fringe-highlight','M118 64Q140 53 158 57Q133 81 130 102Q121 91 118 64Z',hairHi,135,73,'Hair shine');
  detail(q,'M seventy 85Q71 116 61 134M174 61Q185 91 217 112'.replace('seventy','70'),1.6);
 }else{
  add('fringe-1','M63 144Q40 84 100 56Q93 103 77 180Q66 166 63 144Z',hairC,69,112,'Left fringe');
  add('fringe-2','M94 68Q111 37 143 47Q131 93 112 155Q101 134 101 115L86 141Q96 96 94 68Z',hairC,111,98,'Forehead lock');
  add('fringe-3','M136 47Q159 35 175 51Q178 99 154 155Q143 140 142 118L127 145Q137 84 136 47Z',hairC,153,94,'Central fringe');
  add('fringe-4','M170 49Q201 45 217 75Q232 118 232 174Q214 151 196 118L203 151Q178 129 170 49Z',hairC,197,102,'Right fringe');
  add('fringe-5','M206 67Q248 83 245 135Q243 172 255 220Q226 215 221 182Q237 138 206 67Z',hairC,238,171,'Face-framing hair');
  add('hair-shine-left','M96 73Q111 62 123 60L116 82L94 101Z',hairHi,107,78,'Hair shine');
  add('hair-shine-right','M176 65Q193 66 205 83L215 109L188 86Z',hairHi,192,81,'Hair shine');
  detail(q,'M116 58Q108 102 106 129M153 58Q157 94 147 134M185 62Q190 89 211 130M67 91Q58 121 72 154',1.6);
 }
 if(hair==='braid')for(let i=0;i<6;i++){let yy=245+i*25,xx=66+(i%2?4:-3);add('braid-'+i,`M${xx} ${yy}Q${xx-25} ${yy+12} ${xx+1} ${yy+29}Q${xx+24} ${yy+13} ${xx} ${yy}Z`,i%2?hairHi:hairC,xx,yy+14,'Braided hair');}
 if(female){add('earring-l',ellipse(49,218,5,10),C.gold,49,218,'Earring');add('earring-r',ellipse(246,218,5,10),C.gold,246,218,'Earring');}
 // Shoulders and sleeves; lower edge is intentionally a portrait crop.
 const wide=outfit==='kimono';
 add('sleeve-l',wide?'M112 298Q67 301 44 325L2 501Q26 550 79 537L109 423Z':'M110 301Q69 296 52 330L28 478Q43 503 76 492L105 398Z',cloth,61,387,'Left sleeve');
 add('sleeve-r',wide?'M182 299Q232 293 258 326L298 500Q271 554 220 537L192 414Z':'M187 302Q233 294 251 332L277 475Q262 502 228 491L198 398Z',cloth,242,388,'Right sleeve');
 add('body','M112 302Q149 330 184 302L215 375L226 627Q154 651  seventy 627L85 376Z'.replace('seventy','70'),cloth,153,442,'Garment');
 if(outfit==='kimono'){
  add('kimono-collar-left','M111 291L163 372L135 415L88 316Z',C.cream,123,346,'Kimono collar');
  add('kimono-collar-right','M187 290L210 320L118 454L92 437Z',C.light,153,370,'Crossed kimono collar');
  add('kimono-wrap','M204 351L205 487L86 486L85 447Z',cloth,160,449,'Kimono wrap');
  add('obi','M77 483Q152 503 218 482L223 542Q148 561 74 541Z',C.gold,148,520,'Obi belt');
  add('obi-center','M140 493H161V549H140Z',C.rose,150,523,'Obi tie');
  add('obi-knot','M140 512Q113 489 111 524Q120 537 141 528L156 529Q181 541 188 519Q177 503 157 514Z',C.red,128,520,'Obi bow');
  for(const [i,x,y] of [[0,48,373],[1,248,439],[2,119,594]])bloom(q,'fabric-flower-'+i,x,y,17,C.light);
  detail(q,'M12 500Q42 510 74 508M227 507Q260 521 292 500M91 556L86 614M198 555L211 616',1.7);
 }else if(outfit==='uniform'||outfit==='coat'||outfit==='detective'){
  add('shirt','M117 305Q150 326 184 304L180 445H122Z',C.white,150,367,'Shirt');
  add('lapel-l','M109 300L148 423L109 402L98 366L83 359Z',outfit==='detective'?C.gold:C.cream,112,361,'Left lapel');
  add('lapel-r','M187 300L152 423L191 397L201 365L218 357Z',outfit==='detective'?C.gold:C.cream,188,357,'Right lapel');
  add('tie-knot','M142 323H159L164 340L150 350L138 339Z',C.red,150,337,'Tie knot');
  add('tie','M147 348L156 347L164 404L150 419L138 406Z',C.red,150,384,'Tie');
  add('pocket','M171 435L205 430L207 448L173 453Z',hairC,188,442,'Jacket pocket');
  for(let j=0;j<3;j++)add('button-'+j,circle(149,467+j*47,4.5),C.gold,149,467+j*47,'Button');
  detail(q,'M149 427V620M97 458Q89 515 91 567M209 464L214 572',1.8);
 }else if(outfit==='hoodie'){
  add('hood-l','M115 296Q82 275 83 324Q89 357 142 382L128 342Z',hairHi,108,329,'Hood');
  add('hood-r','M183 297Q217 276 218 324Q211 358 156 382L174 342Z',hairHi,190,329,'Hood');
  add('pouch','M112 503L92 544L96 571H205L208 545L185 503Z',hairHi,150,548,'Hoodie pocket');
  add('hem','M seventy 602Q146 625 224 602L226 627Q148 652 70 627Z'.replace('seventy','70'),hairHi,150,626,'Ribbed hem');
  detail(q,'M130 356L122 434M170 356L177 434M122 434L118 443M177 434L181 443',2.3);
  add('emblem',star(153,442,22,4,10),C.gold,153,441,'Chest emblem');
 }else if(outfit==='dress'||outfit==='apron'){
  add('bodice','M105 310Q148 335 195 310L204 443Q147 465 96 443Z',C.cream,147,391,'Bodice');
  add('strap-l','M106 300L121 306L115 443L97 440Z',cloth,108,367,'Dress strap');
  add('strap-r','M180 307L193 300L204 439L186 444Z',cloth,191,367,'Dress strap');
  add('waistband','M91 443Q149 460 207 442L210 466Q149 484 88 466Z',C.red,149,462,'Waist ribbon');
  add('bow-left','M142 457Q106 424 111 473Q128 486 148 467Z',C.rose,128,460,'Bow loop');
  add('bow-right','M157 457Q197 429 189 475Q173 485 150 467Z',C.rose,172,460,'Bow loop');
  add('bow-center',circle(151,462,8),C.gold,151,462,'Bow center');
  detail(q,'M104 484L90 611M128 489L124 625M174 489L179 625M199 483L213 611',1.7);
  if(outfit==='apron')add('apron-pocket','M114 510H187V556Q151 577 115 556Z',C.white,150,539,'Apron pocket');
 }else{
  add('cape-l','M113 301L136 346L84 581L14 544L56 340Z',C.navy,77,410,'Cape panel');
  add('cape-r','M185 301L165 346L220 580L292 540L245 340Z',C.navy,230,416,'Cape panel');
  add('collar-l','M105 291L145 320L127 357L81 327Z',C.cream,115,322,'Cape collar');
  add('collar-r','M192 291L155 320L171 357L218 326Z',C.cream,182,325,'Cape collar');
  add('brooch',star(151,336,17,8,10),C.gold,151,336,'Cape brooch');
  add('belt','M78 513H220V536H77Z',C.gold,145,525,'Belt');
  add('buckle',rect(139,509,28,31,3),C.cream,153,525,'Buckle');
 }
 // Hands are shown together at waist, supporting the chosen object.
 if(pose!=='rest'){
  add('forearm-l','M40 475Q54 489 73 479L111 460L122 479L80 526Q51 544  thirty 517Z'.replace('thirty','30'),cloth,64,509,'Bent left sleeve');
  add('forearm-r','M234 478Q251 488 268 475L277 515Q245 542 220 519L181 480L193 461Z',cloth,239,510,'Bent right sleeve');
  add('hand-l','M102 463Q107 445 115 446L117 459Q135 447 138 455L128 466Q143 457 146 465L130 477Q144 470 145 478L124 493Q112 493 102 478Z',skin,119,474,'Left hand');
  add('hand-r','M198 463Q193 445 185 447L183 459Q166 448 161 456L173 467Q156 458 154 466L170 478Q156 471 155 479L177 493Q190 493 199 478Z',skin,182,475,'Right hand');
  if(pose==='book')book(q,'held-book',91,421,.6,C.navy);
  if(pose==='cup')mug(q,'held-cup',126,427,.72,C.rose);
  if(pose==='flower'){sprig(q,'held-sprig',152,477,.6);bloom(q,'held-flower',171,397,23,C.light);bloom(q,'held-flower-small',145,416,15,C.lavender);}
  if(pose==='letter'){add('envelope',rect(115,429,78,51,3),C.cream,135,454,'Envelope');detail(q,'M115 429L154 458L193 429M115 480L142 451M193 480L167 451',1.5);add('letter-seal',circle(154,458,8),C.rose,154,458,'Wax seal');}
  if(pose==='fan'){add('fan','M154 478L94 406Q151 353 214 406Z',C.light,154,416,'Paper fan');for(let j=0;j<5;j++){const xx=105+j*23;detail(q,`M154 478L${xx} ${400-Math.sin(j/4*Math.PI)*18}`,1.5);}add('fan-handle','M149 473H158V505H149Z',C.gold,153,488,'Fan handle');}
 }else{
  add('cuff-l','M29 475Q48 489 77 478L76 504Q48 516 28 501Z',hairHi,49,496,'Left cuff');
  add('cuff-r','M227 478Q254 489 278 474L279 501Q252 516 226 504Z',hairHi,252,495,'Right cuff');
  add('hand-l','M33 507L69 510L68 544Q67 557 61 552L60 535L55 556Q48 560 47 552L47 537L41 554Q35 555 35 545L35 532Q25 535 25 528Z',skin,49,530,'Left hand');
  add('hand-r','M234 510L270 507L278 528Q277 536 269 532V546Q267 557 261 553L257 537L256 553Q252 561 248 555L242 535L242 552Q235 559 234 545Z',skin,253,532,'Right hand');
 }
 if(v%3===1){add('hair-clip',`M210 111L237 103L240 111L213 119Z`,C.gold,225,111,'Hair clip');add('hair-clip-gem',star(227,111,7,4,3),C.light,227,111,'Hair ornament');}
 if(v%4===2&&female)bloom(q,'hair-blossom',58,127,14,C.light);
 if(v%5===3){add('necklace',`M126 297Q152 322 176 298L173 303Q152 328 129 303Z`,C.gold,153,319,'Necklace');add('pendant',star(153,326,6,4,3),C.light,153,326,'Pendant');}

 q.shades.push({d:'M52 343Q45 406  thirty 470L46 481Q60 412 67 340Z'.replace('thirty','30'),opacity:.12,color:C.navy});
 q.shades.push({d:'M248 343L270 470L255 482Q240 411 233 340Z',opacity:.12,color:C.navy});
 if(['long','braid','pony'].includes(hair)){
  detail(q,'M54 240Q65 265 60 289M78 252Q eighty 277 74 296M235 221Q226 254 236 283M250 198Q245 239 260 271'.replace('eighty','80'),1.25);
  q.shades.push({d:'M52 194Q45 239 60 279L62 296Q73 285 69 274Q55 228 64 195Z'.replace('sixty','60'),opacity:.15,color:C.navy});
 }
 detail(q,'M58 339L45 426M242 340L258 427',1.7);
 q.lines=q.lines.filter(l=>!((l.d.match(/[-+]?(?:\d*\.\d+|\d+)/g)||[]).some(n=>Number(n)>500)));
 return q;
}
function character(p,id,x,y,s,opts){place(p,figure(opts),id,x,y,s);}

function border(p,color=C.cream){r(p,'backdrop',rect(0,0,1000,1300),color,26,25,'Background',0);r(p,'frame',`M35 35H965V1265H35ZM48 48V1252H952V48Z`,C.gold,41,220,'Decorative border',1.5);}
function window(p,id,x,y,w,h,night=false){r(p,id+'-frame',rect(x,y,w,h,Math.min(w/2,120)),C.cream,x+12,y+h/2,'Window frame');r(p,id+'-glass',rect(x+17,y+17,w-34,h-34,Math.min(w/2-17,105)),night?C.night:C.sky,x+35,y+60,'Window view');r(p,id+'-bar-v',rect(x+w/2-6,y+17,12,h-34),C.gold,x+w/2,y+h/2,'Window mullion');r(p,id+'-bar-h',rect(x+17,y+h*.52,w-34,12),C.gold,x+w*.25,y+h*.52+6,'Window crossbar');if(night){r(p,id+'-moon',circle(x+w*.7,y+h*.22,28),C.cream,x+w*.7,y+h*.22,'Moon');for(let j=0;j<7;j++){const xx=x+35+(j*57)%(w-70),yy=y+60+(j*79)%(h-120);r(p,id+'-star-'+j,star(xx,yy,5,4,2),C.gold,xx,yy,'Star',1.5);}}}
function lantern(p,id,x,y,s=1,col=C.rose){r(p,id+'-cord',rect(x-2,y-50*s,4,55*s),C.gold,x,y-28*s,'Lantern cord',1.2);r(p,id+'-paper',ellipse(x,y+51*s,41*s,54*s),col,x+16*s,y+43*s,'Paper lantern');r(p,id+'-rib-left',`M${x-17*s} ${y+1*s}Q${x-43*s} ${y+51*s} ${x-17*s} ${y+103*s}L${x-11*s} ${y+103*s}Q${x-30*s} ${y+51*s} ${x-11*s} ${y+1*s}Z`,C.light,x-24*s,y+50*s,'Lantern rib',1.5);r(p,id+'-rib-right',`M${x+17*s} ${y+1*s}Q${x+43*s} ${y+51*s} ${x+17*s} ${y+103*s}L${x+11*s} ${y+103*s}Q${x+30*s} ${y+51*s} ${x+11*s} ${y+1*s}Z`,C.gold,x+24*s,y+50*s,'Lantern rib',1.5);r(p,id+'-top',rect(x-24*s,y-3*s,48*s,10*s,3*s),C.navy,x,y+2*s,'Lantern cap');r(p,id+'-bottom',rect(x-24*s,y+98*s,48*s,10*s,3*s),C.navy,x,y+103*s,'Lantern cap');r(p,id+'-tassel',`M${x-5*s} ${y+108*s}H${x+5*s}L${x+11*s} ${y+140*s}H${x-11*s}Z`,C.gold,x,y+126*s,'Lantern tassel');}
function firework(p,id,x,y,s,col){for(let j=0;j<10;j++){const a=j*Math.PI/5,dx=Math.cos(a),dy=Math.sin(a),px=-dy,py=dx;const pts=[[x+dx*s*.35-px*3,y+dy*s*.35-py*3],[x+dx*s,y+dy*s],[x+dx*s*.35+px*3,y+dy*s*.35+py*3]];r(p,id+'-'+j,poly(pts),col,x+dx*s*.6,y+dy*s*.6,'Firework ray',1.3);}r(p,id+'-core',star(x,y,11,8,5),C.gold,x,y,'Firework center',1.2);}
function buildings(p,id,y,col=C.purple){const heights=[185,257,210,310,168,232,292,200];for(let j=0;j<8;j++){let x=45+j*117,top=y-heights[j];r(p,id+'-building-'+j,rect(x,top,104,1300-top),j%2?col:C.blue,x+15,top+15,'City building');for(let k=0;k<3;k++)r(p,id+'-window-'+j+'-'+k,rect(x+20+k*24,top+28,12,29,2),C.gold,x+26+k*24,top+42,'City window',1.5);}}
function table(p,id,y,col=C.gold){r(p,id+'-top',`M40 ${y}H960V${y+31}H40Z`,col,72,y+16,'Table surface');r(p,id+'-front',rect(50,y+31,900,1300-y-31),C.cream,80,y+70,'Table front');detail(p,`M70 ${y+53}H930M70 ${y+70}H930`,1.6);}
function plant(p,id,x,y,s=1){for(let j=0;j<4;j++){let xx=x+(j-1.5)*24*s;r(p,id+'-leaf-'+j,leaf(xx,y,.6*s,j%2?1:-1),j%2?C.green:C.mint,xx+4*s,y-36*s,'Plant leaf');}r(p,id+'-pot',`M${x-55*s} ${y-6*s}H${x+55*s}L${x+42*s} ${y+78*s}Q${x} ${y+91*s} ${x-42*s} ${y+78*s}Z`,C.rose,x,y+40*s,'Plant pot');r(p,id+'-lip',rect(x-58*s,y-8*s,116*s,18*s,4*s),C.light,x,y,'Pot rim');}
function shelf(p,id,x,y,w){r(p,id+'-board',rect(x,y,w,17,3),C.gold,x+w/2,y+8,'Shelf');for(let j=0;j<5;j++){let xx=x+12+j*27,hh=52+(j%3)*14;r(p,id+'-book-'+j,rect(xx,y-hh,22,hh,2),[C.rose,C.blue,C.mint,C.lavender,C.cream][j],xx+11,y-hh/2,'Book spine');detail(p,`M${xx+4} ${y-hh+9}H${xx+18}M${xx+4} ${y-10}H${xx+18}`,1.3);}}
function cloud(p,id,x,y,s=1){r(p,id,`M${x} ${y}Q${x-24*s} ${y-35*s} ${x+10*s} ${y-49*s}Q${x+13*s} ${y-95*s} ${x+55*s} ${y-76*s}Q${x+85*s} ${y-108*s} ${x+111*s} ${y-67*s}Q${x+150*s} ${y-76*s} ${x+146*s} ${y-38*s}Q${x+177*s} ${y-29*s} ${x+160*s} ${y}Z`,C.white,x+65*s,y-31*s,'Cloud');}
function stars(p,id,positions,col=C.gold){positions.forEach(([x,y,size],j)=>r(p,id+'-'+j,star(x,y,size,4,size*.35),col,x,y,'Sparkle',1.4));}
function bunting(p,id,y){detail(p,`M50 ${y}Q500 ${y+100}950 ${y}`,2);for(let j=0;j<9;j++){let x=80+j*100,yy=y+Math.sin((x-50)/900*Math.PI)*48;r(p,id+'-'+j,poly([[x-23,yy],[x+23,yy+3],[x,yy+65]]),[C.rose,C.mint,C.gold][j%3],x,yy+23,'Bunting flag');}}
function umbrella(p,id,x,y,s=1){r(p,id+'-canopy',`M${x-175*s} ${y+30*s}Q${x-149*s} ${y-118*s} ${x} ${y-132*s}Q${x+151*s} ${y-118*s} ${x+175*s} ${y+30*s}Q${x+131*s} ${y+1*s} ${x+88*s} ${y+29*s}Q${x+43*s} ${y+1*s} ${x} ${y+29*s}Q${x-46*s} ${y+1*s} ${x-88*s} ${y+29*s}Q${x-131*s} ${y+1*s} ${x-175*s} ${y+30*s}Z`,C.rose,x-120*s,y-4*s,'Umbrella canopy');r(p,id+'-panel',`M${x} ${y-132*s}Q${x-65*s} ${y-87*s} ${x-88*s} ${y+29*s}Q${x-46*s} ${y+1*s} ${x} ${y+29*s}Q${x+43*s} ${y+1*s} ${x+88*s} ${y+29*s}Q${x+65*s} ${y-87*s} ${x} ${y-132*s}Z`,C.light,x,y-60*s,'Umbrella center');r(p,id+'-shaft',rect(x-3*s,y+29*s,6*s,320*s),C.gold,x,y+290*s,'Umbrella handle');}
function paperFish(p,id,x,y,s=1){r(p,id+'-tail',poly([[x+37*s,y],[x+96*s,y-35*s],[x+84*s,y],[x+96*s,y+35*s]]),C.rose,x+ seventy(s),y,'Fish tail');r(p,id+'-body',ellipse(x,y,61*s,35*s),C.light,x,y+15*s,'Paper fish');r(p,id+'-eye',circle(x-34*s,y-8*s,7*s),C.navy,x-34*s,y-8*s,'Fish eye');r(p,id+'-fin',poly([[x,y],[x+23*s,y+22*s],[x-7*s,y+19*s]]),C.gold,x+6*s,y+14*s,'Fish fin');for(let j=0;j<3;j++)detail(p,`M${x+(j*20-16)*s} ${y-24*s}Q${x+(j*20+1)*s} ${y} ${x+(j*20-16)*s} ${y+23*s}`,1.5);}
const seventy=s=>70*s;
function scene(p,kind,v=0){
 border(p,['night','festival','roof','stars'].includes(kind)?C.night:kind==='garden'?C.mint:C.cream);
 if(kind==='cafe'){
  window(p,'cafe-window',65,100,490,670,false);shelf(p,'cup-shelf',646,271,260);shelf(p,'upper-shelf',650,435,260);r(p,'wainscot',rect(48,847,904,405),C.light,90,903,'Café wall');detail(p,'M48 847H952M48 875H952',2.3);plant(p,'cafe-plant',855,950,1.05);
 }else if(kind==='bedroom'){
  window(p,'bedroom-window',560,88,348,497,v%2===1);r(p,'curtain-l','M548 82Q570 340 533 597L600 597Q631 367 606 82Z',C.light,576,324,'Window curtain');r(p,'curtain-r','M906 82Q880 328 920 597L851 597Q821 367 849 82Z',C.lavender,877,332,'Window curtain');shelf(p,'bedroom-books',76,330,282);r(p,'bed-headboard',rect(65,787,845,420,50),C.rose,95,859,'Headboard');r(p,'bed-pillow',rect(88,850,294,174,44),C.white,152,925,'Pillow');r(p,'bed-blanket',`M61 1045Q467 1005 940 1060V1250H61Z`,C.lavender,124,1179,'Blanket');
 }else if(kind==='garden'){
  r(p,'garden-arch',`M88 1252V436C88 57 907 52 907 436V1252H875V441C875 115 120 115 120 441V1252Z`,C.cream,103,680,'Garden arch');for(let i=0;i<5;i++){let yy=270+i*181;sprig(p,'garden-vine-l-'+i,99,yy+115,.8);sprig(p,'garden-vine-r-'+i,893,yy+95,.7);bloom(p,'garden-flower-l-'+i,100,yy,25,i%2?C.light:C.rose);bloom(p,'garden-flower-r-'+i,887,yy+37,20,C.cream);}cloud(p,'garden-cloud',266,284,1.2);r(p,'garden-path','M460 755L164 1252H862L580 755Z',C.gold,289,1134,'Garden path');
 }else if(kind==='street'||kind==='roof'){
  buildings(p,'city',654,kind==='roof'?C.purple:C.lavender);r(p,'pavement',rect(48,986,904,266),C.cream,108,1148,'Pavement');for(let j=0;j<5;j++)detail(p,`M${100+j*185} 986L${50+j*215} 1252`,1.7);if(kind==='roof'){r(p,'roof-rail',rect(48,783,904,25),C.gold,94,794,'Rooftop railing');for(let i=0;i<6;i++)r(p,'roof-post-'+i,rect(67+i*166,808,9,225),C.gold,71+i*166,929,'Railing post');r(p,'roof-moon',circle(780,185,80),C.cream,780,185,'Moon');stars(p,'roof-stars',[[103,138,11],[298,78,10],[542,197,12],[889,357,11]]);}
 }else if(kind==='festival'||kind==='night'){
  firework(p,'firework-a',182,219,131,C.rose);firework(p,'firework-b',812,293,121,C.mint);stars(p,'night-sparks',[[392,90,13],[584,231,9],[95,447,10],[919,127,12],[757,103,9]]);detail(p,'M50 102Q501 228 950 102',2.5);lantern(p,'festival-lantern-l',97,501,.83,C.rose);lantern(p,'festival-lantern-r',877,137,.83,C.gold);r(p,'festival-ground',rect(48,1104,904,149),C.purple,76,1200,'Festival path');
 }else if(kind==='library'){
  for(let j=0;j<3;j++){shelf(p,'library-left-'+j,65,235+j*262,294);shelf(p,'library-right-'+j,648,235+j*262,294);}window(p,'library-window',366,80,264,636,false);r(p,'library-floor',rect(48,1055,904,198),C.gold,82,1137,'Library floor');
 }else if(kind==='music'){
  r(p,'stage-curtain-l','M48 48H291Q260 327 91 517L48 905Z',C.rose,112,198,'Stage curtain');r(p,'stage-curtain-r','M952 48H710Q739 327 908 517L952 905Z',C.rose,888,195,'Stage curtain');r(p,'stage',rect(48,1101,904,151),C.gold,85,1180,'Stage floor');for(let j=0;j<5;j++){const x=326+j*84;r(p,'music-stem-'+j,`M${x-2} 225V138L${x+32} 127V209H${x+28}V139L${x+2} 148V225Z`,C.purple,x,172,'Music note stem',1.2);r(p,'music-note-a-'+j,ellipse(x-9,225,11,7),C.purple,x-9,225,'Music note');r(p,'music-note-b-'+j,ellipse(x+21,209,11,7),C.purple,x+21,209,'Music note');}
 }else if(kind==='train'){
  r(p,'train-wall',rect(48,48,904,1204),C.lavender,75,80,'Train interior');window(p,'train-window',87,167,821,452,false);r(p,'train-seat',rect(71,851,857,350,42),C.blue,104,1118,'Train seat');for(let j=0;j<4;j++)detail(p,`M${203+j*190} 871V1181`,2);r(p,'train-rail',rect(88,94,825,10,5),C.gold,530,99,'Handrail');for(let j=0;j<3;j++)r(p,'train-handle-'+j,`M${160+j*330} 104V137L${143+j*330} 168H${184+j*330}L${167+j*330} 137V104Z`,C.cream,164+j*330,159,'Hand strap');
 }else if(kind==='stars'){
  r(p,'celestial-disc',circle(500,401,316),C.purple,500,111,'Celestial disc');r(p,'moon-ring',`M500 119A282 282 0 1 0 500 683A282 282 0 1 0 500 119ZM500 138A263 263 0 1 1 500 664A263 263 0 1 1 500 138Z`,C.gold,227,399,'Celestial ring');stars(p,'constellation',[[102,137,14],[820,126,19],[876,654,17],[135,742,19],[851,932,13],[744,1126,16],[139,1112,14]]);cloud(p,'star-cloud-l',52,986,.94);cloud(p,'star-cloud-r',753,849,.93);
 }else{
  window(p,'studio-window',70,107,376,589,false);shelf(p,'studio-shelf',637,229,267);r(p,'studio-rug',ellipse(515,1135,387,100),C.light,268,1161,'Round rug');plant(p,'studio-plant',838,970,1.14);
 }
}
const thirty=s=>30*s;
function butterflies(p,id,poses){poses.forEach(([x,y,s],i)=>{r(p,`${id}-${i}-wing-l`,`M${x} ${y}C${x-52*s} ${y-76*s} ${x-78*s} ${y-6*s} ${x-18*s} ${y+11*s}C${x-58*s} ${y+59*s} ${x-4*s} ${y+62*s} ${x} ${y}Z`,C.lavender,x-23*s,y-17*s,'Butterfly wing');r(p,`${id}-${i}-wing-r`,`M${x} ${y}C${x+52*s} ${y-76*s} ${x+78*s} ${y-6*s} ${x+18*s} ${y+11*s}C${x+58*s} ${y+59*s} ${x+4*s} ${y+62*s} ${x} ${y}Z`,C.light,x+23*s,y-17*s,'Butterfly wing');r(p,`${id}-${i}-body`,ellipse(x,y,3*s,16*s),C.navy,x,y,'Butterfly body');detail(p,`M${x} ${y-14*s}Q${x-8*s} ${y-31*s} ${x-14*s} ${y-25*s}M${x} ${y-14*s}Q${x+8*s} ${y-31*s} ${x+14*s} ${y-25*s}`,1.3);});}
function foreground(p,kind,v=0){
 if(kind==='cafe'){table(p,'cafe-table',1072);mug(p,'table-tea',110,1115,1.3,C.rose);r(p,'cake-plate',ellipse(756,1196,108,26),C.white,821,1200,'Cake plate');r(p,'cake','M682 1190V1137Q751 1105 821 1137V1190Z',C.light,743,1164,'Cake');r(p,'cake-frosting','M682 1137Q751 1105 821 1137L818 1158L800 1149L780 1162L756 1153L733 1166L710 1152L684 1161Z',C.white,751,1138,'Cake frosting');r(p,'strawberry',`M741 1127Q721 1099 740 1093Q751 1089 762 1093Q784 1099 761 1127Z`,C.rose,751,1110,'Strawberry');}
 if(kind==='garden'){plant(p,'foreground-plant',143,1114,.8);bloom(p,'foreground-flower-a',169,1022,34,C.rose);bloom(p,'foreground-flower-b',113,1039,26,C.light);butterflies(p,'garden-butterfly',[[236,340,.65],[792,602,.53]]);}
 if(kind==='library'){table(p,'library-table',1110);book(p,'table-book',111,1144,.9,C.blue);mug(p,'reading-tea',774,1151,.75,C.mint);}
 if(kind==='bedroom'){r(p,'cushion',rect(97,1121,212,118,32),C.cream,196,1192,'Cushion');r(p,'cushion-star',star(203,1183,34,5,16),C.gold,203,1183,'Cushion motif');}
 if(kind==='studio'){table(p,'studio-table',1119);r(p,'paint-jar',rect(124,1151, seventy(1),81,8),C.mint,157,1199,'Brush pot');for(let j=0;j<3;j++){let x=133+j*19;r(p,'brush-handle-'+j,rect(x,1089,7,81,2),C.gold,x+3,1138,'Paintbrush');r(p,'brush-tip-'+j,`M${x} 1091Q${x-6} 1075 ${x+3} 1064Q${x+13} 1078 ${x+7} 1091Z`,C.purple,x+3,1080,'Brush tip');}r(p,'watercolor-box',rect(712,1151,196,74,9),C.white,723,1190,'Watercolor box');for(let j=0;j<6;j++)r(p,'paint-pan-'+j,rect(725+j*29,1165,20,45,4),[C.rose,C.gold,C.mint,C.blue,C.purple,C.navy][j],735+j*29,1187,'Watercolor pan');}
}

const mangaConcepts=[
 ['Astral Academy','stars','f','long','cape','book','A celestial scholar opens a field guide beneath a luminous astronomical ring.'],
 ['Rooftop Promise','roof','m','spiky','hoodie','rest','An optimistic courier and the quiet city beneath an evening moon.'],
 ['The Library Detectives','library','duo','short','detective','book','Two apprentice detectives compare notes between shelves of stories.'],
 ['Melody Partners','music','duo','bob','uniform','rest','A pair of young performers share a velvet-curtained stage.'],
 ['Garden Guardian','garden','m','long','cape','flower','A gentle guardian carries a blossom through an overgrown archway.'],
 ['Last Train Home','train','f','bob','coat','letter','A traveler treasures a letter on the last train of the evening.'],
 ['The Sketchbook Club','studio','duo','pony','apron','book','Two illustration students gather beside a tray of watercolors.'],
 ['Lantern Messenger','festival','m','braid','cape','letter','A messenger pauses under hanging lanterns and summer fireworks.'],
 ['Café of Small Mysteries','cafe','m','short','detective','cup','An observant young detective enjoys tea in a quiet neighborhood café.'],
 ['Bookshop Best Friends','street','duo','long','uniform','book','Two friends trade favorite stories on a pastel city street.']
];
const romanceConcepts=[
 ['Tea for Two','cafe','cup','bob','uniform','Two friends discover a tiny café and a shared love of strawberry cake.'],
 ['Blossoms Between Us','garden','flower','long','dress','A gift of garden flowers on a sunlit afternoon.'],
 ['Moonlit Confidants','roof','letter','short','hoodie','A thoughtful pair share letters above the evening city.'],
 ['Our Favorite Chapter','library','book','braid','coat','Companions read an illustrated story together in a warm library.'],
 ['Encore Together','music','flower','pony','dress','Two performers celebrate a small recital with a bouquet.'],
 ['Stars on the Platform','train','rest','bob','hoodie','Travel companions sit close beneath a line of train windows.'],
 ['Studio Sunday','studio','book','short','apron','A creative couple spend a quiet Sunday painting together.'],
 ['Summer Festival Letter','festival','letter','long','kimono','A shy exchange of letters beneath a summer sky.'],
 ['The Butterfly Garden','garden','rest','pony','uniform','Friends meet again in a garden alive with butterflies.'],
 ['Sleepover Stories','bedroom','book','braid','hoodie','Two friends settle in with a storybook and soft cushions.']
];
const festivalConcepts=[
 ['Peony Lanterns','festival','f','long','fan','An elegant summer kimono, flower motifs, and warmly glowing lanterns.'],
 ['Midnight Goldfish','night','m','short','rest','A young festivalgoer beneath playful paper fish decorations.'],
 ['Firework Duet','festival','duo','braid','fan','Coordinated kimono and two friends watching the festival fireworks.'],
 ['Garden of Paper Wishes','garden','f','bob','letter','A flower-lined shrine garden and a handwritten summer wish.'],
 ['Lantern Keeper','night','m','long','rest','A gentle lantern keeper in a richly folded summer robe.'],
 ['Parasol Promenade','street','f','pony','flower','A patterned kimono and a rose-colored parasol on a bright city walk.'],
 ['Festival Tea House','cafe','f','braid','cup','A quiet cup of festival tea before the evening celebration.'],
 ['Fireflies and Friends','festival','duo','short','letter','Two companions wear coordinated traditional festival outfits.'],
 ['Moonflower Evening','stars','f','long','flower','A moonflower bouquet and a golden celestial evening.'],
 ['Paper Cranes at Dawn','garden','m','spiky','fan','A celebratory morning with paper ornaments and a folding fan.']
];
const cozyConcepts=[
 ['Rainy Day Matcha','cafe','f','bob','apron','cup','A calm afternoon with matcha, cake and an arched café window.'],
 ['Greenhouse Letters','garden','m','short','hoodie','letter','A quiet reader surrounded by potted plants and flowering vines.'],
 ['Midnight Reading Nook','bedroom','f','braid','hoodie','book','A starlit bedroom and a book too wonderful to put down.'],
 ['Watercolor Morning','studio','f','pony','apron','rest','An artist prepares brushes and watercolors for a peaceful morning.'],
 ['Neighborhood Bookseller','library','m','long','coat','book','A thoughtful bookseller welcomes readers to a warm little shop.'],
 ['Window Seat Reverie','train','f','short','uniform','cup','A daydreaming traveler watches the world from a train window.'],
 ['Balcony Botanist','roof','m','bob','hoodie','flower','A city gardener admires a delicate blossom above the rooftops.'],
 ['The Strawberry Baker','cafe','f','long','apron','rest','A baker presents a strawberry cake in a friendly neighborhood café.'],
 ['Postcards on Sunday','bedroom','m','short','hoodie','letter','A relaxed morning spent writing postcards beside a bright window.'],
 ['Little City Flower Shop','street','f','braid','dress','flower','A florist carries fresh blooms through a pastel neighborhood.']
];
function decorateConcept(p,group,i){
 if(group==='festival'){
  if(i===1||i===9){paperFish(p,'paper-fish-a',210,440,.9);paperFish(p,'paper-fish-b',788,721,.7);}
  if(i===4){lantern(p,'held-large-lantern',776,815,1.32,C.light);}
  if(i===5)umbrella(p,'parasol',546,279,1.85);
  if(i===3){detail(p,'M164 332Q493 401 838 332',2);for(let j=0;j<5;j++){const x=210+j*150;r(p,'wish-tag-'+j,rect(x,355,39,81,4),j%2?C.light:C.gold,x+20,390,'Wish tag');detail(p,`M${x+19} 355V336`,1.4);}}
  if(i===9)for(let j=0;j<3;j++){const x=193+j*312,y=179+(j%2)*103;r(p,'paper-crane-'+j,poly([[x-53,y-15],[x-17,y+11],[x-15,y-44],[x+9,y-2],[x+51,y-31],[x+20,y+17],[x+49,y+33],[x+1,y+17],[x-37,y+44],[x-22,y+11]]),C.cream,x,y+6,'Paper crane');}
 }
 if(group==='manga'&&i===1){r(p,'courier-scarf-tail','M526 760Q682 708 799 734Q874 751 850 841L826 815L803 832Q833 755 657 793L538 802Z',C.rose,753,765,'Flowing scarf');r(p,'courier-scarf','M435 750Q481 775 530 750L541 781Q481 808 432 779Z',C.rose,481,779,'Scarf wrap');}
 if(group==='cozy'&&i===6){plant(p,'balcony-plant-left',146,1167,.83);plant(p,'balcony-plant-right',845,1180,.96);}
 if(group==='cozy'&&i===9){plant(p,'flower-shop-left',153,1155,.85);bloom(p,'florist-a',139,1060,32,C.light);bloom(p,'florist-b',181,1083,29,C.rose);plant(p,'flower-shop-right',846,1111,.77);bloom(p,'florist-c',835,1021,29,C.lavender);}
}
export function generatePages(){
 const pages=[];
 for(let i=0;i<10;i++){
  const [title,kind,sex,hair,outfit,pose,description]=mangaConcepts[i];
  const p=makePage(`manga-${String(i+1).padStart(2,'0')}`,title,'Manga & duos',sex==='duo'||['garden','festival'].includes(kind)?'Hard':'Medium',['manga',kind,outfit,sex==='duo'?'friends':sex==='m'?'male':'female',hair],[],description);
  scene(p,kind,i);p.lines=[];
  if(sex==='duo'){character(p,'lead',91,382,1.36,{sex:'f',hair,outfit,pose,v:i});character(p,'companion',526,326,1.43,{sex:'m',hair:['short','spiky','long'][i%3],outfit:i===3?'coat':outfit,pose:i===2?'letter':'rest',v:i+3});}
  else character(p,'lead',242,286,1.57,{sex,hair,outfit,pose,v:i});
  decorateConcept(p,'manga',i);foreground(p,kind,i);pages.push(p);
 }
 for(let i=0;i<10;i++){
  const [title,kind,pose,hair,outfit,description]=romanceConcepts[i];
  const p=makePage(`romance-${String(i+1).padStart(2,'0')}`,title,'Romance & friendship','Hard',['romance','friendship','duo',kind,outfit,'male','female'],[],description);
  scene(p,kind,i);p.lines=[];
  const stagger=i%3,leadX=stagger===0?71:stagger===1?111:91,leadY=stagger===2?337:392;
  character(p,'friend-a',leadX,leadY,1.40,{sex:'f',hair,outfit,pose,v:i+1});
  character(p,'friend-b',stagger===1?504:526,stagger===0?356:314,1.45,{sex:i===8||i===9?'f':'m',hair:i===8?'bob':i===9?'long':['short','spiky','bob'][i%3],outfit,pose:i%3===1?'flower':i%3===2?'book':'rest',v:i+4});
  foreground(p,kind,i);if(i===2)stars(p,'shared-stars',[[428,185,15],[596,129,10],[345,291,9]],C.light);pages.push(p);
 }
 for(let i=0;i<10;i++){
  const [title,kind,sex,hair,pose,description]=festivalConcepts[i];
  const p=makePage(`festival-${String(i+1).padStart(2,'0')}`,title,'Festivals','Hard',['festival','kimono','summer',kind,hair,sex==='duo'?'friends':sex==='m'?'male':'female'],[],description);
  scene(p,kind,i);p.lines=[];decorateConcept(p,'festival',i);
  if(sex==='duo'){character(p,'guest-a',86,373,1.40,{sex:'f',hair,outfit:'kimono',pose,v:i+2});character(p,'guest-b',526,319,1.46,{sex:'m',hair:i===2?'short':'long',outfit:'kimono',pose:'rest',v:i+5});}
  else character(p,'guest',i===5?220:248,i===5?371:286,i===5?1.40:1.55,{sex,hair,outfit:'kimono',pose,v:i+2});
  foreground(p,kind,i);pages.push(p);
 }
 for(let i=0;i<10;i++){
  const [title,kind,sex,hair,outfit,pose,description]=cozyConcepts[i];
  const p=makePage(`cozy-${String(i+1).padStart(2,'0')}`,title,'Cozy scenes',kind==='garden'||kind==='roof'?'Hard':'Medium',['cozy',kind,outfit,hair,sex==='m'?'male':'female'],[],description);
  scene(p,kind,i);p.lines=[];character(p,'resident',i===4?301:i===3?199:253,i===2?340:286,i===2?1.45:1.55,{sex,hair,outfit,pose,v:i+3});foreground(p,kind,i);decorateConcept(p,'cozy',i);pages.push(p);
 }
 return pages;
}
