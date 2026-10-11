#!/usr/bin/env python3
"""Reproducible color-separation pipeline for the original Moon Botanist artwork.

Install: python -m venv /workspace/.venv-art
         /workspace/.venv-art/bin/pip install pillow numpy opencv-python-headless vtracer
Run:     /workspace/.venv-art/bin/python scripts/trace-illustration.py

The source is retained unchanged. A bilateral filter reduces painted texture,
then nearest CIELAB matching assigns a deliberately selected 22-color palette.
VTracer's CUTOUT mode produces disjoint, closed Bezier regions. Fine ink is
traced separately, preserving eyes, fingers, eyelashes, and hair strands without
making line strokes into tiny fill targets. Small same-color decorative pieces
are linked spatially until there are at most 480 fill targets; large shapes stay
independent. Reference, line art, masks, and in-app rendering all use this JSON,
so the finished reference is exactly aligned with the editable artwork.
"""
from pathlib import Path
import argparse, json, re, tempfile, xml.etree.ElementTree as ET
import numpy as np
from PIL import Image
import cv2, vtracer

ROOT = Path(__file__).resolve().parents[1]
PALETTE = ['#FCF5E8','#FBF8F3','#E7E1ED','#C5BED5','#A59EB8','#7E7798',
           '#484972','#6C6D99','#2B283E','#FFDEC7','#EAB499','#FFF0DC',
           '#EDCD8E','#B69A63','#85944F','#50623A','#A07AC6','#83B5E8',
           '#486EAE','#DC8E88','#FBE5B6','#C6A5EB']
NAMES = ['Ivory background','Petal white','Silver light','Pearl lavender','Lavender shadow',
         'Deep lavender','Midnight fabric','Indigo fabric','Ink','Peach skin','Warm skin shadow',
         'Skin highlight','Moon gold','Antique gold','Leaf green','Forest green','Violet iris',
         'Butterfly blue','Sapphire shadow','Rose lips','Moonlit gold','Iris light']
NUM = re.compile(r'[MLCZ]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?')

def flatten(element, width, height):
    """Flatten VTracer's translate and source size directly into M/L/C/Z coordinates."""
    offset=[float(v) for v in re.findall(r'[-+]?\d*\.?\d+',element.get('transform','translate(0,0)'))]
    tx,ty=(offset+[0,0])[:2]
    tokens=NUM.findall(element.get('d','')); out=[]; coords=[]; pair=[]
    for token in tokens:
        if token in ('M','L','C','Z'):
            if pair: raise ValueError('Unpaired coordinate')
            out.append(token)
        else:
            pair.append(float(token))
            if len(pair)==2:
                x=(pair[0]+tx)*1000/width;y=(pair[1]+ty)*1300/height
                coords.append((x,y));out.append(f'{x:.1f} {y:.1f}');pair=[]
    if not coords:return None
    xs,ys=zip(*coords);box=(min(xs),min(ys),max(xs),max(ys))
    return {'d':' '.join(out),'color':element.get('fill','#29263B').upper(),
            'bbox':box,'x':(box[0]+box[2])/2,'y':(box[1]+box[3])/2,
            'area':(box[2]-box[0])*(box[3]-box[1])}

def trace(source, output, binary=False):
    vtracer.convert_image_to_svg_py(str(source),str(output),
        colormode='binary' if binary else 'color',hierarchical='cutout',mode='spline',
        filter_speckle=3 if binary else 16,color_precision=8,layer_difference=4,
        corner_threshold=60 if binary else 65,length_threshold=3.0,
        max_iterations=10,splice_threshold=45,path_precision=1)

