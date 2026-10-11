import {makePage,region,line,ellipse,circle,rect,poly,star,leaf,flower} from './helpers.mjs';

// Original, editable Bézier drawings. Head, hair, eyes and costume are drawn as
// separate closed colour regions; only expressive ink accents are open paths.
const concepts = [
 ['portrait-moonflower','Moonflower Reverie','Anime portraits','Hard','f','long','sailor','flowers',-5,'lavender'],
 ['portrait-paper-cranes','The Paper Crane Poet','Anime portraits','Medium','m','swept','scholar','cranes',6,'ink'],
 ['portrait-rosewater','Rosewater Sonata','Anime portraits','Hard','f','wave','ribbon','roses',5,'rose'],
 ['portrait-autumn-letter','An Autumn Letter','Anime portraits','Medium','m','short','cardigan','leaves',-6,'autumn'],
 ['portrait-butterfly-glass','Butterfly Glass','Anime portraits','Hard','f','braid','lace','butterflies',3,'mint'],
 ['portrait-rain-listener','The Rain Listener','Anime portraits','Medium','m','swept','coat','rain',8,'blue'],
 ['portrait-sunlit-freckles','Sunlit Freckles','Anime portraits','Hard','f','bob','ribbon','daisies',-7,'peach'],
 ['portrait-vinyl-dream','Vinyl Daydream','Anime portraits','Hard','m','wave','jacket','music',-3,'teal'],
 ['portrait-sakura-ink','Sakura and Ink','Anime portraits','Hard','f','updo','kimono','sakura',6,'sakura'],
 ['portrait-winter-velvet','Winter Velvet','Anime portraits','Medium','m','short','coat','snow',-5,'winter'],
 ['fantasy-star-cartographer','The Star Cartographer','Fantasy','Hard','f','long','mage','stars',-4,'lavender'],
 ['fantasy-dragon-envoy','Dragonfall Envoy','Fantasy','Hard','m','spiky','armor','dragon',5,'ember'],
 ['fantasy-petal-oracle','Petal Oracle','Fantasy','Hard','f','updo','lace','flowers',7,'mint'],
 ['fantasy-tide-singer','Tideglass Singer','Fantasy','Hard','m','wave','mage','ocean',-6,'blue'],
 ['fantasy-crescent-knight','The Crescent Knight','Fantasy','Hard','f','ponytail','armor','moon',-7,'winter'],
 ['fantasy-amber-alchemist','Amber Alchemist','Fantasy','Hard','m','swept','scholar','alchemy',4,'autumn'],
 ['fantasy-lantern-keeper','Lantern Keeper','Fantasy','Hard','f','braid','kimono','lanterns',-3,'peach'],
 ['fantasy-thorn-prince','The Thorn Prince','Fantasy','Hard','m','long','coat','roses',6,'ink'],
 ['fantasy-cloud-courier','Cloud Couriers','Fantasy','Hard','f','twintails','sailor','clouds',4,'sakura'],
 ['fantasy-crystal-archivist','Crystal Archivist','Fantasy','Hard','m','short','scholar','crystals',-5,'teal'],
 ['street-neon-drifter','Neon Drifter','Streetwear','Hard','f','ponytail','jacket','city',-7,'neon'],
 ['street-rooftop-radio','Rooftop Radio','Streetwear','Medium','m','spiky','hoodie','radio',5,'teal'],
 ['street-cherry-static','Cherry Static','Streetwear','Hard','f','bob','tech','pixels',6,'sakura'],
 ['street-midnight-skater','Midnight Skater','Streetwear','Medium','m','swept','jacket','skate',-5,'ember'],
 ['street-pastel-orbit','Pastel Orbit','Streetwear','Hard','f','twintails','hoodie','planets',-4,'lavender'],
 ['street-golden-hour','Golden Hour Rider','Streetwear','Hard','m','short','tech','sunset',7,'autumn'],
 ['street-arcade-angel','Arcade Angel','Streetwear','Hard','f','braid','jacket','arcade',5,'mint'],
 ['street-blue-frequency','Blue Frequency','Streetwear','Medium','m','wave','hoodie','radio',-6,'blue'],
 ['street-pixel-punk','Pixel Punk','Streetwear','Hard','f','spiky','tech','pixels',-3,'neon'],
 ['street-rain-circuit','Rain Circuit','Streetwear','Hard','m','ponytail','coat','rain',4,'ink'],
];
const colorways={
 lavender:['#F5F0FC','#E2D5F4','#7468AE','#AEA4E0','#39345E','#FFDAD0','#D9949A','#FAF5FF','#F3BDDB','#CFB474','#7363AD'],
 ink:['#F1EDE8','#CCD7D4','#31464C','#647B80','#223139','#EBC4AF','#BA8577','#F6F1DE','#AD6A75','#BCA16D','#629BA5'],
 rose:['#FFF1F1','#F0D7E1','#9A526D','#D88AA1','#523044','#FFDDC9','#DC9D90','#FFF8E8','#E9B8CD','#CEAB63','#7E9C8C'],
 autumn:['#FFF4DD','#ECD6AD','#854E39','#B98058','#4B3431','#EBC5A7','#BD886D','#FFF7E3','#759185','#D89B48','#838257'],
 mint:['#EFFAF3','#C8E5D8','#507B73','#91B5A5','#294B50','#F8DBC8','#CC9B87','#FFFEF0','#C0AFDC','#D2B676','#75A898'],
 blue:['#EFF5FD','#CDDEED','#335784','#7A9BC8','#293851','#E4C2AA','#B98678','#F8FAFF','#93BAC7','#D0B580','#62A9BC'],
 peach:['#FFF6E9','#F4D8C0','#B77869','#E6AA8C','#704D54','#FFDCC4','#CC9A88','#FFFDF0','#ADC3A0','#E2BB65','#D39385'],
 teal:['#EDF9F6','#BFDDD8','#306C6D','#73B0A9','#253E49','#DCAA8B','#A67467','#F6FAE8','#D5A2AF','#D9B270','#4DA4A4'],
 sakura:['#FFF3F5','#F1D2E0','#925C80','#C69ABD','#48354F','#FFDDC9','#CB9692','#FFFEF3','#8BA998','#E1B77A','#B883B5'],
 winter:['#F1F6FA','#D4E3EB','#536B87','#A4B6C8','#313E57','#F4DACA','#D1A392','#FEFEFF','#B79DBF','#D5BB87','#75A9C2'],
 ember:['#FDF0E7','#E4CABB','#6E3D40','#A8675D','#332E3F','#DBAB91','#A67468','#FFF4DC','#529092','#D5A14F','#DE8B5E'],
 neon:['#F3EDFC','#DBCEED','#544A84','#A38EBD','#2D2D4A','#EBC3B0','#B8857D','#FAF8FF','#73BEB8','#E9AD91','#B674A4'],
};
function transform(d,tilt=0,dx=0,dy=0,scale=1){const a=tilt*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return d.replace(/([MLQC])([^MLQCZ]*)/g,(_,cmd,nums)=>{const v=nums.trim().split(/[ ,]+/).filter(Boolean).map(Number);return cmd+v.map((n,i)=>{if(i%2)return null;const x=(n-500)*scale,y=(v[i+1]-640)*scale;return `${(500+x*c-y*s+dx).toFixed(1)} ${(640+x*s+y*c+dy).toFixed(1)}`;}).filter(v=>v!==null).join(' ')});}
function ep(x,y,rx,ry){const k=.5522848;return `M${x-rx} ${y} C${x-rx} ${y-ry*k} ${x-rx*k} ${y-ry} ${x} ${y-ry} C${x+rx*k} ${y-ry} ${x+rx} ${y-ry*k} ${x+rx} ${y} C${x+rx} ${y+ry*k} ${x+rx*k} ${y+ry} ${x} ${y+ry} C${x-rx*k} ${y+ry} ${x-rx} ${y+ry*k} ${x-rx} ${y}Z`;}
function point(x,y,tilt,dx=0){const a=tilt*Math.PI/180;return [500+(x-500)*Math.cos(a)-(y-640)*Math.sin(a)+dx,640+(x-500)*Math.sin(a)+(y-640)*Math.cos(a)];}
function background(p,o,c,index){
 region(p,'paper',rect(0,0,1000,1300),c[0],[35,650],'Paper background',0);
 region(p,'arch',`M115 1215 L115 510 C115 65 885 65 885 510 L885 1215 Z`,c[1],[150,600],'Illustrated arch',2.2);
 region(p,'inner-arch',`M150 1220 L150 510 C150 119 850 119 850 510 L850 1220 Z`,c[0],[500,170],'Inner arch',1.5);
 const motif=o[7];
 // Distinct compositions, drawn behind the character so their margins stay visible.
 if(['city','rain','radio','pixels','arcade','skate','sunset'].includes(motif)){
  for(let i=0;i<5;i++){const x=95+i*171,y=400+((i*173+index*29)%250);region(p,`skyline-${i}`,rect(x,y,132,800),i%2?c[1]:c[3],[x+18,y+22],'Distant city building',2);for(let j=0;j<3;j++)region(p,`window-${i}-${j}`,rect(x+17+j*34,y+35,18,60,4),c[7],[x+26+j*34,y+62],'City window',1.5);}
  if(motif==='sunset'){region(p,'setting-sun',circle(790,360,90),c[9],[790,360],'Setting sun');for(let i=0;i<4;i++)line(p,`M700 ${355+i*20} L880 ${355+i*20}`,2,c[0]);}
  if(motif==='rain')for(let i=0;i<12;i++){const x=80+(i%2)*810+(i%3)*8,y=235+i*77;region(p,`raindrop-${i}`,`M${x} ${y} Q${x-23} ${y+45} ${x} ${y+56} Q${x+24} ${y+42} ${x} ${y}Z`,c[8],[x,y+37],'Rain drop',1.5);}
  if(motif==='pixels'||motif==='arcade')for(let i=0;i<12;i++){const x=i%2?840:80,y=220+i*70;region(p,`arcade-pixel-${i}`,poly([[x,y],[x+22,y],[x+22,y+14],[x+36,y+14],[x+36,y+36],[x+14,y+36],[x+14,y+22],[x,y+22]]),i%2?c[8]:c[9],[x+17,y+17],'Arcade pixel',1.8);}
 }
 if(['stars','moon','planets','crystals','alchemy','dragon'].includes(motif)){
  region(p,'celestial-disc',circle(500,400,285),c[1],[500,126],'Celestial disc',2);
  if(motif==='moon')region(p,'crescent',`M780 192 C604 205 648 426 811 386 C733 501 551 409 597 281 C626 218 703 184 780 192Z`,c[9],[628,282],'Crescent moon');
  for(let i=0;i<(o[3]==='Hard'?16:8);i++){const side=i%2?1:-1,x=500+side*(340+((i*21)%45)),y=140+(i*83)%930;region(p,`celestial-${i}`,motif==='crystals'?poly([[x,y-35],[x+18,y],[x,y+40],[x-17,y]]):star(x,y,12+i%3*5,4,.32*(12+i%3*5)),i%3?c[9]:c[8],[x,y],motif==='crystals'?'Floating crystal':'Little star',1.6);}
  if(motif==='alchemy'){for(const [x,y] of [[178,450],[850,785]]){region(p,`orbit-${x}`,circle(x,y,65),c[3],[x,y-48],'Alchemical orbit');region(p,`orbit-core-${x}`,circle(x,y,38),c[0],[x,y],'Orbit center');}}
 }
 if(['flowers','roses','daisies','sakura','leaves','butterflies'].includes(motif)){
  for(let i=0;i<6;i++){const x=i%2?865:130,y=290+i*145;line(p,`M${x} ${y+180} Q${x+(i%2?-80:80)} ${y+50} ${x} ${y-60}`,2.5,c[2]);region(p,`botanical-leaf-${i}`,leaf(x,y,.53,i%2?-1:1),c[8],[x+(i%2?-1:1)*5,y-37],'Botanical leaf',1.7);if(motif==='leaves')region(p,`autumn-leaf-${i}`,leaf(x+(i%2?-32:32),y-40,.4,i%2?1:-1),c[9],[x+(i%2?-32:32),y-70],'Autumn leaf',1.7);else if(motif!=='butterflies')flower(p,`border-bloom-${i}`,x+(i%2?-12:12),y-80,motif==='daisies'?27:35,[motif==='daisies'?c[7]:c[8],c[9]],motif==='daisies'?8:5);}
 }
 if(['lanterns','clouds','snow','ocean','cranes','music'].includes(motif)){
  for(let i=0;i<6;i++){const x=i%2?848:148,y=260+i*146;
   if(motif==='lanterns'){line(p,`M${x} ${y-100} L${x} ${y-55}`,2);region(p,`lantern-${i}`,ep(x,y,43,57),c[8],[x,y],'Paper lantern');region(p,`lantern-cap-${i}`,rect(x-24,y-63,48,13,3),c[9],[x,y-56],'Lantern cap');line(p,`M${x-17} ${y-51} Q${x-34} ${y} ${x-17} ${y+51} M${x+17} ${y-51} Q${x+34} ${y} ${x+17} ${y+51}`,1.2);}
   if(motif==='snow'){region(p,`snowflake-${i}`,star(x,y,29,6,12),c[7],[x,y],'Snow crystal',1.5);}
   if(motif==='clouds'||motif==='ocean'){region(p,`cloud-${i}`,`M${x-62} ${y+17} C${x-93} ${y-18} ${x-56} ${y-46} ${x-31} ${y-27} C${x-10} ${y-84} ${x+57} ${y-72} ${x+53} ${y-23} C${x+104} ${y-39} ${x+111} ${y+29} ${x+61} ${y+25} L${x-62} ${y+17}Z`,c[7],[x,y],'Cloud bank',2);}
   if(motif==='cranes'){region(p,`crane-wing-${i}`,poly([[x-54,y+12],[x-37,y-42],[x+8,y+4],[x+66,y-12],[x+17,y+40]]),c[7],[x-22,y],'Origami crane wing');region(p,`crane-fold-${i}`,poly([[x+8,y+4],[x+24,y-42],[x+42,y-47],[x+30,y-34],[x+26,y+20],[x+17,y+40]]),c[8],[x+22,y+2],'Origami crane fold');}
   if(motif==='music'){region(p,`note-${i}`,`M${x-6} ${y-45} L${x+26} ${y-33} L${x+26} ${y-12} L${x+4} ${y-23} L${x+4} ${y+29} C${x+2} ${y+53} ${x-39} ${y+48} ${x-31} ${y+27} C${x-26} ${y+15} ${x-14} ${y+12} ${x-6} ${y+18}Z`,c[8],[x-10,y+30],'Musical note');}
  }
 }
}
function hairBack(p,o,c,add){
 const h=o[5];
 const back={
 long:'M322 829 C203 935 144 1104 240 1266 C115 1174 124 968 242 783 C197 608 194 393 311 294 C408 172 618 154 720 307 C851 466 781 690 793 827 C805 1007 928 1127 813 1290 C848 1122 678 1065 682 899 L322 829Z',
 wave:'M308 824 C176 848 273 937 191 1002 C121 1075 229 1153 171 1260 C301 1229 352 1134 315 1054 C298 1002 398 992 341 906 L659 876 C738 1006 636 1057 717 1142 C781 1208 747 1280 812 1293 C916 1213 843 1146 870 1070 C902 972 805 927 813 840 C909 567 788 285 648 241 C430 136 202 355 221 560 C191 702 252 729 308 824Z',
 bob:'M267 742 C215 529 245 339 350 276 C507 169 702 217 758 363 C822 485 823 717 778 903 C727 931 682 906 639 862 L357 863 C330 911 282 917 225 888 L267 742Z',
 braid:'M282 760 C203 576 248 344 357 276 C504 171 681 233 750 372 C816 504 795 666 730 806 L282 760Z',
 short:'M282 643 L237 583 L259 505 L226 463 L295 405 L283 341 L352 313 L369 258 L430 270 L488 230 L564 245 L612 214 L635 269 L704 289 L717 350 L770 385 L756 456 L790 499 L757 622 L691 746 L306 737Z',
 spiky:'M273 647 L219 596 L251 524 L202 486 L259 426 L227 389 L311 365 L291 292 L378 308 L380 225 L439 267 L499 195 L519 259 L613 206 L600 278 L706 260 L679 327 L776 339 L739 399 L811 468 L754 504 L786 570 L721 734 L299 738Z',
 swept:'M270 678 C184 541 236 401 300 348 L286 287 L376 298 L392 239 L489 260 C642 211 753 297 773 427 L817 477 L759 506 L763 644 L704 766 L315 761Z',
 ponytail:'M272 746 C216 561 244 379 346 292 C485 183 645 236 704 320 C804 271 879 324 856 429 C895 567 822 668 879 818 C919 941 808 1059 868 1153 C736 1092 725 986 765 886 C669 750 789 681 736 542 L272 746Z',
 twintails:'M326 330 C188 230 124 406 189 564 C127 712 133 891 216 1029 C158 1122 160 1203 234 1262 C282 1137 362 1096 304 952 C362 806 288 649 325 553 L664 554 C710 685 645 850 714 976 C658 1110 717 1200 816 1288 C794 1142 862 1082 803 985 C907 822 890 704 817 573 C901 401 814 214 677 326 C558 185 399 220 326 330Z',
 updo:'M292 708 C228 551 250 370 348 297 C281 251 299 155 386 147 C424 57 552 112 558 164 C651 106 749 189 697 292 C797 384 824 602 732 728 L292 708Z',
 };
 add('hair-silhouette',back[h]||back.long,c[2],[290,470],'Hair silhouette');
 // Real separated ribbons of hair, contouring the back silhouette.
 if(['long','wave','twintails','ponytail'].includes(h)){
  for(let i=0;i<3;i++){const x=247+i*27;add(`back-lock-left-${i}`,`M${x} 661 C${x-75} 853 ${x+80} 1033 ${x-27} 1224 C${x+56} 1168 ${x+119} 1071 ${x+58} 940 C${x-10} 832 ${x+40} 724 ${x+17} 647Z`,i===1?c[3]:c[2],[x+26,1010],'Flowing hair ribbon',2);}
  for(let i=0;i<3;i++){const x=733+i*28;add(`back-lock-right-${i}`,`M${x} 661 C${x+91} 826 ${x-64} 985 ${x+46} 1247 C${x-55} 1185 ${x-88} 1073 ${x-43} 941 C${x+10} 822 ${x-42} 728 ${x-18} 647Z`,i===1?c[3]:c[2],[x-18,1030],'Flowing hair ribbon',2);}
 }
 if(h==='updo'){
  add('bun-loop-left','M374 283 C252 242 338 115 412 167 C363 176 345 225 374 283Z',c[3],[337,214],'Twisted bun');
  add('bun-loop-right','M554 286 C688 198 708 252 661 293 C727 202 654 147 591 198 C622 226 590 266 554 286Z',c[3],[637,201],'Twisted bun');
 }
}
function costume(p,o,c){
 const style=o[6],female=o[4]==='f';
 const shoulder=female?178:148;
 region(p,'garment-base',`M${shoulder} 1298 L${shoulder+30} 1050 Q${shoulder+58} 966 367 931 L433 894 L570 894 L639 936 Q${844-shoulder/8} 972 ${967-shoulder} 1057 L${1012-shoulder} 1298Z`,c[2],[350,1190],'Main garment',3.3);
 region(p,'neck','M426 779 Q429 850 417 896 L365 938 Q488 1041 640 938 L575 894 L574 780Z',c[5],[500,897],'Neck');
 region(p,'neck-shadow','M425 792 Q509 856 575 793 L574 848 Q498 903 429 863Z',c[6],[505,851],'Neck shadow',1);
 if(['sailor','ribbon'].includes(style)){
  region(p,'shirt-front','M388 929 L500 1010 L610 929 L672 1298 L330 1298Z',c[7],[501,1230],'Blouse');
  region(p,'collar-left','M371 929 L298 972 L432 1109 L501 1010Z',c[8],[394,1004],'Left collar');
  region(p,'collar-right','M620 928 L696 974 L565 1107 L501 1010Z',c[8],[613,1003],'Right collar');
  line(p,'M320 977 L434 1091 L482 1017 M674 979 L563 1089 L520 1017',2,c[7]);
  region(p,'ribbon-left','M496 1048 C449 1007 405 1017 401 1063 L413 1115 Q459 1111 496 1077Z',c[3],[445,1067],'Bow left loop');
  region(p,'ribbon-right','M504 1048 C555 1000 603 1029 600 1070 L585 1119 Q549 1104 504 1078Z',c[3],[556,1068],'Bow right loop');
  region(p,'ribbon-tail-left','M487 1074 L451 1202 L486 1182 L513 1203 L510 1079Z',c[8],[482,1150],'Ribbon tail');
  region(p,'ribbon-tail-right','M505 1082 L544 1183 L568 1171 L589 1183 L529 1061Z',c[8],[550,1140],'Ribbon tail');
  region(p,'ribbon-knot',ep(503,1067,21,26),c[9],[503,1067],'Bow knot');
 }else if(style==='kimono'){
  region(p,'kimono-left','M369 932 L501 1029 L568 1298 L448 1298 L291 967Z',c[7],[445,1080],'Overlapping kimono collar');
  region(p,'kimono-right','M632 932 L690 965 L456 1298 L342 1298 L515 1044Z',c[8],[533,1112],'Kimono collar');
  region(p,'obi','M260 1190 Q500 1149 739 1190 L765 1298 L240 1298Z',c[3],[660,1240],'Obi sash');
  region(p,'obi-cord','M256 1228 Q500 1189 748 1228 L750 1243 Q500 1204 252 1243Z',c[9],[500,1218],'Obi cord',1.6);
  for(let i=0;i<4;i++)flower(p,`kimono-flower-${i}`,i%2?706:280,1030+Math.floor(i/2)*100,26,[c[8],c[9]],5);
 }else if(style==='armor'){
  region(p,'armor-chest','M369 930 L500 1004 L630 932 L677 1218 L503 1298 L324 1218Z',c[3],[502,1154],'Breastplate');
  region(p,'armor-panel-left','M369 967 L477 1039 L447 1223 L362 1171Z',c[1],[410,1100],'Etched armor panel');
  region(p,'armor-panel-right','M629 967 L524 1039 L552 1223 L640 1171Z',c[1],[590,1100],'Etched armor panel');
  region(p,'pauldron-left','M331 934 Q221 943 184 1046 L211 1111 L350 1048 L369 972Z',c[3],[268,1010],'Left shoulder armor');
  region(p,'pauldron-right','M672 934 Q779 945 817 1050 L786 1112 L652 1048 L633 972Z',c[3],[735,1010],'Right shoulder armor');
  for(let i=0;i<3;i++){line(p,`M${213+i*25} ${1058-i*12} L${318+i*10} ${1002-i*14}`,2);line(p,`M${787-i*25} ${1058-i*12} L${682-i*10} ${1002-i*14}`,2);}
  region(p,'armor-gem',poly([[500,1020],[535,1060],[500,1101],[465,1060]]),c[8],[500,1060],'Chest gemstone');
  region(p,'gorget','M412 907 Q500 978 590 907 L615 940 Q502 1012 388 941Z',c[9],[503,969],'Gold gorget');
 }else if(style==='hoodie'){
  region(p,'hood-left','M421 900 Q324 895 317 970 Q314 1030 428 1086 L499 998Z',c[3],[379,982],'Hood left');
  region(p,'hood-right','M580 900 Q678 895 685 970 Q687 1030 573 1086 L499 998Z',c[3],[621,982],'Hood right');
  region(p,'hood-lining','M424 924 Q500 1005 578 924 L555 989 Q503 1043 449 989Z',c[4],[499,992],'Hood lining');
  region(p,'pocket','M394 1163 Q500 1189 609 1163 L648 1284 L352 1284Z',c[3],[500,1245],'Kangaroo pocket');
  region(p,'drawstring-left',rect(419,1058,10,126,5),c[7],[424,1104],'Hood string',1.6);region(p,'drawstring-right',rect(568,1058,10,126,5),c[7],[573,1104],'Hood string',1.6);
  region(p,'hoodie-emblem',star(500,1112,31,4,15),c[8],[500,1112],'Hoodie emblem');
 }else if(style==='lace'){
  region(p,'lace-bodice','M368 928 Q436 979 499 1019 Q568 975 631 928 L678 1298 L326 1298Z',c[7],[501,1198],'Lace bodice');
  for(let i=0;i<7;i++){const x=381+i*39,y=972+Math.sin(i*Math.PI/6)*52;region(p,`lace-scallop-${i}`,ep(x,y,22,29),c[8],[x,y],'Lace scallop',1.7);}
  for(let i=0;i<5;i++)region(p,`bodice-button-${i}`,circle(500,1085+i*38,7),c[9],[500,1085+i*38],'Pearl button',1.5);
  line(p,'M420 1080 Q444 1190 432 1298 M580 1080 Q556 1190 568 1298',1.7);
 }else if(style==='mage'){
  region(p,'mage-vest','M400 946 L500 1007 L601 946 L653 1298 L348 1298Z',c[7],[500,1220],'Mage inner robe');
  region(p,'cape-left','M385 850 L464 961 L432 1166 L275 1298 L184 1298 L230 1004Z',c[3],[315,1115],'Cloak left');
  region(p,'cape-right','M610 850 L535 961 L568 1166 L729 1298 L820 1298 L770 1004Z',c[3],[685,1115],'Cloak right');
  region(p,'cape-trim-left','M386 850 L464 961 L432 1166 L414 1190 L447 965 L376 865Z',c[9],[444,998],'Cloak gold trim',1.5);
  region(p,'cape-trim-right','M610 850 L535 961 L568 1166 L584 1187 L552 965 L620 865Z',c[9],[556,998],'Cloak gold trim',1.5);
  region(p,'cloak-clasp',star(500,992,40,8,25),c[9],[500,992],'Cloak clasp');
  region(p,'clasp-stone',ep(500,992,14,23),c[8],[500,992],'Clasp stone');
  for(let i=0;i<5;i++)region(p,`robe-star-${i}`,star(i%2?684:318,1050+Math.floor(i/2)*91,14,4,5),c[9],[i%2?684:318,1050+Math.floor(i/2)*91],'Embroidered star',1.6);
 }else{
  const tech=style==='tech',coat=style==='coat',jacket=style==='jacket';
  region(p,'inner-shirt',`M397 941 Q500 1010 600 941 L635 1298 L369 1298Z`,c[7],[500,1200],'Inner shirt');
  region(p,'lapel-left',`M${coat?351:387} ${coat?869:932} L476 1011 L402 1146 L335 1009Z`,c[3],[408,1013],'Left collar');
  region(p,'lapel-right',`M${coat?648:613} ${coat?869:932} L524 1011 L598 1146 L665 1009Z`,c[3],[592,1013],'Right collar');
  if(style==='scholar'){
   region(p,'tie-knot',poly([[475,1008],[523,1008],[515,1043],[486,1043]]),c[8],[500,1028],'Tie knot');
   region(p,'tie','M488 1043 L515 1043 L544 1209 L502 1247 L461 1209Z',c[3],[500,1150],'Silk tie');
   for(let i=0;i<3;i++)line(p,`M${477-i*3} ${1100+i*35} L${524+i*3} ${1120+i*35}`,2,c[9]);
  }else{
   region(p,'shirt-neckline','M427 966 Q500 1010 573 966 L571 986 Q500 1037 429 986Z',c[8],[500,1001],'Ribbed neckline');
   if(tech||jacket){region(p,'zipper',rect(494,1028,12,270,3),c[9],[500,1120],'Jacket zipper',1.5);region(p,'zip-pull',rect(488,1110,25,33,4),c[3],[500,1124],'Zipper pull');}
  }
  for(let i=0;i<3;i++)region(p,`coat-button-${i}`,circle(tech?586:412,1147+i*54,8),c[9],[tech?586:412,1147+i*54],'Garment button',1.5);
  region(p,'pocket-left',`M259 1118 L344 1140 L335 1192 L249 1170Z`,c[3],[297,1153],'Chest pocket');
  region(p,'pocket-right',`M659 1139 L742 1117 L752 1170 L668 1192Z`,c[3],[708,1153],'Chest pocket');
  if(tech){for(let i=0;i<3;i++)region(p,`tech-strap-${i}`,`M${230+i*13} ${1019+i*25} L${326+i*10} ${1053+i*25} L${320+i*10} ${1069+i*25} L${224+i*13} ${1035+i*25}Z`,c[8],[270+i*12,1040+i*25],'Reflective shoulder strap',1.5);}
 }
 // Tailored seams and fine folds support the shoulder anatomy.
 line(p,'M224 1034 Q246 991 302 974 M774 1034 Q751 991 697 974 M263 1063 Q287 1090 292 1113 M735 1063 Q711 1090 706 1113',1.1,c[4]);
 // Sleeve folds stay inside the garment silhouette.
 line(p,`M${shoulder+67} 1110 Q${shoulder+108} 1190 ${shoulder+101} 1295 M${912-shoulder} 1110 Q${866-shoulder} 1190 ${877-shoulder} 1295`,2.2);
 line(p,'M277 1233 Q309 1248 322 1284 M720 1237 Q694 1256 682 1283',1.7);
}
function face(p,o,c,add,ink,variant){
 const male=o[4]==='m',turn=(variant%3-1)*25,chin=male?844:823;
 add('ear-left','M302 605 C257 565 245 650 285 691 L316 707Z',c[5],[280,644],'Left ear');
 add('ear-right','M703 604 C751 569 758 650 720 693 L689 712Z',c[5],[729,644],'Right ear');
 ink('M286 626 Q274 612 277 644 L293 669 M723 626 Q738 612 734 644 L718 669',1.8);
 add('face',`M303 461 C313 340 416 312 500 315 C622 320 700 386 706 477 L697 645 C689 715 625 771 ${517+turn} ${chin} C${475+turn} ${chin+8} 342 742 317 672 Q293 558 303 461Z`,c[5],[503,692],'Face');
 add('face-shadow',`M685 491 Q713 590 688 669 C670 726 600 783 ${517+turn} ${chin} C${548+turn} 799 618 743 645 686 Q686 592 685 491Z`,c[6],[669,660],'Face contour shadow',1.1);
 const y=male?574:569;
 // Eyes have distinct lids, clean closed sclera, a coloured iris and specular regions.
 for(const [side,x,w] of [['left',403+turn*.35,variant%3===2?55:68],['right',593+turn*.45,variant%3===0?51:64]]){
  const yy=y+(side==='right'&&variant%3===1?-6:0),outer=side==='left'?-1:1;
  add(`eye-${side}-white`,`M${x-w} ${yy} Q${x-14} ${yy-39} ${x+w} ${yy-4} Q${x+36} ${yy+48} ${x-8} ${yy+44} Q${x-47} ${yy+34} ${x-w} ${yy}Z`,c[7],[x-w+24,yy+8],`${side} eye white`,2.8);
  add(`eye-${side}-iris`,`M${x-28} ${yy-16} Q${x+1} ${yy-24} ${x+28} ${yy-15} L${x+27} ${yy+16} Q${x+18} ${yy+45} ${x-1} ${yy+44} Q${x-28} ${yy+42} ${x-29} ${yy+11}Z`,c[10],[x-15,yy+22],`${side} iris`,1.7);
  add(`eye-${side}-lower-light`,`M${x-24} ${yy+20} Q${x} ${yy+38} ${x+24} ${yy+19} Q${x+14} ${yy+47} ${x-2} ${yy+42} Q${x-17} ${yy+40} ${x-24} ${yy+20}Z`,c[3],[x,yy+34],`${side} iris luminous rim`,.8);
  add(`eye-${side}-pupil`,ep(x,yy+4,10,male?21:24),c[4],[x,yy+8],`${side} pupil`,1.2);
  add(`eye-${side}-shine`,ep(x-12,yy-4,10,13),c[7],[x-12,yy-4],`${side} eye reflection`,1);
  ink(`M${x-19} ${yy+15} L${x-16} ${yy+23} M${x+18} ${yy+9} L${x+14} ${yy+21} M${x-7} ${yy+30} L${x-6} ${yy+36} M${x+9} ${yy+28} L${x+7} ${yy+34}`, .9, c[4]);
  add(`eye-${side}-glint`,ep(x+17,yy+24,4,6),c[7],[x+17,yy+24],`${side} eye glint`,.7);
  ink(`M${x-w-4} ${yy-3} Q${x-16} ${yy-42} ${x+w} ${yy-4}`,male?6:8,c[4]);
  ink(`M${x-w+7} ${yy+7} Q${x-29} ${yy+43} ${x-5} ${yy+45}`,1.9,c[4]);
  const lx=x+outer*(w-2);ink(`M${lx} ${yy-4} l${outer*15} -12`,2.8,c[4]);
  if(!male){ink(`M${lx-outer*12} ${yy-9} l${outer*13} -16 M${lx-outer*24} ${yy-13} l${outer*8} -16`,2.2,c[4]);}
  ink(`M${x-w+4} ${yy-25} Q${x-11} ${yy-58} ${x+w-1} ${yy-24}`,1.6,c[6]);
  add(`eyebrow-${side}`,`M${x-w+6} ${yy-66} Q${x-3} ${yy-91} ${x+w-7} ${yy-62} Q${x-6} ${yy-76} ${x-w+6} ${yy-59}Z`,c[2],[x,yy-73],`${side} eyebrow`,1.3);
 }
 ink(`M${501+turn} 610 Q${495+turn} 654 ${484+turn} 674 L${498+turn} 681`,1.8,c[6]);
 ink(`M${509+turn} 679 L${519+turn} 676`,1.4,c[6]);
 const mouthY=male?735:730;
 const expression=variant%6;
 if(expression===2||expression===4){
  add('smile-mouth',`M${460+turn} ${mouthY-3} Q${500+turn} ${mouthY+8} ${541+turn} ${mouthY-8} Q${526+turn} ${mouthY+38} ${500+turn} ${mouthY+36} Q${475+turn} ${mouthY+35} ${460+turn} ${mouthY-3}Z`,c[4],[499+turn,mouthY+16],'Smile');
  add('smile-teeth',`M${463+turn} ${mouthY} Q${500+turn} ${mouthY+11} ${537+turn} ${mouthY-4} L${530+turn} ${mouthY+8} Q${500+turn} ${mouthY+19} ${470+turn} ${mouthY+9}Z`,c[7],[500+turn,mouthY+9],'Smile highlight',1);
  add('smile-tongue',`M${483+turn} ${mouthY+27} Q${502+turn} ${mouthY+15} ${521+turn} ${mouthY+25} Q${503+turn} ${mouthY+42} ${483+turn} ${mouthY+27}Z`,c[6],[501+turn,mouthY+29],'Smile warm tone',1);
 }else if(expression===3||expression===5){
  ink(`M${464+turn} ${mouthY+3} Q${489+turn} ${mouthY-3} ${510+turn} ${mouthY+2} L${532+turn} ${mouthY-1}`,1.8,c[4]);
  ink(`M${484+turn} ${mouthY+17} Q${500+turn} ${mouthY+21} ${516+turn} ${mouthY+16}`,1.2,c[6]);
 }else{
  add('lower-lip',`M${469+turn} ${mouthY} Q${495+turn} ${mouthY+16} ${526+turn} ${mouthY-1} Q${508+turn} ${mouthY+26} ${481+turn} ${mouthY+16}Z`,c[6],[499+turn,mouthY+12],'Lower lip',.8);
  ink(`M${464+turn} ${mouthY} Q${485+turn} ${mouthY-3} ${499+turn} ${mouthY+1} Q${514+turn} ${mouthY-5} ${534+turn} ${mouthY-2}`,1.8,c[4]);
 }
 for(const x of [364,620]){for(let i=0;i<3;i++)ink(`M${x+i*9} ${653+i%2*2} L${x+i*9-4} ${663+i%2*2}`,1.2,c[6]);}
 if(o[0].includes('freckles'))for(let i=0;i<8;i++){const x=i<4?363+i*12:588+(i-4)*12;add(`freckle-${i}`,ep(x,648+i%3*6,2.4,1.8),c[6],[x,648+i%3*6],'Freckle',.6);}
 p.shades.push({d:transform('M330 475 Q364 426 402 439 Q357 548 359 655 Q343 624 330 475Z',o[8]),opacity:.085,color:c[4]});
}
function hairFront(p,o,c,add,ink,variant){
 const h=o[5],male=o[4]==='m';
 const front={
 long:[['M294 521 C267 346 393 229 507 258 C431 304 433 466 405 552 C388 500 367 448 365 403 C345 455 320 505 294 521Z',[341,389]],['M507 258 C611 217 765 339 708 549 C675 506 646 458 626 402 C624 469 647 496 649 517 C553 461 507 380 507 258Z',[609,372]],['M507 258 C459 320 451 435 487 527 C512 488 527 472 526 431 C559 498 577 514 601 526 C588 431 549 340 507 258Z',[510,386]]],
 wave:[['M293 548 C226 405 370 232 500 254 C376 336 407 458 340 534 C362 467 333 440 333 417 C306 477 331 531 293 548Z',[315,414]],['M500 254 C679 221 755 333 720 528 C689 506 684 461 661 408 C655 452 680 498 658 539 C605 482 602 377 542 345 C541 402 574 448 555 494 C497 436 473 353 500 254Z',[592,328]],['M492 263 C425 281 389 369 403 480 L424 532 Q447 450 462 408 Q449 358 492 263Z',[433,381]]],
 bob:[['M292 531 C237 367 368 235 493 254 C470 348 443 465 385 538 L385 475 L354 529 L354 475 L316 545Z',[340,402]],['M493 254 C649 218 767 376 710 549 L677 506 L671 552 L633 495 L628 541 C556 466 517 374 493 254Z',[620,404]],['M489 291 Q459 414 466 511 L494 545 L518 500 Q521 410 489 291Z',[492,448]]],
 short:[['M275 530 C259 391 361 277 482 270 C445 373 376 386 355 464 L338 508 L330 441 L304 523 L304 468Z',[351,375]],['M478 271 C634 238 740 357 733 503 L694 466 L695 527 L655 467 L647 512 L613 444 L605 492 C524 413 508 339 478 271Z',[616,376]],['M472 303 Q385 401 425 507 L450 471 L463 514 Q509 421 472 303Z',[452,410]]],
 spiky:[['M274 528 L279 424 L354 332 L431 290 L491 267 L444 368 L393 409 L362 506 L351 448 L311 526 L316 454Z',[355,400]],['M491 267 L620 296 L698 366 L743 486 L696 463 L708 536 L645 482 L648 528 L605 451 L586 504 L541 405Z',[610,369]],['M489 286 L452 377 L460 512 L487 476 L506 530 L531 450 L515 364Z',[489,418]]],
 swept:[['M274 540 C224 397 402 229 548 260 C514 336 418 351 368 435 L357 492 L343 460 L306 530 L312 471Z',[345,389]],['M548 260 C694 261 772 392 727 533 L700 488 L688 539 L657 476 C636 358 597 325 548 260Z',[679,388]],['M548 260 C570 360 457 450 441 530 L421 483 L398 531 C380 430 489 367 548 260Z',[481,405]],['M542 274 C606 346 586 437 620 503 C557 471 524 427 527 392Z',[562,405]]],
 ponytail:[['M289 527 C242 368 385 248 489 262 Q450 357 408 407 L357 497 L363 436 L323 522Z',[340,394]],['M489 262 C615 224 768 354 716 542 C688 502 670 466 651 411 L639 477 L602 429 L604 479 C553 415 517 352 489 262Z',[608,375]],['M488 279 Q400 367 416 514 L452 457 L453 506 Q506 422 488 279Z',[451,413]]],
 twintails:[['M284 527 C267 349 384 249 497 256 C458 350 397 412 362 506 L354 447 L319 516 L325 455Z',[341,381]],['M497 256 C610 226 759 367 718 532 L681 477 L677 532 L633 479 L623 521 C566 436 534 350 497 256Z',[621,391]],['M497 270 Q443 358 467 519 L496 486 L521 531 Q551 400 497 270Z',[498,418]]],
 updo:[['M285 548 C251 377 377 275 490 271 Q391 340 364 448 L343 504 L341 456 L311 539Z',[322,411]],['M490 271 C616 232 765 372 714 550 L682 498 L670 541 C641 457 629 393 560 347 L577 443 C528 408 508 343 490 271Z',[628,388]],['M491 279 Q431 357 427 467 L445 529 Q467 445 500 409 Q517 338 491 279Z',[465,401]]],
 braid:[['M284 542 C244 373 384 246 501 265 Q433 339 386 409 L354 493 L352 448 L319 529Z',[338,396]],['M501 265 C624 228 765 370 716 546 L680 498 L671 544 C631 487 638 376 558 340 Q577 400 566 458 C521 405 516 340 501 265Z',[628,379]],['M501 267 Q408 359 429 512 L452 475 L463 518 Q507 430 512 362Z',[469,405]]],
 };
 (front[h]||front.long).forEach(([d,pos],i)=>add(`fringe-${i}`,d,i===1?c[3]:c[2],pos,'Hair fringe'));
 // Slim colourable highlights follow the hair growth; expressive ink stays on the fringe.
 add('hair-rim-left','M325 407 Q353 319 441 290 Q379 327 354 403 L335 462Z',c[3],[364,362],'Hair shine ribbon',1.4);
 add('hair-rim-right','M577 289 Q682 311 703 427 L688 450 Q668 356 607 328Z',c[2],[672,355],'Hair shine ribbon',1.4);
 ink('M364 323 Q307 380 301 469 M382 333 Q342 389 333 438 M610 306 Q678 336 692 397',1.6,c[4]);
 ink('M409 289 Q367 331 352 375 M418 300 Q383 335 367 380 M589 295 Q654 327 676 381 M584 304 Q643 336 664 380 M486 323 Q467 368 467 427',.95,c[4]);
 if(['long','wave','bob','braid','ponytail','twintails','updo'].includes(h)){
  add('temple-lock-left',`M306 492 C288 585 285 700 343 ${male?799:856} C294 787 246 665 270 537Z`,c[3],[294,664],'Left temple lock');
  add('temple-lock-right','M695 490 C735 627 696 738 663 845 C732 772 763 665 742 536Z',c[2],[726,673],'Right temple lock');
  ink('M287 554 Q275 668 318 760 M723 552 Q744 653 699 767',1.8,c[4]);
 }
 if(h==='braid'){
  for(let i=0;i<7;i++){const x=713+Math.sin(i*.6)*24,y=774+i*55;add(`braid-left-${i}`,`M${x} ${y} C${x-68} ${y-12} ${x-56} ${y+44} ${x+5} ${y+60} Q${x+37} ${y+39} ${x} ${y}Z`,i%2?c[3]:c[2],[x-19,y+26],'Braided hair left loop');add(`braid-right-${i}`,`M${x+3} ${y+4} C${x+64} ${y-12} ${x+65} ${y+45} ${x+6} ${y+61} Q${x-27} ${y+39} ${x+3} ${y+4}Z`,i%2?c[2]:c[3],[x+29,y+28],'Braided hair right loop');}
  add('braid-band','M692 1157 L740 1155 L744 1182 L696 1184Z',c[9],[719,1170],'Braid ribbon');
  add('braid-tail','M696 1181 Q678 1220 696 1276 L720 1244 L746 1276 Q755 1219 741 1180Z',c[3],[720,1220],'Braid tail');
 }
 // Personal accessories make the same anatomy system a genuinely different character.
 if(o[2]==='Streetwear'){
  if(variant%3===0){
   add('goggles-strap','M319 386 Q500 280 701 388 L695 412 Q500 312 325 411Z',c[4],[501,336],'Goggle strap');
   for(const [side,x]of [['left',407],['right',593]]){add(`goggles-${side}-frame`,ep(x,373,62,42),c[9],[x-48,373],'Goggle frame');add(`goggles-${side}-lens`,ep(x,373,48,30),c[8],[x,380],'Goggle lens');add(`goggles-${side}-shine`,`M${x-30} 360 Q${x} 344 ${x+30} 360 L${x+16} 365 Q${x} 359 ${x-28} 372Z`,c[7],[x-9,358],'Lens highlight',1);}
   add('goggles-bridge','M467 369 Q500 351 533 369 L533 382 Q500 368 467 382Z',c[9],[500,369],'Goggle bridge');
  }else if(variant%3===1){
   add('headphone-left',`M273 540 Q239 540 243 593 L252 693 Q270 721 297 694 L291 556Z`,c[8],[267,620],'Left earphone');add('headphone-left-pad','M285 552 Q306 560 305 594 L311 672 Q309 695 296 698 L280 577Z',c[4],[299,640],'Earphone cushion');
   add('headphone-right','M726 540 Q760 540 756 593 L747 693 Q729 721 702 694 L708 556Z',c[8],[733,620],'Right earphone');
   add('headphone-band','M249 549 C215 170 785 170 753 549 L739 549 C759 197 238 197 265 549Z',c[9],[500,259],'Headphone headband');
  }else{
   add('hairpin-one','M326 473 L385 443 L391 454 L332 484Z',c[9],[356,464],'Hair clip');
   add('hairpin-two','M342 488 L401 458 L407 469 L348 499Z',c[8],[372,479],'Hair clip');
  }
 }
 if(o[2]==='Fantasy'){
  add('ear-cuff','M724 616 L737 605 L747 631 L733 643Z',c[9],[737,625],'Ear cuff');
  add('jewel-chain','M733 652 L740 699 L731 699 L725 652Z',c[9],[733,675],'Earring chain',1.4);
  add('ear-jewel',poly([[735,693],[750,716],[735,740],[720,716]]),c[8],[735,716],'Suspended jewel');
  if(variant%3===0){add('circlet','M345 477 Q500 431 652 475 L649 487 Q500 450 349 490Z',c[9],[561,466],'Filigree circlet');add('brow-jewel',poly([[500,448],[517,478],[500,506],[483,478]]),c[8],[500,478],'Circlet gemstone');}
  else if(variant%3===1){add('side-feather','M294 448 C199 332 245 245 291 221 Q269 322 318 414 L294 448Z',c[7],[267,320],'Feather ornament');ink('M292 422 Q264 348 275 264',1.5,c[9]);add('feather-brooch',star(303,428,24,6,17),c[9],[303,428],'Feather brooch');}
  else{add('crown','M364 329 L359 276 L399 298 L423 247 L457 291 L500 223 L541 291 L577 247 L602 298 L641 276 L635 329 Q500 300 364 329Z',c[9],[500,283],'Crown');for(let i=0;i<3;i++)add(`crown-gem-${i}`,ep(424+i*77,301-i%2*9,10,15),c[8],[424+i*77,301-i%2*9],'Crown gem');}
 }
 if(o[2]==='Anime portraits'){
  if(!male){add('earring-left',ep(285,703,8,13),c[9],[285,703],'Pearl earring');add('earring-right',ep(726,703,8,13),c[9],[726,703],'Pearl earring');}
  if(!male&&variant%3===0){add('ribbon-ornament-left','M681 440 Q620 391 638 357 Q697 365 703 421Z',c[8],[671,391],'Hair ribbon left');add('ribbon-ornament-right','M704 420 Q719 355 765 359 Q787 403 714 443Z',c[8],[744,393],'Hair ribbon right');add('ribbon-ornament-knot',ep(703,432,17,20),c[9],[703,432],'Hair ribbon knot');}
 }
}
function detailing(p,o,c,add,ink,index){
 // Strand divisions curve along the hair instead of cutting across the face.
 if(['long','wave','twintails','ponytail'].includes(o[5])){
  for(let i=0;i<4;i++){
   const x=246+i*20;
   ink(`M${x} 827 C${x-18} 947 ${x+63} 1050 ${x+21} 1150`,1.1,c[4]);
   const xr=750+i*18;
   ink(`M${xr} 804 C${xr+26} 926 ${xr-58} 1031 ${xr+7} 1151`,1.1,c[4]);
  }
 }
 const hard=o[3]==='Hard';
 // Individually bounded woven diamonds, sleeve embroidery and seam piping.
 if(hard){
  for(let side=0;side<2;side++){
   for(let i=0;i<5;i++){
    const x=side?747-i*3:249+i*3,y=1173+i*24;
    region(p,`cuff-embroidery-${side}-${i}`,poly([[x,y-9],[x+7,y],[x,y+9],[x-7,y]]),i%2?c[8]:c[9],[x,y],'Embroidered sleeve diamond',1.2);
   }
  }
  if(o[6]!=='kimono'){
   for(let i=0;i<5;i++){
    const x=352+i*9,y=1170+i*23;
    region(p,`seam-leaf-${i}`,`M${x} ${y} Q${x-22} ${y-18} ${x-13} ${y-29} Q${x+7} ${y-23} ${x} ${y}Z`,c[9],[x-8,y-16],'Gold seam embroidery',1);
   }
  }
 }
 // Eye-catching hair jewelry: not applied to every character.
 if(o[0].includes('butterfly')||o[0].includes('sakura')||o[0].includes('petal')){
  const fx=690,fy=416;
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5,x=fx+Math.cos(a)*25,y=fy+Math.sin(a)*25;add(`hair-flower-${i}`,ep(x,y,17,22),c[8],[x,y],'Hair flower petal',1.4);}
  add('hair-flower-heart',ep(fx,fy,11,12),c[9],[fx,fy],'Hair flower center',1.4);
  for(let i=0;i<3;i++){add(`hair-pearls-${i}`,ep(718+i*7,448+i*20,5,7),c[7],[718+i*7,448+i*20],'Hair ornament pearl',1);}
 }
 if(o[0].includes('dragon')){
  add('dragon-horn-left','M340 324 C286 242 295 181 329 150 C312 224 365 229 381 285Z',c[9],[330,244],'Dragon horn');
  add('dragon-horn-right','M634 291 C676 240 711 217 705 153 C761 208 717 295 672 329Z',c[9],[709,242],'Dragon horn');
  ink('M315 224 L341 214 M320 245 L353 235 M699 231 L727 244 M688 249 L716 265',1.5,c[4]);
 }
 if(o[0].includes('tide')){
  for(let i=0;i<4;i++)add(`shell-crown-${i}`,`M${374+i*69} 343 L${354+i*69} 310 Q${382+i*69} 256 ${410+i*69} 310 L${390+i*69} 343Z`,c[9],[382+i*69,312],'Seashell crown');
 }
 if(o[0].includes('cloud')){
  for(let side=0;side<2;side++){const x=side?744:285,dir=side?1:-1;add(`wing-hairpin-${side}`,`M${x} 409 Q${x+dir*64} 354 ${x+dir*62} 300 Q${x+dir*27} 318 ${x+dir*15} 362 Q${x+dir*37} 316 ${x+dir*13} 292 Q${x-dir*21} 336 ${x} 409Z`,c[7],[x+dir*22,352],'Wing hair ornament');}
 }
}
function props(p,o,c,index){
 const motif=o[7];
 // A distinct foreground still life changes the portrait composition and adds
 // fine, usable regions. The hands are explicit anatomy, not decorative symbols.
 const book=['cranes','alchemy','crystals','music'].includes(motif);
 if(book){
  region(p,'book-cover','M261 1130 L493 1171 L738 1088 L748 1250 L506 1298 L269 1249Z',c[8],[278,1223],'Book cover');
  region(p,'book-page-left','M273 1112 Q384 1099 498 1156 L502 1283 Q377 1227 280 1238Z',c[7],[374,1175],'Left book page');
  region(p,'book-page-right','M498 1156 Q611 1079 722 1071 L731 1227 Q607 1250 502 1283Z',c[0],[629,1180],'Right book page');
  region(p,'book-spine','M494 1155 L506 1152 L511 1282 L501 1287Z',c[9],[502,1208],'Book spine',1.5);
  for(let i=0;i<4;i++){line(p,`M307 ${1144+i*21} Q386 ${1141+i*21} 466 ${1176+i*21}`,1.3,c[3]);line(p,`M541 ${1165+i*21} Q622 ${1121+i*21} 693 ${1109+i*21}`,1.3,c[3]);}
  region(p,'bookmark','M626 1100 L649 1090 L660 1246 L646 1237 L636 1254Z',c[3],[642,1182],'Bookmark ribbon');
  region(p,'book-hand-left','M229 1225 C240 1198 252 1199 267 1185 L285 1162 Q299 1151 302 1165 L289 1198 L319 1191 Q333 1193 327 1206 L289 1221 Q330 1215 335 1224 Q338 1236 293 1246 Q329 1240 336 1251 Q337 1264 289 1276 L253 1284Z',c[5],[267,1239],'Hand holding book');
  line(p,'M280 1226 L313 1220 M283 1252 L315 1248 M268 1209 Q260 1227 264 1244',1.4,c[6]);
 }else if(['roses','daisies','flowers','leaves','sakura','butterflies'].includes(motif)){
  region(p,'bouquet-paper','M293 1135 L415 1105 L620 1165 L529 1298 L402 1298Z',c[7],[464,1235],'Bouquet paper');
  region(p,'bouquet-fold','M421 1117 L529 1298 L552 1253 L450 1130Z',c[1],[484,1193],'Bouquet paper fold');
  for(let i=0;i<4;i++){const x=348+i*58,y=1120+(i%2)*28;region(p,`bouquet-leaf-${i}`,leaf(x,y,.35,i%2?1:-1),c[8],[x,y-25],'Bouquet leaf',1.3);flower(p,`bouquet-bloom-${i}`,x,y-48,30,[i%2?c[8]:c[3],c[9]],5);}
  region(p,'bouquet-ribbon','M420 1257 Q480 1236 547 1254 L536 1279 Q476 1261 433 1281Z',c[8],[482,1261],'Bouquet tie');
  region(p,'bouquet-hand','M593 1220 L558 1199 Q544 1190 539 1203 Q537 1215 562 1228 L579 1244 L540 1240 Q516 1238 517 1251 Q516 1261 554 1267 L514 1265 Q499 1267 505 1280 L545 1290 L592 1298 L631 1280Z',c[5],[578,1272],'Hand holding bouquet');
  line(p,'M548 1244 L572 1246 M540 1264 L567 1268 M551 1290 L577 1290',1.5,c[6]);
 }else if(o[2]==='Fantasy'){
  const x=index%2?214:807;
  region(p,'staff-shaft',rect(x-8,641,16,655,6),c[9],[x,1150],'Ornamental staff',2);
  region(p,'staff-cage',`M${x} 463 Q${x-85} 540 ${x-38} 616 L${x-14} 650 L${x+14} 650 Q${x+103} 553 ${x} 463Z`,c[9],[x-31,578],'Staff crown');
  region(p,'staff-crystal',poly([[x,477],[x+37,541],[x+21,592],[x,619],[x-28,579],[x-32,531]]),c[8],[x-13,548],'Staff crystal');
  region(p,'crystal-light',poly([[x,477],[x+37,541],[x+21,592],[x+5,548]]),c[7],[x+18,540],'Crystal light facet',1.2);
  region(p,'staff-collar',rect(x-24,634,48,21,5),c[3],[x,644],'Staff collar');
  for(let i=0;i<3;i++)region(p,`staff-ring-${i}`,rect(x-15,703+i*53,30,10,3),c[8],[x,708+i*53],'Staff inlay',1.3);
 }else if(o[2]==='Streetwear'){
  // Pins, utility lacing, technical cuffs and logo patches are independently fillable.
  region(p,'jacket-patch',rect(617,1162,77,61,12),c[8],[642,1187],'Jacket patch');
  region(p,'patch-emblem',star(655,1192,22,4,11),c[7],[655,1192],'Patch emblem',1.4);
  for(let i=0;i<4;i++){region(p,`utility-eyelet-${i}`,circle(311,1174+i*30,6),c[9],[311,1174+i*30],'Utility eyelet',1.2);region(p,`utility-eyelet-right-${i}`,circle(345,1174+i*30,6),c[9],[345,1174+i*30],'Utility eyelet',1.2);if(i<3){line(p,`M311 ${1174+i*30} L345 ${1204+i*30} M345 ${1174+i*30} L311 ${1204+i*30}`,2,c[7]);}}
  if(motif==='skate'){region(p,'skateboard','M164 1084 Q151 1047 172 1028 Q195 1015 208 1054 L278 1267 Q291 1298 260 1300 L233 1300Z',c[8],[198,1123],'Skateboard deck');region(p,'skate-deck-stripe','M173 1053 L185 1049 L265 1285 L252 1288Z',c[9],[213,1162],'Skateboard stripe');}
 }else if(motif==='snow'){
  region(p,'scarf-end-left','M377 981 Q477 1042 612 985 L622 1057 Q501 1115 365 1043Z',c[8],[468,1047],'Winter scarf');
  region(p,'scarf-tail','M548 1050 L614 1043 L647 1244 L581 1260Z',c[8],[596,1156],'Scarf tail');
  for(let i=0;i<5;i++)region(p,`scarf-fringe-${i}`,rect(584+i*13,1250-i*3,8,30,3),c[3],[588+i*13,1265-i*3],'Scarf fringe',1);
 }
}
function finish(p,o,c,index){
 if(o[7]==='music'){
  for(let i=0;i<3;i++){
   const x=i%2?867:126,y=204+i*261;
   region(p,`record-${i}`,circle(x,y,43),c[4],[x+31,y],'Floating vinyl record',2);
   region(p,`record-ring-${i}`,circle(x,y,32),c[2],[x+24,y],'Vinyl outer groove',1.2);
   region(p,`record-label-${i}`,circle(x,y,16),c[8],[x+9,y],'Record label',1);
   region(p,`record-center-${i}`,circle(x,y,4),c[7],[x,y],'Record spindle',.7);
  }
 }
 if(o[7]==='crystals'){
  for(let i=0;i<4;i++){
   const x=i%2?914:91,y=383+i*175;
   region(p,`crystal-shard-${i}`,poly([[x,y-45],[x+16,y-7],[x+8,y+33],[x-13,y+20],[x-20,y-14]]),c[8],[x-6,y],'Crystal shard');
   region(p,`crystal-shard-facet-${i}`,poly([[x,y-45],[x+16,y-7],[x+8,y+33],[x+1,y-8]]),c[7],[x+7,y-1],'Crystal shard bright facet',1.2);
  }
 }

 if(o[7]==='butterflies'||o[7]==='flowers'||o[7]==='planets'){
  for(let j=0;j<2;j++){const x=j?840:176,y=j?965:337;
   if(o[7]==='planets'){region(p,`planet-${j}`,circle(x,y,48),c[3],[x,y],'Orbiting planet');region(p,`planet-ring-${j}`,`M${x-68} ${y+15} Q${x-84} ${y-13} ${x-32} ${y-31} Q${x-78} ${y-6} ${x-44} ${y+5} Q${x+35} ${y+32} ${x+75} ${y-17} Q${x+46} ${y+44} ${x-68} ${y+15}Z`,c[9],[x-58,y+11],'Planet ring',1.6);}
   else{region(p,`butterfly-${j}-upper-left`,`M${x} ${y} C${x-90} ${y-110} ${x-80} ${y+29} ${x} ${y+15}Z`,c[8],[x-35,y-26],'Butterfly upper wing');region(p,`butterfly-${j}-upper-right`,`M${x} ${y} C${x+76} ${y-117} ${x+82} ${y+21} ${x} ${y+15}Z`,c[3],[x+34,y-28],'Butterfly upper wing');region(p,`butterfly-${j}-lower-left`,`M${x} ${y+8} C${x-95} ${y+8} ${x-42} ${y+84} ${x} ${y+20}Z`,c[3],[x-26,y+35],'Butterfly lower wing');region(p,`butterfly-${j}-lower-right`,`M${x} ${y+8} C${x+87} ${y+12} ${x+37} ${y+80} ${x} ${y+20}Z`,c[8],[x+25,y+34],'Butterfly lower wing');region(p,`butterfly-${j}-body`,ep(x,y+9,4,27),c[4],[x,y+8],'Butterfly body',1);line(p,`M${x} ${y-10} Q${x-7} ${y-32} ${x-15} ${y-28} M${x} ${y-10} Q${x+9} ${y-35} ${x+16} ${y-30}`,1.3);}
  }
 }
 // Alignment-preserving fabric shadow planes; the painter can toggle these off.
 p.shades.push({d:'M219 1084 Q255 1173 242 1298 L207 1298Z',opacity:.11,color:c[4]});
 p.shades.push({d:'M786 1084 Q746 1184 761 1298 L800 1298Z',opacity:.1,color:c[4]});
}
export function generatePages(){return concepts.map((o,index)=>{
 const c=colorways[o[9]], p=makePage(o[0],o[1],o[2],o[3],[o[4]==='f'?'female':'male',o[5]+' hair',o[6],o[7],'original character','portrait','anime'],[...new Set(c)],`${o[1]}: an original ${o[4]==='f'?'heroine':'hero'} with ${o[5]} hair, expressive luminous eyes and ${o[7]} details. Layered hair ribbons, coordinated costume, and individual highlights reward careful colouring.`);
 const add=(id,d,color,pos,name,w=2.8)=>region(p,id,transform(d,o[8]),color,point(...pos,o[8]),name,w);
 const ink=(d,w=2,color=c[4])=>{
  // Expand the few relative eyelash strokes before affine rotation.
  let current=[0,0];let abs=d.replace(/M(-?[\d.]+)\s+(-?[\d.]+)\s*l(-?[\d.]+)\s+(-?[\d.]+)/g,(_,x,y,dx,dy)=>`M${x} ${y} L${+x+ +dx} ${+y+ +dy}`);
  line(p,transform(abs,o[8]),w,color);
 };
 background(p,o,c,index);hairBack(p,o,c,add);costume(p,o,c);face(p,o,c,add,ink,index);hairFront(p,o,c,add,ink,index);detailing(p,o,c,add,ink,index);finish(p,o,c,index);props(p,o,c,index);
 p.regions=p.regions.filter(r=>!(occludedRegions[p.id]||[]).includes(r.id));
 return p;
});}

