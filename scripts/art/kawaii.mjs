import {makePage,region,line,ellipse,circle,rect,poly,star,flower,leaf} from './helpers.mjs';

/* Original Hoshii illustrations. Coordinates describe closed vector ink shapes,
   rather than thresholded image masks. Local transforms preserve region IDs. */
const INK='#34334E', IVORY='#FFF9EF';
const round=n=>+n.toFixed(3);
function transform(d,tx=0,ty=0,s=1){
  const tok=d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/g);let i=0,cmd='',out=[];
  const arity={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7,Z:0};
  while(i<tok.length){if(/[a-z]/i.test(tok[i])){cmd=tok[i++];out.push(cmd);if(cmd.toUpperCase()==='Z')continue;}const u=cmd.toUpperCase(),n=arity[u],rel=cmd!==u;let a=tok.slice(i,i+n).map(Number);i+=n;
    if(u==='A'){a[0]*=s;a[1]*=s;a[5]=a[5]*s+(rel?0:tx);a[6]=a[6]*s+(rel?0:ty);}
    else if(u==='H')a[0]=a[0]*s+(rel?0:tx);else if(u==='V')a[0]=a[0]*s+(rel?0:ty);
    else for(let j=0;j<a.length;j++)a[j]=a[j]*s+(rel?0:j%2?ty:tx);
    out.push(a.map(round).join(' '));
  }return out.join(' ');
}
function artist(p,tx=0,ty=0,s=1,prefix=''){
  return {r:(id,d,c,l,name=id,w=2.4)=>region(p,prefix+id,transform(d,tx,ty,s),c,[tx+l[0]*s,ty+l[1]*s],name,w*s),l:(d,w=1.6)=>line(p,transform(d,tx,ty,s),w*s,INK),sh:(d,o=.12,c=INK)=>p.shades.push({d:transform(d,tx,ty,s),opacity:o,color:c})};
}
function spark(p,id,x,y,r,c){region(p,id,star(x,y,r,4,r*.28),c,[x,y],'Four-point sparkle',2.2);}
function heart(x,y,s=1){return `M${x} ${y+s*20}C${x-s*55} ${y-s*15} ${x-s*25} ${y-s*55} ${x} ${y-s*28}C${x+s*25} ${y-s*55} ${x+s*55} ${y-s*15} ${x} ${y+s*20}Z`;}
function backdrop(p,kind,accent,secondary){
  region(p,'paper',rect(40,45,920,1210,44),'#FFF9F1',[65,150],'Paper background',2.4);
  if(kind==='night'){
    region(p,'night-window',`M130 985V405C130 35 870 35 870 405V985Z`,'#DCE0F5',[500,150],'Arched night sky',3.2);
    region(p,'moon',`M765 195C615 172 585 352 734 389C610 425 535 290 615 205C655 165 725 170 765 195Z`,secondary,[641,245],'Crescent moon',2.5);
  }else if(kind==='garden'){
    region(p,'garden-arch',`M115 995V475C115 68 885 68 885 475V995Z`,secondary,[500,191],'Garden alcove',3.2);
    for(const [i,x,y,flip] of [[0,164,410,-1],[1,842,420,1],[2,158,965,-1],[3,848,950,1]])region(p,`garden-leaf-${i}`,leaf(x,y,1.0,flip),accent,[x+flip*5,y-55],'Garden leaf',2.5);
  }else if(kind==='cafe'){
    region(p,'cafe-wall',rect(117,190,766,760,90),secondary,[185,330],'Cafe wall',2.8);
    region(p,'window',rect(225,265,550,330,100),'#FAEFE2',[272,400],'Sunlit window',2.6);

  }else{
    region(p,'halo',ellipse(500,602,382,460),secondary,[210,420],'Pastel illustration halo',2.5);
  }
  region(p,'ground',`M102 1070Q500 1005 898 1070L875 1162Q500 1210 125 1162Z`,accent,[500,1154],'Soft illustrated ground',2.8);
  spark(p,'twinkle-left',137,640,22,'#F1BC72');spark(p,'twinkle-right',864,719,24,'#F1BC72');
}
function kawaiiEyes(a,y=0,separation=44,closed=false){
  if(closed){a.l(`M${-separation-15} ${y}Q${-separation} ${y+18} ${-separation+15} ${y}M${separation-15} ${y}Q${separation} ${y+18} ${separation+15} ${y}`,3.3);}
  else for(const [side,x] of [['left',-separation],['right',separation]]){
    a.r(`${side}-eye`,ellipse(x,y,10,15),INK,[x,y+5],'Velvet eye');a.r(`${side}-eye-light`,circle(x-3,y-5,3.5),IVORY,[x-3,y-5],'Eye glint',1);
  }
  a.r('left-cheek',ellipse(-separation-18,y+26,14,8),'#F5B5B9',[-separation-18,y+26],'Rosy cheek',1.4);a.r('right-cheek',ellipse(separation+18,y+26,14,8),'#F5B5B9',[separation+18,y+26],'Rosy cheek',1.4);
  a.l(`M-7 ${y+27}Q0 ${y+35} 7 ${y+27}`,2.4);
}
function addButterfly(p,id,x,y,s,c1,c2){const a=artist(p,x,y,s,id);a.r('left','M0 0C-65-65-85 5-10 20C-65 40-25 70 0 20Z',c1,[-34,0],'Butterfly wing');a.r('right','M0 0C65-65 85 5 10 20C65 40 25 70 0 20Z',c2,[34,0],'Butterfly wing');a.r('body',ellipse(0,10,5,22),INK,[0,10],'Butterfly body',1.2);a.l('M-2-6Q-18-32-22-18M2-6Q18-32 22-18',1.6);}
function makeKawaii(){
const specs=[
 ['moonlit-fox','Moonlit Fox','night','#D6C9ED','#F5D49D',['fox','moon','sleeping']],
 ['bunny-matcha','Bunny Matcha Café','cafe','#C3D7B6','#F5DBD7',['bunny','matcha','cafe']],
 ['axolotl-garden','Axolotl Water Garden','halo','#B8D9DD','#E5DAF3',['axolotl','water','flowers']],
 ['corgi-bakery','Corgi Bread Club','cafe','#E8C19E','#F6E4CC',['dog','corgi','bakery']],
 ['raincoat-kitten','A Little Rain, A Little Joy','garden','#ACCBC1','#E8E4D5',['cat','raincoat','garden']],
 ['panda-boba','Panda Boba Break','halo','#C8C0D9','#E9D7C1',['panda','boba','tea']],
 ['otter-shells','Otter’s Ocean Treasures','halo','#AFD3D3','#DAE7F1',['otter','ocean','shells']],
 ['penguin-post','Penguin’s Winter Post','night','#BECDE2','#F3DDD0',['penguin','snow','letter']],
 ['frog-greenhouse','Frog’s Tiny Greenhouse','garden','#B9CFB5','#F5E7BC',['frog','greenhouse','plants']],
 ['red-panda-autumn','Red Panda, Maple Morning','garden','#D9C3A4','#F3D7BD',['red panda','autumn','maple']]
];
return specs.map(([slug,title,bg,c1,c2,tags],i)=>{
 const p=makePage('kawaii-'+slug,title,'Kawaii','Easy',tags,[IVORY,INK,c1,c2,'#F5B5B9','#F1BC72'],`An original cozy ${tags[0]} illustration with bold welcoming shapes and generous coloring regions.`);backdrop(p,bg,c1,c2);const a=artist(p,500,680,2.25);
 if(i===0){
  a.r('fox-tail','M75 105C182 120 182-74 92-101C124-30 81-38 66 9L5 77Z','#D68B60',[124,28],'Curled fox tail');
  a.r('tail-tip','M92-101C124-30 81-38 66 9Q89 12 99 40C154 12 156-59 92-101Z',IVORY,[124,-25],'Cream tail tip');
  a.r('body',ellipse(0,91,104,69),'#D68B60',[40,120],'Sleeping fox body');
  a.r('ear-left','M-84-34L-100-124Q-37-115-24-45Z','#D68B60',[-72,-83],'Fox ear');a.r('ear-right','M24-45Q37-115 100-124L84-34Z','#D68B60',[72,-83],'Fox ear');
  a.r('ear-in-left','M-77-49L-86-103Q-49-97-41-52Z','#EAC3B3',[-67,-75],'Inner ear');a.r('ear-in-right','M77-49L86-103Q49-97 41-52Z','#EAC3B3',[67,-75],'Inner ear');
  a.r('face','M-96-31Q-102 53 0 82Q102 53 96-31Q54-91 0-69Q-54-91-96-31Z','#D68B60',[0,-36],'Fox face');
  a.r('muzzle-left','M-96-16Q-60-22 0 51L0 82Q-98 55-96-16Z',IVORY,[-47,38],'Cream muzzle');a.r('muzzle-right','M96-16Q60-22 0 51L0 82Q98 55 96-16Z',IVORY,[47,38],'Cream muzzle');
  kawaiiEyes(a,10,43,true);a.r('nose',poly([[-10,43],[10,43],[0,53]]),INK,[0,47],'Tiny nose');
  a.r('front-paw',ellipse(-35,109,41,23),IVORY,[-36,112],'Resting paw');a.l('M-54 102V117M-39 100V118');
  a.sh('M-98 92Q-43 150 97 110Q88 153 0 160Q-79 162-98 92Z');
  flower(p,'bedside-flower',219,1010,52,['#E9B8CA','#F5D49D'],5);
 }else if(i===1){
  a.r('bunny-ear-l','M-59-44C-117-194-62-227-27-52Z',IVORY,[-67,-128],'Long rabbit ear');a.r('bunny-ear-r','M20-57C20-234 91-202 62-41Z',IVORY,[52,-126],'Long rabbit ear');
  a.r('inner-ear-l','M-54-58C-84-176-68-183-39-55Z','#F5B5B9',[-61,-124],'Pink inner ear');a.r('inner-ear-r','M34-59C35-181 68-174 50-51Z','#F5B5B9',[46,-120],'Pink inner ear');
  a.r('face',ellipse(0,-6,89,82),IVORY,[0,-38],'Rabbit face');kawaiiEyes(a,0,35);a.r('nose',ellipse(0,21,6,4),'#C38893',[0,21],'Rabbit nose');
  a.r('cup-handle',`M100 39C183 28 173 138 101 123L99 97C139 107 147 66 108 68Z`,'#B4C6A1',[140,77],'Porcelain cup handle');
  a.r('cup','M-112 49Q-119 169 0 176Q119 169 112 49Z','#B4C6A1',[10,128],'Matcha tea cup');a.r('tea-rim',ellipse(0,49,112,24),'#729565',[0,60],'Matcha surface');
  a.r('paw-left',ellipse(-57,51,26,18),IVORY,[-57,51],'Rabbit paw');a.r('paw-right',ellipse(57,51,26,18),IVORY,[57,51],'Rabbit paw');
  a.r('cup-heart',heart(0,109,.6),'#F5DBD7',[0,102],'Heart motif');a.l('M-83 118Q-75 146-54 153',2.5);
  a.sh('M64 72Q75 137 27 172Q92 166 106 87Z');flower(p,'counter-daisy',210,1025,43,['#FFF9EF','#F1BC72'],5);
 }else if(i===2){
  for(const side of [-1,1])for(let j=0;j<3;j++){const y=-61+j*43; a.r(`gill-${side}-${j}`,`M${side*66} ${y+13}Q${side*137} ${y-55} ${side*147} ${y-14}Q${side*140} ${y+23} ${side*71} ${y+33}Z`,'#E49AAD',[side*119,y+3],'Feathery axolotl gill');}
  a.r('tail','M56 72Q163 40 156 164Q75 187 20 140Z','#D5BCE7',[115,137],'Axolotl fin');
  a.r('body','M-48 47Q-109 149-25 176L47 165Q101 118 46 50Z','#F1CBDC',[0,137],'Axolotl body');
  a.r('foot-left','M-37 139Q-100 137-105 172Q-73 190-30 169Z','#F1CBDC',[-65,165],'Little foot');a.r('foot-right','M43 139Q103 137 110 172Q78 190 33 168Z','#F1CBDC',[68,165],'Little foot');
  a.r('face',ellipse(0,0,99,79),'#F1CBDC',[0,-40],'Axolotl face');kawaiiEyes(a,3,40);
  a.r('belly',ellipse(1,118,30,38),IVORY,[1,118],'Cream belly');
  a.r('arm-left','M-41 80Q-81 59-93 101Q-75 121-47 109Z','#F1CBDC',[-69,94],'Waving arm');a.r('arm-right','M43 82Q81 62 86 111Q67 126 43 108Z','#F1CBDC',[65,100],'Waving arm');
  for(let j=0;j<4;j++){region(p,`bubble-${j}`,circle(185+j%2*615,410+j*126,15+j*3),'#DCECF2',[185+j%2*615,410+j*126],'Water bubble',2.6);}
  a.sh('M-93 22Q-31 101 81 37Q55 93-1 81Q-69 78-93 22Z',.09);
  region(p,'lily-pad',ellipse(739,1075,102,35),'#A2C3A8',[759,1080],'Lily pad');flower(p,'water-lily',744,1027,46,['#FFF9EF','#F1BC72'],5);
 }else if(i===3){
  a.r('body','M-73 45Q-120 157-55 178H67Q113 150 72 46Z','#D5A072',[5,133],'Corgi body');
  a.r('ear-left','M-82-27L-109-131Q-36-143-32-58Z','#D5A072',[-72,-90],'Corgi ear');a.r('ear-right','M82-27L109-131Q36-143 32-58Z','#D5A072',[72,-90],'Corgi ear');
  a.r('ear-inner-left',poly([[-79,-48],[-91,-109],[-48,-65]]),'#DEAFA7',[-73,-80],'Inner ear');a.r('ear-inner-right',poly([[79,-48],[91,-109],[48,-65]]),'#DEAFA7',[73,-80],'Inner ear');
  a.r('face',ellipse(0,-3,101,87),'#D5A072',[65,-40],'Corgi face');a.r('blaze','M-13-87Q-21-44-43 4Q-57 25-80 30Q-63 75 0 84Q64 76 80 30Q50 30 37 5Q15-50 13-87Z',IVORY,[0,-32],'Cream face blaze');
  kawaiiEyes(a,5,46);a.r('nose',ellipse(0,29,12,8),INK,[0,29],'Dog nose');a.l('M0 37V45Q-13 59-24 43M0 45Q13 59 24 43',2);
  a.r('apron','M-57 61L-45 142Q0 164 47 142L58 61L23 79H-23Z','#ACC2BC',[0,115],'Baker apron');
  a.r('bread','M-67 137C-87 65 88 63 76 137Q21 173-67 137Z','#EBC38A',[4,134],'Fresh baked loaf');a.l('M-36 99L-47 123M-2 91L-14 119M31 94L17 123',3);
  a.r('paw-left',ellipse(-74,130,25,28),IVORY,[-74,130],'Corgi paw');a.r('paw-right',ellipse(76,130,25,28),IVORY,[76,130],'Corgi paw');
  a.r('chef-hat','M-55-83V-115C-102-141-61-188-24-166C-7-204 45-200 51-162C103-173 120-117  60-115L60-83Z',IVORY,[4,-143],'Baker hat');
  a.r('hat-band',rect(-55,-107,115,25,6),'#ACC2BC',[0,-95],'Hat band');a.sh('M45 87Q74 105 76 137Q36 157-35 149Q52 138 45 87Z');
 }else if(i===4){
  a.r('umbrella-pole',rect(92,-80,7,232,3),'#B49A80',[95,110],'Umbrella handle');a.l('M96 147Q96 170 78 168Q60 165 69 154',3);
  a.r('umbrella','M-35-110Q96-300 221-110Q181-145 156-110Q123-143 94-110Q 60-145 29-110Q-6-141-35-110Z','#E7BF77',[94,-181],'Rain umbrella');
  a.l('M96-232Q58-200 29-110M96-232Q133-195 156-110',2);
  a.r('coat','M-61 44Q-112 64-96 127L-78 177Q0 193 79 177L98 123Q110 65 61 44Z','#E7BF77',[38,132],'Yellow raincoat');
  a.r('ear-left',poly([[-89,-38],[-89,-116],[-25,-74]]),'#BFC3D0',[-72,-74],'Kitten ear');a.r('ear-right',poly([[89,-38],[89,-116],[25,-74]]),'#BFC3D0',[72,-74],'Kitten ear');
  a.r('face',ellipse(0,-5,100,81),'#D4D5DF',[0,-34],'Kitten face');a.r('muzzle',ellipse(0,32,33,25),IVORY,[0,42],'Cream muzzle');kawaiiEyes(a,0,38);a.r('nose',poly([[-7,21],[7,21],[0,27]]),'#BB879B',[0,23],'Pink nose');
  a.l('M-65 28L-110 19M-66 39L-107 46M65 28L110 19M66 39L107 46');
  a.r('collar-left',poly([[-52,65],[0,84],[-29,107]]),'#FFF4C9',[-25,84],'Raincoat collar');a.r('collar-right',poly([[52,65],[0,84],[29,107]]),'#FFF4C9',[25,84],'Raincoat collar');
  a.r('boot-left',rect(-65,165,56,39,12),'#91AEA8',[-38,190],'Rain boot');a.r('boot-right',rect(10,165,56,39,12),'#91AEA8',[38,190],'Rain boot');
  a.r('paw-left',ellipse(-90,114,20,25),'#D4D5DF',[-90,114],'Kitten paw');a.r('paw-right',ellipse(97,78,19,23),'#D4D5DF',[97,78],'Umbrella paw');
  for(let j=0;j<3;j++)a.r('coat-button-'+j,circle(0,110+j*26,4.5),'#F7E5B8',[0,110+j*26],'Coat button',1.6);
 }else if(i===5){
  a.r('left-ear',circle(-78,-65,35),INK,[-85,-75],'Panda ear');a.r('right-ear',circle(78,-65,35),INK,[85,-75],'Panda ear');
  a.r('body',ellipse(0,104,97,81),IVORY,[0,139],'Panda body');a.r('left-foot',ellipse(-69,155,34,27),INK,[-69,155],'Panda paw');a.r('right-foot',ellipse(69,155,34,27),INK,[69,155],'Panda paw');
  a.r('face',ellipse(0,-2,109,90),IVORY,[0,-47],'Panda face');a.r('eye-patch-left',ellipse(-44,5,27,35),'#7C748B',[-60,8],'Panda eye patch');a.r('eye-patch-right',ellipse(44,5,27,35),'#7C748B',[60,8],'Panda eye patch');kawaiiEyes(a,0,43);a.r('nose',ellipse(0,27,9,6),INK,[0,27],'Panda nose');
  a.r('boba-cup','M-47 88H50L38 181H-35Z','#CBAE97',[8,138],'Milk tea');a.r('cup-lid',rect(-56,77,116,16,5),'#B7A8C8',[0,85],'Cup lid');a.r('straw',poly([[15,81],[27,81],[43,15],[31,15]]),'#AAC9BB',[31,47],'Tea straw');
  a.r('arm-left','M-77 74Q-129 112-40 140L-26 117Z',INK,[-67,116],'Panda arm');a.r('arm-right','M75 74Q121 107 45 138L29 114Z',INK,[66,113],'Panda arm');
  for(let j=0;j<6;j++){const x=-23+(j%3)*22,y=154+Math.floor(j/3)*16;a.r(`boba-pearl-${j}`,circle(x,y,7),'#7C5C68',[x,y],'Tapioca pearl',1.5);}
  region(p,'bamboo-leaf',leaf(230,439,1.2,-1),'#AAC9BB',[215,372],'Bamboo leaf');
 }else if(i===6){
  a.r('tail','M52 125Q163 150 139 188Q65 194 18 162Z','#A98979',[99,170],'Otter tail');a.r('body',ellipse(0,90,82,113),'#A98979',[43,148],'Otter body');
  a.r('ear-left',circle(-75,-48,27),'#A98979',[-82,-58],'Otter ear');a.r('ear-right',circle(75,-48,27),'#A98979',[82,-58],'Otter ear');a.r('face',ellipse(0,1,94,75),'#A98979',[0,-33],'Otter face');a.r('muzzle',ellipse(0,30,55,34),'#EAD3BA',[0,44],'Cream muzzle');kawaiiEyes(a,0,38);a.r('nose',ellipse(0,22,11,7),INK,[0,22],'Otter nose');
  a.r('belly',ellipse(0,114,51,65),'#EAD3BA',[0,146],'Cream tummy');a.r('shell',`M-43 107C-91 82-64 38-39 64C-49 19-7 25 0 54C11 12 49 29 41 65C74 35 92 87 46 106Z`,'#D9B2C6',[0,84],'Seashell treasure');a.l('M0 103V56M-13 102L-35 63M16 102L42 64',2);
  a.r('left-paw',ellipse(-51,102,21,31),'#A98979',[-51,102],'Otter paw');a.r('right-paw',ellipse(51,102,21,31),'#A98979',[51,102],'Otter paw');a.r('left-foot',ellipse(-47,180,33,20),'#A98979',[-47,180],'Otter foot');a.r('right-foot',ellipse(43,180,33,20),'#A98979',[43,180],'Otter foot');
  region(p,'starfish',star(210,1080,52,5,25),'#E8B298',[210,1080],'Beach starfish');region(p,'pearl',circle(800,1053,30),IVORY,[800,1053],'Ocean pearl');
 }else if(i===7){
  a.r('left-flipper','M-67 20Q-132 47-122 129Q-80 133-54 71Z','#7E92B0',[-103,88],'Penguin flipper');a.r('right-flipper','M67 20Q142-11 144 71Q105 86 57 61Z','#7E92B0',[112,48],'Waving flipper');
  a.r('left-foot',ellipse(-51,168,43,22),'#E6B283',[-51,168],'Penguin foot');a.r('right-foot',ellipse(51,168,43,22),'#E6B283',[51,168],'Penguin foot');a.r('body','M-87-38Q-133 179 0 183Q133 179 87-38Q66-119 0-100Q-66-119-87-38Z','#7E92B0',[75,91],'Penguin body');
  a.r('belly','M-71 1Q-97 148 0 158Q97 148 71 1Q41-57 0-14Q-41-57-71 1Z',IVORY,[0,111],'Cream belly');kawaiiEyes(a,13,36);a.r('beak',poly([[-17,37],[17,37],[0,53]]),'#E6B283',[0,42],'Penguin beak');
  a.r('hat','M-99-44Q-87-153 18-146Q82-127 100-44Z','#D9A9B7',[0,-101],'Winter beanie');a.r('hat-brim',rect(-102,-53,204,29,12),'#F0CBD1',[0,-39],'Hat brim');a.r('pom',circle(13,-151,23),IVORY,[13,-151],'Hat pompom');
  a.r('scarf','M-85 58Q0 96 84 57L89 85Q0 127-87 85Z','#D9A9B7',[-36,85],'Winter scarf');a.r('scarf-tail','M40 97L82 88L97 157L56 167Z','#D9A9B7',[72,133],'Scarf end');a.l('M56 154L92 146M60 162L65 169M72 158L78 166M84 154L90 161',1.8);
  a.r('letter',rect(-65,106,103,59,5),'#E5D6BA',[-15,151],'Friendship letter');a.l('M-62 109L-14 141L35 109');a.r('letter-heart',heart(-14,136,.27),'#BD8097',[-14,132],'Heart seal',1.2);
 }else if(i===8){
  a.r('body',ellipse(0,99,103,94),'#A7BF8D',[50,135],'Frog body');a.r('left-foot',ellipse(-83,168,52,22),'#A7BF8D',[-83,168],'Frog foot');a.r('right-foot',ellipse(83,168,52,22),'#A7BF8D',[83,168],'Frog foot');
  a.r('left-eye-bump',circle(-66,-43,44),'#A7BF8D',[-89,-53],'Frog eye mound');a.r('right-eye-bump',circle(66,-43,44),'#A7BF8D',[89,-53],'Frog eye mound');a.r('head',ellipse(0,15,108,69),'#A7BF8D',[0,-17],'Frog face');
  for(const x of [-65,65]){a.r(`eye-white-${x}`,circle(x,-33,28),IVORY,[x-14,-37],'Bright frog eye');a.r(`eye-${x}`,ellipse(x,-30,10,15),INK,[x,-26],'Frog pupil');a.r(`eye-glint-${x}`,circle(x-3,-36,3.5),IVORY,[x-3,-36],'Eye shine',1);}
  a.r('cheek-left',ellipse(-61,23,17,10),'#E1AEAB',[-61,23],'Pink cheek');a.r('cheek-right',ellipse(61,23,17,10),'#E1AEAB',[61,23],'Pink cheek');a.l('M-23 30Q0 53 23 30',3);
  a.r('overalls','M-57 65L-45 127Q0 148 44 127L57 65L29 73V98H-29V73Z','#CAB694',[0,118],'Gardener overalls');
  a.r('pot','M-37 138H38L28 183H-27Z','#C68F74',[0,163],'Terracotta plant pot');a.r('pot-rim',rect(-43,129,85,15,4),'#D7A78A',[0,136],'Plant pot rim');a.l('M0 129V68',2.4);a.r('sprout-left','M0 108Q-53 102-47 67Q-3 60 0 108Z','#718F68',[-25,86],'New plant leaf');a.r('sprout-right','M0 95Q0 54 43 55Q52 92 0 95Z','#8EA579',[23,73],'New plant leaf');
  a.r('arm-left',ellipse(-54,130,22,32),'#A7BF8D',[-54,130],'Frog hand');a.r('arm-right',ellipse(54,130,22,32),'#A7BF8D',[54,130],'Frog hand');
 }else{
  a.r('tail','M58 108Q187-27 187 112Q181 211 51 171Z','#B97758',[146,141],'Fluffy red panda tail');a.r('tail-band-one','M127 38Q161 33 185 57L187 88Q163 68 112 80Z','#E5BA91',[155,62],'Tail stripe');a.r('tail-band-two','M91 111Q144 107 180 141Q175 160 154 178Q123 141 74 141Z','#E5BA91',[128,138],'Tail stripe');
  a.r('body',ellipse(0,109,82,84),'#86675F',[0,136],'Red panda body');a.r('ear-left','M-89-36Q-128-132-35-77Z','#B97758',[-80,-80],'Red panda ear');a.r('ear-right','M89-36Q128-132 35-77Z','#B97758',[80,-80],'Red panda ear');
  a.r('ear-inner-left',poly([[-85,-51],[-93,-93],[-56,-74]]),'#F2E3CF',[-79,-73],'Ear fluff');a.r('ear-inner-right',poly([[85,-51],[93,-93],[56,-74]]),'#F2E3CF',[79,-73],'Ear fluff');
  a.r('face',ellipse(0,0,103,85),'#B97758',[0,-43],'Red panda face');a.r('mask-left','M-95 0Q-57-57-13-7L-13 46Q-62 85-89 43Z','#F2E3CF',[-54,15],'Cream face marking');a.r('mask-right','M95 0Q57-57 13-7L13 46Q62 85 89 43Z','#F2E3CF',[54,15],'Cream face marking');a.r('muzzle',ellipse(0,48,38,26),'#F2E3CF',[0,60],'Red panda muzzle');kawaiiEyes(a,8,43);a.r('nose',ellipse(0,36,10,6),INK,[0,36],'Little nose');
  a.r('scarf','M-69 73Q0 109 69 73L70 100Q0 136-70 100Z','#BCC39D',[-18,103],'Autumn scarf');a.r('scarf-tail','M-56 107L-22 119L-50 181L-85 164Z','#BCC39D',[-55,149],'Scarf tail');
  a.r('left-paw',ellipse(-50,169,31,19),'#86675F',[-50,169],'Panda paw');a.r('right-paw',ellipse(50,169,31,19),'#86675F',[50,169],'Panda paw');
  region(p,'maple-leaf',poly([[219,856],[233,905],[269,894],[255,936],[281,945],[233,971],[223,1001],[214,969],[174,953],[195,936],[172,909],[209,918]]),'#D89A70',[224,942],'Falling maple leaf');
 }
 if(p.regions.length<28){for(let n=0;n<28-p.regions.length;n++)spark(p,'small-spark-'+n,175+n%2*630,320+Math.floor(n/2)*125,15,'#F1BC72');}
 return p;
});}