def run(source, output, max_regions):
    if max_regions < 50:
        raise ValueError('Use at least 50 regions to preserve the 22-color illustration.')
    rgb=np.asarray(Image.open(source).convert('RGB'));height,width=rgb.shape[:2]
    palette=np.array([[int(c[i:i+2],16)for i in (1,3,5)]for c in PALETTE],np.uint8)
    smooth=cv2.bilateralFilter(rgb,7,32,4)
    lab=cv2.cvtColor(smooth,cv2.COLOR_RGB2LAB).astype(np.float32)
    plab=cv2.cvtColor(palette[None,:,:],cv2.COLOR_RGB2LAB)[0].astype(np.float32)
    labels=np.argmin(np.sum((lab[:,:,None,:]-plab[None,None,:,:])**2,axis=3),axis=2)
    with tempfile.TemporaryDirectory(prefix='hoshii-trace-') as td:
        td=Path(td)
        Image.fromarray(palette[labels]).save(td/'colors.png')
        # Dark strokes are fixed ink. Fine warm contours are also retained by
        # the boundaries of the colored regions; no trace uses external fonts.
        ink=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY)<68
        Image.fromarray((1-ink.astype(np.uint8))*255).save(td/'ink.png')
        trace(td/'colors.png',td/'colors.svg');trace(td/'ink.png',td/'ink.svg',True)
        shapes=[flatten(e,width,height) for e in ET.parse(td/'colors.svg').getroot()]
        ink_shapes=[flatten(e,width,height) for e in ET.parse(td/'ink.svg').getroot()]
    shapes=[s for s in shapes if s];ink_shapes=[s for s in ink_shapes if s]
    for shape in shapes:
        color=np.array([int(shape['color'][i:i+2],16)for i in (1,3,5)])
        shape['color']=PALETTE[int(np.argmin(np.sum((palette.astype(float)-color)**2,axis=1)))]
    fixed_ink=[];fillable=[]
    for shape in shapes:
        values=[int(shape['color'][i:i+2],16)for i in (1,3,5)]
        # Only the darkest original-outline color is fixed, not navy garments.
        if .2126*values[0]+.7152*values[1]+.0722*values[2]<52:
            fixed_ink.append(shape)
        else:fillable.append(shape)
    # A cutout contains no overlapping color regions: grouping same-color
    # compound paths therefore changes hit targets but never their appearance.
    ranked=sorted(fillable,key=lambda s:s['area'],reverse=True)
    major=ranked[:min(180,max_regions//2,len(ranked))]
    cell=125
    while True:
        groups=[{'parts':[s],'color':s['color'],'major':True}for s in major]
        grouped={}
        for shape in ranked[len(major):]:
            key=(shape['color'],int(shape['x']//cell),int(shape['y']//cell))
            grouped.setdefault(key,[]).append(shape)
        groups.extend({'parts':parts,'color':key[0],'major':False}for key,parts in sorted(grouped.items()))
        if len(groups)<=max_regions:break
        cell+=25
    palette_out=list(dict.fromkeys(g['color']for g in groups))
    regions=[]
    for i,g in enumerate(groups):
        s=max(g['parts'],key=lambda part:part['area'])
        rgb_g=np.array([int(g['color'][n:n+2],16)for n in (1,3,5)])
        nearest=int(np.argmin(np.sum((palette.astype(float)-rgb_g)**2,axis=1)))
        regions.append({'id':f'moon-region-{i:03d}',
            'd':' '.join(part['d']for part in g['parts']),
            'color':g['color'],'name':NAMES[nearest]+(' · linked accents'if len(g['parts'])>1 else ''),
            'number':palette_out.index(g['color'])+1,'label':[round(s['x'],1),round(s['y'],1)],
            'strokeWidth':0.35})
    # Combine only matching ink colors. Original ink is added last for clean
    # rendering and the compiler excludes it from fill-label placement.
    ink_out=[{'d':' '.join(s['d']for s in fixed_ink),'color':'#2B283E'}] if fixed_ink else []
    ink_out.append({'d':' '.join(s['d']for s in ink_shapes),'color':'#29263B'})
    # Preserve the focal iris colors that speckle filtering would otherwise
    # merge. These masks come from the SAME source pixels and stay aligned.
    for name,box in [('left',(574,311,619,349)),('right',(705,366,738,397))]:
        x0,y0,x1,y1=box
        patch=rgb[y0:y1,x0:x1].astype(np.int16)
        mask=((patch[:,:,2]-patch[:,:,1]>17)&(patch[:,:,0]-patch[:,:,1]>5)&
              (patch[:,:,2]-patch[:,:,0]>4)&(patch[:,:,2]>120)).astype(np.uint8)
        mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
        contours,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        contours=[c for c in contours if cv2.contourArea(c)>8]
        d=[]
        for contour in contours:
            points=cv2.approxPolyDP(contour,.5,True)[:,0,:]
            d.append('M'+' L'.join(f'{(x+x0)*1000/width:.1f} {(y+y0)*1300/height:.1f}'for x,y in points)+'Z')
        if d:
            color='#A07AC6'
            if color not in palette_out:palette_out.append(color)
            regions.append({'id':f'iris-{name}','d':' '.join(d),'color':color,
                'name':f'Luminous violet {name} iris','number':palette_out.index(color)+1,
                'label':[(x0+x1)/2*1000/width,(y0+y1)/2*1300/height],'strokeWidth':0})
    # Small source-aligned white catchlights remain immutable facial ink.
    for x,y,r in [(596,319,3.8),(583,318,1.9),(718,372,3.1)]:
        xx=x*1000/width;yy=y*1300/height;rx=r*1000/width;ry=r*1300/height
        d=f'M{xx-rx:.1f} {yy:.1f} C{xx-rx:.1f} {yy-ry:.1f} {xx+rx:.1f} {yy-ry:.1f} {xx+rx:.1f} {yy:.1f} C{xx+rx:.1f} {yy+ry:.1f} {xx-rx:.1f} {yy+ry:.1f} {xx-rx:.1f} {yy:.1f}Z'
        ink_out.append({'d':d,'color':'#FFFFFF'})
    page={'id':'collectible-moon-botanist','title':'The Lunar Botanist',
        'category':'Fantasy','difficulty':'Hard','tags':['collectible','original illustration',
        'silver hair','botanical','flowers','butterflies','moon','female','detailed'],
        'width':1000,'height':1300,'palette':palette_out,'regions':regions,'lines':[],
        'shades':[],'ink':ink_out,'transparent':False,
        'description':'An original collectible lunar botanist with silver braids, luminous violet eyes, '
        'a crescent ornament, embroidered indigo silk, daisies and blue butterflies. '
        'Fine same-color decorative accents are linked locally so every detail can be completed.'}
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(page,separators=(',',':'))+'\n')
    print(json.dumps({'source':str(source),'sourceSize':[width,height],'traceShapes':len(shapes),
        'regions':len(regions),'palette':len(palette_out),'inkShapes':len(ink_shapes),
        'output':str(output),'bytes':output.stat().st_size},indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,default=ROOT/'assets/source/moon-botanist.png')
    parser.add_argument('--output',type=Path,default=ROOT/'scripts/art/generated/moon-botanist.json')
    parser.add_argument('--max-regions',type=int,default=480)
    args=parser.parse_args();run(args.source,args.output,args.max_regions)