// Fully covered draft shapes were removed after a 1000 × 1300 ID-mask review.
const occludedRegions={"portrait-moonflower":["border-bloom-5-petal-2","seam-leaf-1","seam-leaf-2","seam-leaf-3","seam-leaf-4"],"portrait-paper-cranes":["coat-button-0","coat-button-1","coat-button-2"],"portrait-rosewater":["border-bloom-3-petal-3","seam-leaf-0","seam-leaf-1","seam-leaf-2","seam-leaf-3","seam-leaf-4"],"portrait-autumn-letter":["coat-button-0","coat-button-1","coat-button-2"],"portrait-butterfly-glass":["bodice-button-2","bodice-button-3","bodice-button-4","seam-leaf-0","seam-leaf-1","seam-leaf-2","seam-leaf-3","seam-leaf-4"],"portrait-rain-listener":["window-1-0","window-1-1","window-1-2","window-2-0","window-2-1","window-2-2","window-3-0","window-3-1","window-3-2"],"portrait-sunlit-freckles":["seam-leaf-0","seam-leaf-1","seam-leaf-2","seam-leaf-3","seam-leaf-4"],"portrait-vinyl-dream":["note-5","coat-button-0","coat-button-1","coat-button-2","cuff-embroidery-0-2","cuff-embroidery-0-3","cuff-embroidery-0-4","cuff-embroidery-1-2","cuff-embroidery-1-3","seam-leaf-0","seam-leaf-2","seam-leaf-3","seam-leaf-4"],"portrait-sakura-ink":[],"portrait-winter-velvet":[],"fantasy-star-cartographer":["celestial-11"],"fantasy-dragon-envoy":[],"fantasy-petal-oracle":["bodice-button-2","bodice-button-3","bodice-button-4","seam-leaf-0","seam-leaf-1","seam-leaf-2","seam-leaf-3","seam-leaf-4"],"fantasy-tide-singer":[],"fantasy-crescent-knight":["celestial-9","celestial-11","celestial-15"],"fantasy-amber-alchemist":["coat-button-0","coat-button-1","coat-button-2","cuff-embroidery-0-2","cuff-embroidery-0-3","cuff-embroidery-0-4","cuff-embroidery-1-2","cuff-embroidery-1-3","seam-leaf-0","seam-leaf-1","seam-leaf-2","seam-leaf-3","seam-leaf-4"],"fantasy-lantern-keeper":["kimono-flower-3-petal-0","kimono-flower-3-petal-3","kimono-flower-3-petal-4","kimono-flower-3-heart"],"fantasy-thorn-prince":["coat-button-0","coat-button-1","coat-button-2","seam-leaf-0","seam-leaf-1","seam-leaf-2","seam-leaf-3"],"fantasy-cloud-courier":[],"fantasy-crystal-archivist":["coat-button-0","coat-button-1","coat-button-2","cuff-embroidery-0-2","cuff-embroidery-0-3","cuff-embroidery-0-4","cuff-embroidery-1-2","cuff-embroidery-1-3","seam-leaf-0","seam-leaf-1","seam-leaf-2","seam-leaf-3","seam-leaf-4"],"street-neon-drifter":["window-1-0","window-1-1","window-1-2","window-2-1","window-2-2","window-3-0","window-3-1","window-4-0","window-4-1"],"street-rooftop-radio":["window-1-0","window-1-1","window-1-2","window-2-1","window-2-2","window-3-0","window-3-1","window-3-2"],"street-cherry-static":["window-1-0","window-1-1","window-1-2","window-2-0","window-2-1","window-2-2","window-3-0","window-3-1","window-3-2"],"street-midnight-skater":["window-1-0","window-1-1","window-1-2","skyline-2","window-2-0","window-2-1","window-2-2","window-3-0","window-3-1","window-3-2"],"street-pastel-orbit":["celestial-7","celestial-9"],"street-golden-hour":["window-1-0","window-1-1","window-1-2","skyline-2","window-2-0","window-2-1","window-2-2","window-3-0","window-3-1"],"street-arcade-angel":["window-1-0","window-1-1","window-1-2","window-2-0","window-2-1","window-2-2","window-3-0","window-3-1","window-3-2"],"street-blue-frequency":["window-1-0","window-1-1","window-1-2","window-2-1","window-2-2","window-3-0","window-3-1","window-3-2","window-4-0"],"street-pixel-punk":["window-1-1","window-1-2","window-2-0","window-2-1","window-2-2","window-3-0","window-3-1","window-3-2"],"street-rain-circuit":["window-1-0","window-1-1","window-1-2","window-2-0","window-2-1","window-2-2","window-3-0","window-3-1","window-4-0","window-4-1"]};