const CHIBI=[
 ['starlight-apprentice','Starlight Apprentice','witch','#72678F','#C4B9E3','#F3DDAD','#F6D6C5','night',['magic','witch','girl']],
 ['skate-day','Saturday Skate Club','skater','#54485B','#C4D4C5','#E7B6A1','#E6B998','halo',['skateboard','boy','streetwear']],
 ['strawberry-chef','Strawberry Pâtissière','chef','#AB765F','#E8BAC2','#E6D4AF','#F6D6C5','cafe',['baking','chef','girl']],
 ['cloud-pilot','Little Cloud Pilot','pilot','#71675C','#A5BECF','#D7BA8E','#D8A17F','halo',['pilot','goggles','boy']],
 ['garden-poet','The Garden Poet','poet','#55506D','#BFCAB1','#EACAD3','#A57564','garden',['books','garden','girl']],
 ['moon-bard','Moonbeam Busker','bard','#BE936B','#A4BFB7','#D4C3DC','#F3D2B9','night',['music','guitar','boy']],
 ['ramen-hero','Midnight Ramen Hero','ramen','#4C5265','#DEC28F','#A3BAB7','#DCB090','cafe',['ramen','food','boy']],
 ['flower-courier','Petal Post Courier','courier','#B38997','#B8C8D8','#DAB99C','#F2C9B7','garden',['flowers','letters','girl']],
 ['star-astronaut','Pocket Astronaut','space','#83758E','#B8CAD9','#F0D9B7','#BC8B76','night',['space','astronaut','girl']],
 ['forest-ranger','Acorn Trail Ranger','ranger','#74614C','#A6B59C','#DAC3A0','#E2AF8D','garden',['forest','ranger','boy']]
];
function chibiHead(a,hair,skin,style=0){
 if([1,3,5,6,9].includes(style))a.r('hair-back','M-94 35Q-112-89-62-127Q0-170 72-119Q117-92 98 39L93 65L64 45H-66L-93 65Z',hair,[-89,22],'Short back hair');
 else a.r('hair-back','M-96 5Q-112-89-62-127Q0-170 72-119Q117-92 104 33L100 130Q70 150 48 91H-50Q-70 160-105 123Z',hair,[-88,91],'Back hair');
 if(style===4||style===7){a.r('pony-left','M-86-44Q-161-75-154 31Q-141 95-114 134Q-161 137-179 71Q-186-34-117-78Z',hair,[-155,27],'Left ponytail');a.r('pony-right','M86-44Q161-75 154 31Q141 95 114 134Q161 137 179 71Q186-34 117-78Z',hair,[155,27],'Right ponytail');}
 a.r('neck',rect(-21,70,42,54,10),skin,[0,97],'Neck');
 a.r('ear-left',ellipse(-85,23,13,22),skin,[-90,28],'Left ear');a.r('ear-right',ellipse(85,23,13,22),skin,[90,28],'Right ear');
 a.r('face','M-84-47Q-99 56-54 82Q0 119 54 82Q99 56 84-47Q45-103 0-99Q-45-103-84-47Z',skin,[0,29],'Face');
 for(const [side,x] of [['left',-36],['right',36]]){
  a.r('eye-'+side,`M${x-22} 12Q${x} -4 ${x+22} 12Q${x+23} 47 ${x} 52Q${x-22} 47 ${x-22} 12Z`,IVORY,[x-14,24],'Eye white',1.9);
  a.r('iris-'+side,ellipse(x+2,29,13,21),style%3===0?'#9878A9':style%3===1?'#779D8C':'#8AACC5',[x+4,36],'Luminous iris',1.5);
  a.r('pupil-'+side,ellipse(x+3,27,6,13),INK,[x+3,29],'Pupil',1.1);
  a.r('glint-'+side,circle(x-3,17,5.5),IVORY,[x-3,17],'Eye highlight',.9);
  a.l(`M${x-23} 11Q${x} -6 ${x+23} 11`,3.5);a.l(`M${x-18} -13Q${x} -20 ${x+16} -12`,1.9);
 }
 a.r('blush-left',ellipse(-58,56,13,7),'#E7A8AA',[-58,56],'Soft cheek',1);a.r('blush-right',ellipse(58,56,13,7),'#E7A8AA',[58,56],'Soft cheek',1);
 a.l('M-8 73Q0 80 8 73M1 43L-2 51L2 52',1.5);
 if(style%3===0){
 a.r('fringe-left','M-90-35Q-105-121-12-135L30-109Q-46-88-65 15L-88 2Z',hair,[-62,-69],'Sweeping fringe');
 a.r('fringe-mid','M-12-135Q76-148  90-67L85-11Q56-43 10-66L16-20Q-22-43-31-77Z',hair,[34,-80],'Layered bangs');
 }else if(style%3===1){
 a.r('fringe-left','M-99-17L-106-82L-71-85L-75-120L-38-105L-24-147L8-108Q-55-44-99-17Z',hair,[-55,-80],'Tousled fringe');
 a.r('fringe-right','M-24-147L21-119L49-141L64-102L93-106L85-82L107-53L93 10Q52-18 22-82L3-29Q-3-56-14-74Z',hair,[47,-76],'Spiky hair');
 }else{
 a.r('fringe-left','M-98-12Q-113-126-5-133L-15-60Q-44-14-96 5Z',hair,[-66,-68],'Parted fringe');
 a.r('fringe-right','M-5-133Q108-134 99 3Q45-4 13-69L-15-33L-15-60Z',hair,[59,-68],'Parted fringe');
 }
 a.l('M-77-69Q-83-26-77 8M75-71Q84-27 81 5',1.4);
 a.sh('M-82 44Q-49 105 11 103Q-33 111-68 84Z',.11);a.sh('M15-119Q76-107 92-34L88-12Q51-55 30-82Z',.11);
}
function makeChibi(){return CHIBI.map(([slug,title,kind,hair,outfit,accent,skin,bg,tags],i)=>{
 const p=makePage('chibi-'+slug,title,'Chibi','Easy',tags,[IVORY,INK,hair,outfit,accent,skin,'#E7A8AA'],`An original miniature ${tags[tags.length-1]} character in a ${kind}-inspired outfit, with large shapes and expressive anime eyes.`);backdrop(p,bg,outfit,'#F0E8EC');const a=artist(p,500,458,1.98);
 // Legs and shoes remain separate from each outfit, with generous reachable shapes.
 a.r('leg-left','M-56 224L-58 294Q-36 310-17 294L-11 224Z',skin,[-36,263],'Left leg');a.r('leg-right','M12 224L18 294Q38 309 58 294L54 224Z',skin,[35,263],'Right leg');
 a.r('shoe-left','M-60 281L-16 281L-10 310Q-38 329-86 316Q-91 291-60 281Z',hair,[-44,305],'Left shoe');a.r('shoe-right','M16 281L59 281Q88 290 86 316Q38 329 10 310Z',hair,[44,305],'Right shoe');
 a.r('left-sleeve','M-47 112Q-104 109-107 180L-69 192L-42 155Z',outfit,[-79,152],'Left sleeve');a.r('right-sleeve','M47 112Q105 104 111 169L72 188L41 151Z',outfit,[81,149],'Right sleeve');
 a.r('hand-left','M-104 173Q-126 192-107 218Q-87 236-70 198L-68 186Z',skin,[-93,202],'Left hand');a.r('hand-right','M73 177Q77 226 100 214Q123 205 111 174Z',skin,[96,197],'Right hand');
 a.r('outfit','M-51 107Q0 95 51 107L74 239Q0 264-74 239Z',outfit,[4,188],kind+' outfit');
 if(kind==='witch'){
 a.r('cape','M-41 102Q-67 106-80 156L-111 250L-62 226L-44 253L-16 160H17L 44 253L62 226L111 250L80 156Q67 106 41 102Z','#9381AF',[-59,176],'Apprentice cape');
 a.r('collar',poly([[-43,107],[0,153],[43,107],[29,159],[-29,159]]),accent,[0,140],'Star collar');a.r('dress-star',star(0,197,22),accent,[0,197],'Dress star');
 }else if(kind==='skater'){
 a.r('shirt',rect(-39,119,77,119,8),IVORY,[0,176],'Skater T-shirt');a.r('jacket-left','M-47 112L-13 119L-29 233L-70 238Z',outfit,[-45,191],'Open jacket');a.r('jacket-right','M47 112L13 119L29 233L70 238Z',outfit,[45,191],'Open jacket');
 a.r('shirt-bolt',poly([[7,149],[-20,184],[-2,182],[-13,211],[24,172],[7,177]]),accent,[1,179],'Lightning graphic');
 }else if(kind==='chef'){
 a.r('apron','M-33 131H33L55 237Q0 253-55 237Z',IVORY,[0,206],'Baker apron');a.r('apron-pocket',rect(-26,194,52,32,9),accent,[0,209],'Apron pocket');a.r('apron-bow',`M0 147Q-50 113-40 159Q-24 176 0 155Q24 176 40 159Q50 113 0 147Z`,'#D996A8',[28,153],'Apron bow');
 }else if(kind==='pilot'){
 a.r('flight-vest',rect(-43,128,86,107,12),'#AB967B',[0,193],'Flight vest');a.r('scarf',`M-45 108Q0 149 44 108L53 134Q0 166-53 134Z`,accent,[-17,135],'Pilot scarf');a.r('scarf-tail','M-32 145L-10 153Q-4 192-38 224L-63 208Q-20 181-32 145Z',accent,[-37,194],'Windblown scarf');
 a.l('M12 153V233M23 178H35M23 207H35',2);
 }else if(kind==='poet'){
 a.r('pinafore','M-35 115L-30 153H30L35 115L53 120L 70 244H-70L-53 120Z',accent,[0,220],'Poet pinafore');a.r('collar-left',poly([[-36,107],[0,128],[-21,146]]),IVORY,[-20,128],'Blouse collar');a.r('collar-right',poly([[36,107],[0,128],[21,146]]),IVORY,[20,128],'Blouse collar');
 }else if(kind==='bard'){
 a.r('vest-left','M-48 111L-9 123L-16 232L-66 240Z',accent,[-40,181],'Musician vest');a.r('vest-right','M48 111L9 123L16 232L66 240Z',accent,[40,181],'Musician vest');a.r('neck-tie','M-9 126H9L17 175L0 191L-17 175Z',hair,[0,167],'Neck tie');
 }else if(kind==='ramen'){
 a.r('jacket-lapel-left',poly([[-45,112],[11,154],[-9,192],[-65,134]]),accent,[-24,147],'Crossed jacket lapel');a.r('jacket-lapel-right',poly([[45,112],[-11,154],[9,192],[65,134]]),accent,[24,147],'Crossed jacket lapel');a.r('waist-belt',rect(-65,202,130,21,5),'#A3BAB7',[0,212],'Chef belt');
 }else if(kind==='courier'){
 a.r('coat-panel-left','M-46 111L-5 128L-12 244L-68 239Z',outfit,[-36,213],'Courier coat');a.r('coat-panel-right','M46 111L5 128L12 244L68 239Z',outfit,[36,213],'Courier coat');
 a.r('cross-body-strap',poly([[-50,111],[-36,105],[67,233],[50,242]]),accent,[10,174],'Satchel strap');a.r('satchel',rect(21,204,76,61,12),'#AE876F',[61,248],'Letter satchel');a.r('satchel-flap',rect(19,202,80,26,8),accent,[61,217],'Satchel flap');
 }else if(kind==='space'){
 a.r('spacesuit-chest',rect(-40,133,80, 80,14),accent,[0,173],'Suit controls');
 }else{
 a.r('vest','M-45 117L-10 136H10L45 117L62 234H-62Z',accent,[0,201],'Ranger vest');a.r('left-pocket',rect(-48,179,34,32,6),outfit,[-32,195],'Ranger pocket');a.r('right-pocket',rect(14,179,34,32,6),outfit,[32,195],'Ranger pocket');a.r('neckerchief','M-42 110L0 166L42 110L23 164L0 181L-23 164Z','#B27C62',[0,158],'Trail neckerchief');
 }
 chibiHead(a,hair,skin,i);
 if(kind==='witch'){
 a.r('witch-hat','M-103-96Q-90-159-28-219Q13-150 66-125L107-98Q8-55-103-96Z',outfit,[-23,-140],'Witch hat');a.r('hat-band','M-72-140Q-1-107  67-127L81-113Q10-80-88-119Z',accent,[0,-115],'Hat ribbon');a.r('hat-star',star(15,-126,14),IVORY,[15,-126],'Hat star');
 a.r('wand',poly([[109,200],[114,201],[157,73],[150,70]]),accent,[136,126],'Magic wand');a.r('wand-star',star(154,64,25),'#EBCB86',[154,64],'Wand star');
 }else if(kind==='skater'){
 a.r('cap-top','M-92-80Q-91-168 28-145Q85-140 96-86Z',accent,[12,-113],'Skater cap');a.r('cap-brim','M-92-81Q-31-94 33-80Q-9-53-114-63Z',hair,[-54,-71],'Cap brim');
 a.r('skateboard','M130 100Q163 89 166 123L127 293Q116 317 97 300L91 282Z',accent,[132,211],'Skateboard deck');a.r('wheel-one',circle(140,129,11),INK,[140,129],'Skateboard wheel');a.r('wheel-two',circle(109,277,11),INK,[109,277],'Skateboard wheel');a.r('deck-star',star(130,196,17),outfit,[130,196],'Deck emblem');
 }else if(kind==='chef'){
 a.r('chef-hat','M-76-103V-134C-131-165-78-206-44-184C-25-227 32-225 49-183C96-207 134-158 77-132V-103Z',IVORY,[0,-172],'Pastry chef hat');a.r('hat-band',rect(-77,-127,155,27,7),accent,[0,-114],'Chef hat band');
 a.r('cake',rect(-128,161,72,46,5),'#E3B796',[-90,190],'Strawberry cake');
 a.r('icing','M-128 162Q-105 148-93 161Q-76 148-56 162V175Q-71 188-84 172Q-102 189-128 175Z',IVORY,[-89,165],'Cream frosting');a.r('strawberry','M-110 143Q-96 124-84 143Q-85 161-97 166Q-109 158-110 143Z','#C37C8C',[-97,145],'Strawberry');
 }else if(kind==='pilot'){
 a.r('goggle-strap',rect(-97,-92,194,22,7),'#B08B67',[0,-81],'Goggle strap');a.r('goggle-left',ellipse(-43,-82,31,23),accent,[-43,-82],'Pilot goggles');a.r('goggle-right',ellipse(43,-82,31,23),accent,[43,-82],'Pilot goggles');a.r('glass-left',ellipse(-43,-82,22,15),'#C4D9E1',[-43,-82],'Goggle glass');a.r('glass-right',ellipse(43,-82,22,15),'#C4D9E1',[43,-82],'Goggle glass');
 }else if(kind==='poet'){
 a.r('book-left',poly([[-102,156],[-4,183],[-4,252],[-103,224]]),'#B0BCCF',[-57,206],'Book cover');a.r('book-right',poly([[-4,183],[83,152],[83,223],[-4,252]]),'#EBD6AF',[40,207],'Book pages');a.l('M9 191L69 170M9 207L69 186M9 223L69 202',1.5);
 flower(p,'hair-daisy',651,330,34,[IVORY,'#DDBD80'],5);
 }else if(kind==='bard'){
 a.r('guitar-neck',poly([[23,210],[121,116],[133,128],[ 40,227]]),hair,[84,164],'Guitar neck');
 a.r('guitar','M-12 177C-45 153-78 180-61 206C-114 216-83 285-37 265C10 290 50 241 11 219C 40 190 19 164-12 177Z',accent,[-30,232],'Tiny guitar');a.r('guitar-hole',circle(-20,213,15),hair,[-20,213],'Guitar sound hole');a.l('M-50 243L111 130M-46 247L115 134',1.2);
 }else if(kind==='ramen'){
 a.r('headband',`M-91-70Q0-109 91-70L96-46Q0-78-96-46Z`,IVORY,[0,-80],'Chef headband');
 a.r('ramen-bowl','M-80 165H88Q76 231 4 239Q-68 231-80 165Z','#A3BAB7',[4,208],'Ramen bowl');a.r('noodles',ellipse(4,165,84,20),'#EFDCB2',[4,164],'Golden noodles');a.l('M-60 162Q-26 145-10 162T32 160T69 163',1.6);a.r('egg',ellipse( 40,162,23,14),IVORY,[40,159],'Egg white');a.r('yolk',ellipse(40,163,10,7),'#D7B36F',[40,163],'Egg yolk');
 }else if(kind==='courier'){
 a.r('beret','M-97-95Q-100-154-5-157Q101-164 108-102L75-79Q0-111-77-79Z',outfit,[0,-129],'Courier beret');a.r('hat-badge',star(43,-114,16),accent,[43,-114],'Postal star');
 a.r('letter',poly([[-146,134],[-67,117],[-55,177],[-134,194]]),IVORY,[-105,166],'Handwritten letter');a.l('M-142 139L-100 165L-70 122');a.r('wax-seal',circle(-100,164,8),'#D599AA',[-100,164],'Wax seal');
 }else if(kind==='space'){
 a.r('helmet-rim','M-118 1Q-146-150 0-167Q146-150 118 1L102 51L89 35Q137-116 0-141Q-137-116-89 35L-102 51Z',IVORY,[0,-154],'Space helmet rim');a.r('antenna',rect(106,-140,6,65,3),accent,[109,-106],'Helmet antenna');a.r('antenna-star',star(109,-151,18),accent,[109,-151],'Antenna star');a.r('suit-panel',rect(-39,136,78,63,10),accent,[0,176],'Suit control panel');a.r('panel-meter',rect(-28,148,56,19,5),'#8AABC0',[0,157],'Oxygen monitor');a.r('panel-button',circle(18,182,6),'#C48C9E',[18,182],'Control button');
 }else{
 a.r('ranger-hat','M-96-90Q-62-133-44-151H42Q76-128 97-90Q148-86 120-66Q0-29-120-66Q-148-86-96-90Z',accent,[0,-104],'Ranger hat');a.r('hat-band','M-77-107Q0-86 77-107L 90-88Q0-61-90-88Z',outfit,[0,-86],'Ranger hat band');a.r('walking-stick',poly([[-130,130],[-121,128],[-107,318],[-117,319]]),hair,[-119,226],'Walking stick');
 a.r('acorn',`M103 152Q84 214 123 227Q163 214 143 152Z`,'#B18D65',[123,192],'Acorn companion');a.r('acorn-cap',`M 95 169Q95 139 123 138Q151 139 151 169Z`,hair,[123,155],'Acorn cap');a.r('acorn-stem',rect(120,127,7,14,3),hair,[123,133],'Acorn stem');
 }
 a.sh('M49 159L73 238L17 252Q53 207 49 159Z',.11);return p;
});}

const HEROES=[
 {slug:'aurora-sentinel',title:'Aurora Sentinel',skin:'#E8B799',hair:'#514D70',suit:'#777AAA',trim:'#E0BB81',accent:'#B9DCD4',pose:0,theme:'sky',female:true,tags:['guardian','cape','aurora']},
 {slug:'velocity-red',title:'Velocity, Before Sunrise',skin:'#BD846B',hair:'#383D52',suit:'#B96F80',trim:'#E8C088',accent:'#AACDD0',pose:1,theme:'city',female:false,tags:['speed','hero','sunrise']},
 {slug:'lotus-shield',title:'Lotus Shield',skin:'#E8C2AF',hair:'#6C526A',suit:'#B5C7B7',trim:'#D5A8BE',accent:'#E4C791',pose:2,theme:'garden',female:true,tags:['shield','guardian','flowers']},
 {slug:'storm-archer',title:'Stormglass Archer',skin:'#CF9B7A',hair:'#6F767E',suit:'#719DAB',trim:'#D8B980',accent:'#C6BFE1',pose:3,theme:'storm',female:false,tags:['archer','storm','adventure']},
 {slug:'comet-rider',title:'Comet Courier',skin:'#A87663',hair:'#433F50',suit:'#D0A774',trim:'#ADC9CD',accent:'#E0B3C0',pose:4,theme:'space',female:true,tags:['comet','skates','cosmic']},
 {slug:'ink-knight',title:'The Ink Knight',skin:'#E1BDA5',hair:'#454153',suit:'#8B8B9D',trim:'#D0CAC2',accent:'#B6C8D7',pose:5,theme:'manga',female:false,tags:['knight','manga','sword']},
 {slug:'cobalt-oracle',title:'Cobalt Oracle',skin:'#B88976',hair:'#DAD7E5',suit:'#7489AC',trim:'#DCC095',accent:'#BCB1D4',pose:6,theme:'magic',female:true,tags:['oracle','magic','stars']},
 {slug:'solar-bolt',title:'Solar Bolt',skin:'#E8BA90',hair:'#A07859',suit:'#CDA964',trim:'#808FA9',accent:'#E7B5A0',pose:7,theme:'sun',female:false,tags:['solar','power','hero']},
 {slug:'jade-wing',title:'Jade Wing',skin:'#E8C3AF',hair:'#475A60',suit:'#85ACA3',trim:'#C5B1D3',accent:'#E2C795',pose:8,theme:'forest',female:true,tags:['wings','forest','heroine']},
 {slug:'neon-defender',title:'Neon District Defender',skin:'#C19073',hair:'#5A5876',suit:'#8389AF',trim:'#B5D6CB',accent:'#DAA7C4',pose:9,theme:'neon',female:false,tags:['neon','cyberpunk','armor']}
];
const POSES=[
 {el:[-134,174],wl:[-156,253],er:[113,169],wr:[94,226],h:[0,228],kl:[-52,339],al:[-80,451],kr:[52,341],ar:[74,451]},
 {el:[-147,77],wl:[-176,17],er:[133,132],wr:[186,101],h:[10,213],kl:[-65,310],al:[-166,361],kr:[123,282],ar:[159,402]},
 {el:[-114,169],wl:[-152,222],er:[139,126],wr:[151,54],h:[-2,231],kl:[-55,343],al:[-68,451],kr:[56,340],ar:[107,441]},
 {el:[-143,126],wl:[-187,128],er:[101,119],wr:[12,127],h:[18,235],kl:[-54,345],al:[-88,448],kr:[105,333],ar:[155,438]},
 {el:[-104,146],wl:[-186,170],er:[133,88],wr:[185,38],h:[6,229],kl:[-82,302],al:[-152,385],kr:[69,329],ar:[136,410]},
 {el:[-119,167],wl:[-111,249],er:[123,167],wr:[163,220],h:[0,229],kl:[-56,344],al:[-79,451],kr:[69,342],ar:[115,449]},
 {el:[-120,167],wl:[-173,118],er:[129,160],wr:[177,112],h:[0,223],kl:[-31,328],al:[-22,438],kr:[60,327],ar:[25,442]},
 {el:[-123,112],wl:[-107,32],er:[141,183],wr:[181,215],h:[-9,224],kl:[-69,335],al:[-115,445],kr:[60,323],ar:[100,433]},
 {el:[-137,108],wl:[-193,153],er:[146,120],wr:[184,177],h:[1,225],kl:[-72,334],al:[-73,445],kr:[71,327],ar:[104,442]},
 {el:[-110,160],wl:[-172,122],er:[118,159],wr:[133,229],h:[0,229],kl:[-50,338],al:[-78,451],kr:[76,341],ar:[111,443]}
];
function capsule(p1,p2,w1,w2){const [x1,y1]=p1,[x2,y2]=p2,dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
 return `M${x1+nx*w1} ${y1+ny*w1}Q${(x1+x2)/2+nx*(w1+w2)*.5} ${(y1+y2)/2+ny*(w1+w2)*.5} ${x2+nx*w2} ${y2+ny*w2}Q${x2+dx/len*w2} ${y2+dy/len*w2} ${x2-nx*w2} ${y2-ny*w2}L${x1-nx*w1} ${y1-ny*w1}Q${x1-dx/len*w1} ${y1-dy/len*w1} ${x1+nx*w1} ${y1+ny*w1}Z`;
}
const mix=(p1,p2,t)=>[p1[0]+(p2[0]-p1[0])*t,p1[1]+(p2[1]-p1[1])*t];
function comicScene(p,c){
 region(p,'page-paper',rect(35,35,930,1230,32),'#FFF9EF',[57,87],'Comic page paper',3);
 const hard=c.pose>=5;
 region(p,'large-panel',poly([[88,101],[912,75],[912,1080],[88,1140]]),c.accent,[136,265],'Main comic panel',4.5);
 if(c.theme==='city'||c.theme==='neon'){
   for(let j=0;j<5;j++){
    const x=109+j*157,y=489+(j%3)*65;region(p,`building-${j}`,rect(x,y,125,576-y+440,4),j%2?c.trim:'#CDC9D7',[x+20,y+32],'City architecture',2.2);
    for(let k=0;k<(hard?4:2);k++)region(p,`window-${j}-${k}`,rect(x+19+(k%2)*54,y+33+Math.floor(k/2)*73,31,44,4),'#F7E1AE',[x+33+(k%2)*54,y+54+Math.floor(k/2)*73],'City window',1.6);
   }
 }else if(c.theme==='garden'||c.theme==='forest'){
   for(let j=0;j<4;j++){const x=j%2?848:150,y=480+Math.floor(j/2)*429;region(p,`large-leaf-${j}`,leaf(x,y,1.4,j%2?1:-1),'#A1B7A3',[x+(j%2?1:-1)*8,y-84],'Hero garden leaf',2.6);}
   flower(p,'flower-corner-one',183,1070,63,[c.trim,'#E3C284'],6);flower(p,'flower-corner-two',809,310,47,[c.trim,'#E3C284'],5);
 }else if(c.theme==='space'||c.theme==='magic'){
   region(p,'orbital-disc',ellipse(500,398,318,239),'#DCD7E9',[761,305],'Celestial disc',2.4);

   for(let j=0;j<6;j++)spark(p,`celestial-star-${j}`,151+(j%2)*685,219+Math.floor(j/2)*287,19+(j%3)*5,c.trim);
 }else if(c.theme==='sun'||c.theme==='sky'){
   region(p,'sun-disc',circle(493,387,258),'#F6DFB1',[306,253],'Radiant sun',2.4);
   for(let j=0;j<6;j++){const t=(j*31+193)*Math.PI/180;const x=493+Math.cos(t)*315,y=387+Math.sin(t)*315;spark(p,`sunray-${j}`,x,y,22,c.trim);}
   for(const [j,x,y,s] of [[0,163,589,1],[1,804,481,.8]])region(p,`cloud-${j}`,`M${x-69*s} ${y}Q${x-99*s} ${y-45*s} ${x-50*s} ${y-61*s}Q${x-30*s} ${y-118*s} ${x+28*s} ${y-73*s}Q${x+88*s} ${y-77*s} ${x+90*s} ${y}Z`,IVORY,[x,y-32*s],'Passing cloud');
 }else{
   for(let j=0;j<6;j++)region(p,`action-ray-${j}`,poly([[126+j*124,115],[148+j*125,114],[320+j*49,339]]),j%2?c.trim:IVORY,[143+j*120,142],'Action ray',1.5);
   for(let j=0;j<3;j++)line(p,`M110 ${752+j*38}L310 ${692+j*44}M704 ${707+j*40}L904 ${662+j*40}`,2,INK);
 }
 region(p,'foreground-panel',poly([[88,1140],[912,1080],[912,1197],[88,1223]]),'#F4EAE1',[232,1180],'Lower comic panel',3.4);
 for(let j=0;j<4;j++)region(p,`foreground-spark-${j}`,star(664+j*53,1160-j*4,13+(j%2)*4,4),j%2?c.suit:c.trim,[664+j*53,1160-j*4],'Comic footer sparkle',1.5);
}
function comicHead(p,c){const a=artist(p,500,324,1.66,'hero-');
 if(c.female){a.r('long-hair','M-55-29Q-94-104-21-106Q78-112 73-7Q81 62 137 108Q41 123 38 48H-24Q-69 91-104 109Q-76 38-55-29Z',c.hair,[87,90],'Flowing back hair',2);a.l('M68 18Q80 81 111 100M-64-14Q-76 60-90 88',1);}
 a.r('neck',rect(-17,52,34,43,6),c.skin,[0,78],'Neck',1.8);
 a.r('ear-left',ellipse(-48,18,9,15),c.skin,[-51,21],'Ear',1.5);a.r('ear-right',ellipse(48,18,9,15),c.skin,[51,21],'Ear',1.5);
 a.r('face','M-49-36Q-56 20-34 48L0 70L34 48Q56 20 49-36Q0-75-49-36Z',c.skin,[0,31],'Hero face',2.1);
 for(const [side,x] of [['left',-22],['right',22]]){
  a.r(`eye-${side}`,`M${x-14} 5Q${x} -2 ${x+14} 5L${x+11} 24Q${x} 33 ${x-11} 23Z`,IVORY,[x-9,14],'Eye white',1.2);
  a.r(`iris-${side}`,ellipse(x+1,15,7,12),c.trim,[x+2,19],'Hero iris',1.2);a.r(`pupil-${side}`,ellipse(x+2,15,3,8),INK,[x+2,18],'Eye pupil',.8);a.r(`glint-${side}`,circle(x-1,10,2.7),IVORY,[x-1,10],'Eye glint',.5);
  a.l(`M${x-15} 5Q${x} -3 ${x+15} 5`,2.3);a.l(`M${x-14} -10L${x+12} -7`,1.9);
 }
 a.l('M0 15L-4 31L3 32M-11 46Q0 51 11 45',1.2);
 if(c.female){a.r('fringe-left','M-58-16Q-84-88-18-105L20-88Q-35-54-44 15Z',c.hair,[-42,-46],'Swept hair lock',1.8);a.r('fringe-right','M-18-105Q83-112 60-8Q29-24 12-51L-1-16Q-12-30-20-48Z',c.hair,[30,-57],'Fringe',1.8);a.r('temple-lock','M52-54Q87-22 47 54Q66 4 38-17Z',c.hair,[60,-4],'Temple hair lock',1.8);}
 else {a.r('hair-left','M-55 5L-68-34L-55-37L-70-66L-32-64L-40-96L-7-81L17-111L30-78Q-14-49-55 5Z',c.hair,[-35,-51],'Tapered spiky hair',1.8);a.r('hair-right','M17-111L41-83L67-88L 60-58L82-46L 60-18L48 9L38-33L7-5L18-43L-9-25L-7-81Z',c.hair,[32,-51],'Tousled hair locks',1.8);}
 a.l('M-39-66Q-50-39-47-15M25-76Q49-55 51-36',1.2);
 a.sh('M-48 17Q-28 58 8 64L0 70L-34 48Z',.13);
 if(c.pose===9){a.r('visor-left','M-39 2L-8 1L-8 25L-34 23Z',c.accent,[-23,10],'Cyber visor lens',1.2);a.r('visor-right','M8 1L39 2L34 23L8 25Z',c.accent,[23,10],'Cyber visor lens',1.2);a.l('M-7 7H7',2);}
 if(c.pose===4){a.r('goggles-strap',rect(-51,-51,102,12,4),c.trim,[0,-45],'Goggle strap',1.4);for(const x of [-25,25]){a.r('goggle-'+x,ellipse(x,-45,19,14),c.trim,[x,-45],'Flight goggles',1.4);a.r('lens-'+x,ellipse(x,-45,13,9),c.accent,[x,-45],'Goggle lens',1);}}
 if(c.pose===0||c.pose===6)a.r('tiara',poly([[-37,-9],[-19,-17],[0,-38],[19,-17],[37,-9],[23,-5],[0,-19],[-23,-5]]),c.trim,[0,-27],'Star tiara',1.3);
}
function makeComics(){return HEROES.map(c=>{
 const p=makePage('comic-'+c.slug,c.title,'Comic heroes',c.pose>=5?'Hard':'Medium',c.tags,[IVORY,INK,c.skin,c.hair,c.suit,c.trim,c.accent],`An original ${c.female?'heroine':'hero'} in an individually posed comic composition, with costume panels, luminous accents and aligned cel shading.`);comicScene(p,c);
 const a=artist(p,500,324,1.66,'hero-'),q=POSES[c.pose],h=q.h,shoulderL=[-63,102],shoulderR=[63,102],hipL=[h[0]-31,h[1]],hipR=[h[0]+31,h[1]];
 if([0,2,5,6].includes(c.pose)){
   const flow=c.pose===5?-1:1;a.r('cape',`M-54 80Q-94 116-99 219Q${-142*flow} 333 ${-189*flow} 424L${-88*flow} 397L${-29*flow} 451L${48*flow} 392L${170*flow} 424Q${122*flow} 282 101 189Q86 99 54 80Z`,c.accent,[-119*flow,352],'Flowing hero cape',2.4);
   a.r('cape-lining',`M-36 102Q-78 247 ${-88*flow} 397L${-29*flow} 451L${-7*flow} 331L44 106Z`,c.suit,[-46*flow,355],'Cape lining',2);

 }
 if(c.pose===8){for(const side of [-1,1]){
  a.r('wing-'+side,`M${side*44} 103Q${side*156} 12 ${side*226} 73L${side*197} 121L${side*213} 135L${side*170} 161L${side*172} 187L${side*125} 193L${side*120} 222L${side*67} 180Z`,c.accent,[side*145,109],'Feather wing',2.3);
  for(let n=0;n<3;n++)a.r(`wing-feather-${side}-${n}`,`M${side*(67+n*13)} ${120+n*20}Q${side*(139+n*13)} ${59+n*28} ${side*(198-n*10)} ${96+n*29}Q${side*(145-n*2)} ${149+n*19} ${side*(67+n*13)} ${120+n*20}Z`,n%2?c.trim:c.suit,[side*(132+n*8),110+n*25],'Layered wing feather',1.5);
 }}
 // Every limb has its own bounded base, joint, and contrasting armor inset.
 for(const [side,hip,knee,ankle] of [['left',hipL,q.kl,q.al],['right',hipR,q.kr,q.ar]]){
  a.r('thigh-'+side,capsule(hip,knee,28,22),c.suit,mix(hip,knee,.45),'Upper leg',2.1);
  a.r('shin-'+side,capsule(knee,ankle,21,15),c.suit,mix(knee,ankle,.52),'Lower leg',2.1);
  a.r('knee-'+side,ellipse(knee[0],knee[1],24,18),c.trim,knee,'Knee guard',1.6);
  const plateStart=mix(knee,ankle,.22),plateEnd=mix(knee,ankle,.83);a.r('shin-plate-'+side,capsule(plateStart,plateEnd,13,10),c.accent,mix(plateStart,plateEnd,.5),'Boot armor panel',1.6);
  const [x,y]=ankle,sgn=side==='left'?-1:1;a.r('boot-'+side,`M${x-17} ${y-20}L${x+16} ${y-20}L${x+20*sgn} ${y+5}Q${x+57*sgn} ${y+14} ${x+42*sgn} ${y+31}L${x-21*sgn} ${y+31}Q${x-26*sgn} ${y+2} ${x-17} ${y-20}Z`,c.hair,[x+10*sgn,y+15],'Hero boot',2);
  a.l(`M${x-18} ${y+22}L${x+32*sgn} ${y+22}`,1.3);
 }
 for(const [side,shoulder,elbow,wrist] of [['left',shoulderL,q.el,q.wl],['right',shoulderR,q.er,q.wr]]){
   a.r('upper-arm-'+side,capsule(shoulder,elbow,24,19),c.suit,mix(shoulder,elbow,.55),'Upper sleeve',2.1);
   a.r('forearm-'+side,capsule(elbow,wrist,19,13),c.suit,mix(elbow,wrist,.6),'Forearm',2.1);
   a.r('elbow-'+side,circle(elbow[0],elbow[1],17),c.accent,elbow,'Elbow guard',1.5);
   a.r('gauntlet-'+side,capsule(mix(elbow,wrist,.45),wrist,21,18),c.trim,mix(elbow,wrist,.77),'Wrist gauntlet',1.7);
   const [x,y]=wrist;a.r('glove-'+side,`M${x-13} ${y-2}Q${x-25} ${y+8} ${x-16} ${y+26}Q${x-1} ${y+40} ${x+16} ${y+26}L${x+17} ${y+6}Q${x+8} ${y-12} ${x-13} ${y-2}Z`,c.hair,[x,y+17],'Gloved hand',1.9);
   a.r('thumb-'+side,ellipse(x-13,y+8,7,12),c.hair,[x-13,y+8],'Glove thumb',1.3);a.l(`M${x-8} ${y+27}V${y+13}M${x} ${y+29}V${y+14}M${x+8} ${y+27}V${y+14}`,1);
 }
 a.r('torso',`M-57 83Q0 65 57 83L76 126L${h[0]+48} ${h[1]-22}Q${h[0]} ${h[1]+17} ${h[0]-48} ${h[1]-22}L-76 126Z`,c.suit,[h[0],h[1]-34],'Hero suit torso',2.3);
 a.r('chest-left',`M-57 94L-4 109L${h[0]-9} 160L-55 145L-66 117Z`,c.accent,[-35,124],'Left chest panel',1.8);a.r('chest-right',`M57 94L4 109L${h[0]+9} 160L55 145L66 117Z`,c.accent,[35,124],'Right chest panel',1.8);
 a.r('collar',poly([[-44,82],[-19,72],[0,94],[19,72],[44,82],[21,112],[0,121],[-21,112]]),c.trim,[-22,90],'Hero collar',1.8);
 a.r('chest-emblem',star(0,144,24,c.pose%3===0?6:4,11),c.trim,[0,144],'Original hero emblem',1.7);
 a.r('abdomen-panel',`M${h[0]-25} 174L${h[0]+25} 174L${h[0]+32} 209L${h[0]} 223L${h[0]-32} 209Z`,c.hair,[h[0],192],'Waist inset',1.7);
 a.r('belt',`M${h[0]-47} ${h[1]-24}Q${h[0]} ${h[1]-10} ${h[0]+47} ${h[1]-24}L${h[0]+44} ${h[1]-8}Q${h[0]} ${h[1]+7} ${h[0]-44} ${h[1]-8}Z`,c.trim,[h[0]-29,h[1]-11],'Utility belt',1.5);
 a.r('buckle',rect(h[0]-12,h[1]-22,24,24,5),c.accent,[h[0],h[1]-10],'Belt clasp',1.5);
 for(const side of [-1,1]){a.r('shoulder-'+side,ellipse(side*64,104,25,17),c.trim,[side*68,104],'Shoulder armor',1.7);a.r('shoulder-inset-'+side,ellipse(side*64,102,15,8),c.accent,[side*64,102],'Shoulder inlay',1.2);}
 if(c.pose===0){a.r('banner-ribbon','M-28 91Q-101 47-178 101Q-151 62-188 44Q-92 2-21 76Z',c.trim,[-115,56],'Aurora ribbon',1.8);a.r('star-staff',rect(-167,57,7,389,3),c.trim,[-164,320],'Guardian staff',1.7);a.r('staff-star',star(-163,38,31,6,14),c.accent,[-163,38],'Aurora star',1.8);}
 if(c.pose===1){for(let j=0;j<3;j++)a.r('speed-ribbon-'+j,`M${-210+j*8} ${239+j*33}Q${-115+j*5} ${195+j*35} ${-83+j*5} ${192+j*34}Q-143 ${226+j*32} ${-210+j*8} ${251+j*33}Z`,c.trim,[-173+j*8,234+j*33],'Velocity streak',1.7);a.r('ear-comms',rect(49,-5,12,30,4),c.trim,[55,10],'Communication earpiece',1.5);}
 if(c.pose===2){a.r('shield','M100 99Q163 74 220 98L216 183Q187 230 160 246Q116 215 100 182Z',c.suit,[192,165],'Lotus shield',2.4);a.r('shield-inset','M115 112Q163 92 205 112L201 177Q181 211 160 226Q130 204 115 175Z',c.trim,[180,173],'Shield border inset',1.8);a.r('shield-lotus','M160 193Q106 170 137 141L160 170Q144 137 160 119Q180 140 162 170L184 143Q213 173 160 193Z',c.accent,[160,178],'Lotus shield emblem',1.7);}
 if(c.pose===3){a.r('bow','M-183 13Q-258 130-184 260L-197 254Q-280 130-196 11Z',c.trim,[-237,130],'Stormglass bow',2);a.l('M-189 16L-158 135L-190 254',1.3);a.r('arrow',poly([[-212,129],[49,123],[49,128],[-212,134]]),c.accent,[-119,130],'Arrow shaft',1.2);a.r('arrow-tip',poly([[-231,134],[-209,119],[-207,140]]),c.trim,[-214,132],'Arrowhead',1.4);}
 if(c.pose===4){a.r('comet-board',`M-196 439Q-147 460 173 436Q211 451 172 467Q-132 502-199 465Z`,c.trim,[17,466],'Comet hoverboard',2.2);a.r('board-inlay',`M-122 455Q2 472 137 449L129 461Q-20 484-123 466Z`,c.suit,[0,467],'Hoverboard deck inlay',1.4);for(let j=0;j<3;j++)a.r('board-thrust-'+j,poly([[-176-j*8,470],[-186-j*21,512],[-151-j*8,471]]),c.accent,[-176-j*14,486],'Comet thrust',1.5);}
 if(c.pose===5){a.r('sword-blade',poly([[153,226],[173,220],[200,438],[189,467],[177,443]]),IVORY,[181,335],'Silver sword blade',2);a.r('sword-edge',poly([[166,224],[173,220],[200,438],[189,467]]),c.accent,[188,389],'Sword shadow plane',1.2);a.r('sword-guard',poly([[137,214],[184,209],[185,224],[137,230]]),c.trim,[160,219],'Sword guard',1.7);}
 if(c.pose===6){for(const side of [-1,1]){a.r('floating-crystal-'+side,poly([[side*178,18],[side*200,57],[side*180,99],[side*156,59]]),c.accent,[side*177,54],'Floating spell crystal',1.8);a.r('crystal-plane-'+side,poly([[side*178,18],[side*180,99],[side*200,57]]),c.trim,[side*188,57],'Crystal facet',1.3);a.l(`M${side*142} 78Q${side*181} 121 ${side*218} 73`,1.4);}a.r('robe-tail-left',poly([[-44,217],[-2,237],[-44,369],[-90,384]]),c.suit,[-50,304],'Oracle robe panel',1.9);a.r('robe-tail-right',poly([[44,217],[2,237],[44,369],[90,384]]),c.suit,[50,304],'Oracle robe panel',1.9);}
 if(c.pose===7){a.r('power-ring',`M-181-4a74 74 0 1 0 148 0a74 74 0 1 0-148 0M-164-4a57 57 0 1 1 114 0a57 57 0 1 1-114 0Z`,c.trim,[-171,-4],'Solar energy ring',1.8);a.r('sunburst',star(-107,-4,30,8,17),c.accent,[-107,-4],'Solar power core',1.8);}
 if(c.pose===8){a.r('forest-sash',`M-52 168L-41 154Q19 191 97 166L112 185Q15 218-52 168Z`,c.trim,[42,184],'Forest sash',1.7);a.r('ribbon-tail',`M78 184Q115 187 154 249L117 239L122 269Q81 239 63 192Z`,c.accent,[111,231],'Flying ribbon',1.7);}
 if(c.pose===9){a.r('wrist-device',rect(-194,103,46,28,7),c.trim,[-171,116],'Wrist console',1.6);a.r('screen',rect(-186,109,29,16,3),c.accent,[-171,117],'Console screen',1.1);a.r('drone',`M129 28L166 9L206 29L198 66L163 78L132  60Z`,c.trim,[172,55],'Companion drone',1.8);a.r('drone-eye',ellipse(167,41,18,13),c.accent,[167,41],'Drone lens',1.3);a.r('drone-pupil',circle(167,41,7),c.hair,[167,41],'Drone sensor',1);a.r('drone-wing-left',poly([[131,33],[103,25],[108,52],[133,57]]),c.suit,[119,42],'Drone fin',1.4);a.r('drone-wing-right',poly([[204,33],[232,25],[226,52],[202,57]]),c.suit,[217,42],'Drone fin',1.4);}
 comicHead(p,c);
 a.sh(`M48 140L${h[0]+48} ${h[1]-22}L${h[0]+23} ${h[1]-8}L${h[0]+20} 162Z`,.16);
 for(const [knee,ankle] of [[q.kl,q.al],[q.kr,q.ar]])a.sh(capsule(mix(knee,ankle,.1),mix(knee,ankle,.87),5,4),.13);
 // Decorative costume circuitry increases real fine-region density on hard pages.
 if(c.pose>=5){for(const side of [-1,1])for(let j=0;j<5;j++)a.r(`costume-stud-${side}-${j}`,poly([[side*(34+j*2),166+j*7],[side*(40+j*2),165+j*7],[side*(42+j*2),171+j*7],[side*(36+j*2),172+j*7]]),j%2?c.trim:c.accent,[side*(38+j*2),168+j*7],'Suit inlay',.85);}
 return p;
});}

export function generatePages(){const pages=[...makeComics(),...makeChibi(),...makeKawaii()];for(const p of pages){if(['kawaii-axolotl-garden','kawaii-panda-boba','kawaii-otter-shells','chibi-skate-day','chibi-cloud-pilot'].includes(p.id)){p.transparent=true;p.regions=p.regions.filter(r=>!['paper','halo','ground'].includes(r.id));p.tags.push('standalone','transparent export');}if(!p.shades.length){const r=p.regions.findLast(r=>/tail-tip|scarf-tail|cup-heart|belly|coat/.test(r.id))||p.regions.find(r=>r.id==='body');if(r)p.shades.push({d:r.d,opacity:.08,color:INK});}}return pages;}
