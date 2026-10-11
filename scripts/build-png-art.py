#!/usr/bin/env python3
"""Compile individually generated PNG line art without tracing away the original ink.

The immutable source image supplies the visible ink. Connected white components
supply the fill geometry. Palette seeds and optional visible boundary repairs are
reviewable entries in assets/source/new-collection.json, never hidden heuristics.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]


def rgb(value: str) -> tuple[int, int, int]:
    if len(value) != 7 or value[0] != '#':
        raise ValueError(f'Expected #RRGGBB palette color: {value}')
    return tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))


def canonical_id(mask: np.ndarray, bounds: tuple[int, int, int, int]) -> str:
    """Color/seed/title changes cannot renumber an existing geometric region."""
    value = str(bounds).encode() + np.packbits(mask).tobytes()
    return 'r-' + hashlib.sha256(value).hexdigest()[:14]


def contour_path(mask: np.ndarray, left: int, top: int) -> tuple[str, int]:
    # RETR_TREE retains islands and holes; the renderer uses an even-odd fill.
    contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    pieces = []
    for contour in contours:
        # At most a quarter native pixel error, hidden beneath the original ink.
        points = cv2.approxPolyDP(contour, .22, True).reshape(-1, 2)
        if len(points) < 3:
            continue
        xy = [(int(x) + left + .5, int(y) + top + .5) for x, y in points]
        pieces.append('M' + 'L'.join(f'{x:g},{y:g}' for x, y in xy) + 'Z')
    return ''.join(pieces), max(0, len(pieces) - 1)


def seed_component(seed, labels, width, height):
    x = min(width - 1, max(0, round(float(seed['x']) * (width - 1))))
    y = min(height - 1, max(0, round(float(seed['y']) * (height - 1))))
    component = int(labels[y, x])
    if component:
        return component, (x, y), False
    # A seed landing on anti-aliased ink may move only six native pixels. This
    # small, reported adjustment cannot silently jump to a distant face/outfit.
    radius = 6
    crop = labels[max(0, y-radius):min(height, y+radius+1), max(0, x-radius):min(width, x+radius+1)]
    yy, xx = np.nonzero(crop)
    if not len(xx):
        raise ValueError(f'Seed {seed} is on solid ink; move it into a white region')
    xx += max(0, x-radius); yy += max(0, y-radius)
    best = int(np.argmin((xx-x)**2 + (yy-y)**2))
    sx, sy = int(xx[best]), int(yy[best])
    return int(labels[sy, sx]), (sx, sy), True


def build(spec: dict, draft: bool = False, locked: dict | None = None) -> dict:
    art_id = spec['id']
    if not art_id.replace('-', '').isalnum():
        raise ValueError(f'Unsafe artwork ID: {art_id}')
    source = ROOT / spec.get('source', f'assets/source/{art_id}.png')
    original = Image.open(source).convert('RGBA')
    background = Image.new('RGBA', original.size, 'white')
    background.alpha_composite(original)
    gray = background.convert('L')
    width, height = gray.size
    if min(width, height) < 1000:
        raise ValueError(f'{art_id}: source must have at least 1000 pixels on its short edge')
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if locked and locked['sourceSha256'] != source_hash:
        raise ValueError(f'{art_id}: immutable released source changed; add the new composition under a new page ID')
    draw = ImageDraw.Draw(gray)
    repairs = spec.get('repairs', [])
    for repair in repairs:
        points = [(round(x*(width-1)), round(y*(height-1))) for x, y in repair['points']]
        draw.line(points, fill=0, width=max(1, int(repair.get('width', 2))), joint='curve')
    pixels = np.array(gray)
    threshold = int(spec.get('inkThreshold', 200))
    barrier = (pixels < threshold).astype(np.uint8)
    # A manifest can request a bounded closing operation. It becomes visible ink
    # and is counted in the audit report; the original PNG remains untouched.
    close_radius = int(spec.get('closeGaps', 0))
    closed_pixels = 0
    if close_radius:
        if close_radius not in (1, 2):
            raise ValueError('closeGaps must be 0, 1 or 2 native pixels')
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close_radius*2+1, close_radius*2+1))
        closed = cv2.morphologyEx(barrier, cv2.MORPH_CLOSE, kernel)
        added = (closed != 0) & (barrier == 0)
        closed_pixels = int(added.sum())
        pixels[added] = 0
        barrier = closed
    count, labels, stats, centroids = cv2.connectedComponentsWithStats(1-barrier, connectivity=4)
    native_scale = width * height / (1024 * 1536)
    min_area = max(12, round(float(spec.get('minimumRegionPixels', 28)) * native_scale))
    keep = np.zeros(count, dtype=bool)
    for component in range(1, count):
        keep[component] = stats[component, cv2.CC_STAT_AREA] >= min_area
    if not keep.any():
        raise ValueError(f'{art_id}: no usable coloring regions')

    palette = [color.upper() for color in spec['palette']]
    for color in palette:
        rgb(color)
    color_guide, guide_lab, palette_lab = None, None, None
    if spec.get('colorGuide'):
        guide_path = ROOT/spec['colorGuide']
        color_guide = np.array(Image.open(guide_path).convert('RGB').resize((width, height), Image.Resampling.LANCZOS))
        guide_lab = cv2.cvtColor(color_guide, cv2.COLOR_RGB2LAB)
        palette_lab = cv2.cvtColor(np.array([[rgb(color) for color in palette]], dtype=np.uint8), cv2.COLOR_RGB2LAB)[0].astype(np.float32)
    seeds = spec.get('seeds', [])
    assigned, seed_report, conflicts, rejected = {}, [], [], []
    for seed in seeds:
        color = seed['color'].upper()
        if color not in palette:
            raise ValueError(f'{art_id}: seed color {color} is outside its palette')
        component, location, moved = seed_component(seed, labels, width, height)
        if spec.get('keepSeedRegions') and stats[component, cv2.CC_STAT_AREA] >= 8:
            keep[component] = True
        if not keep[component]:
            rejected.append({'seed': seed, 'reason': 'Tiny decorative island excluded from completion'})
            continue
        if component in assigned and assigned[component]['color'] != color:
            conflicts.append({'component': component, 'first': assigned[component], 'second': seed})
        assigned[component] = {**seed, 'color': color}
        seed_report.append({'name': seed.get('name', ''), 'component': component, 'color': color, 'pixel': location, 'movedOffInk': moved})

    # Extend each component at most 2.2 px beneath its black boundary, assigning
    # every extension pixel to exactly one nearest component. This removes pale
    # halos while keeping adjacent regions disjoint. Original ink renders last.
    kept_labels = np.where(keep[labels], labels, 0).astype(np.int32)
    empty = (kept_labels == 0).astype(np.uint8)
    distances, nearest = cv2.distanceTransformWithLabels(empty, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    lookup = np.zeros(int(nearest.max())+1, dtype=np.int32)
    present = kept_labels != 0
    lookup[nearest[present]] = kept_labels[present]
    extended = np.where((distances <= 2.2) & (barrier != 0), lookup[nearest], kept_labels)
    excluded = (labels != 0) & ~keep[labels]
    regions, diagnostics = [], []
    explicit = spec.get('regionColors', {})
    names = spec.get('regionNames', {})
    fill_image = np.full((height, width, 3), 255, dtype=np.uint8)
    numbered = Image.fromarray(pixels).convert('RGB')
    map_draw = ImageDraw.Draw(numbered)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', max(12, round(width/85)))
    except OSError:
        font = ImageFont.load_default()
    for component in np.flatnonzero(keep):
        x, y, w, h, area = map(int, stats[component])
        local = (labels[y:y+h, x:x+w] == component).astype(np.uint8)
        identity = canonical_id(local, (x, y, w, h))
        interior = cv2.distanceTransform(np.pad(local, 1), cv2.DIST_L2, 5)[1:-1, 1:-1]
        ly, lx = np.unravel_index(int(interior.argmax()), interior.shape)
        anchor = [int(x+lx)+.5, int(y+ly)+.5]
        left, top = max(0, x-3), max(0, y-3)
        right, bottom = min(width, x+w+3), min(height, y+h+3)
        shape = (extended[top:bottom, left:right] == component).astype(np.uint8)
        path, holes = contour_path(shape, left, top)
        if not path:
            raise ValueError(f'{art_id}/{identity}: unusable contour')
        # An original one-pixel sliver can have several equally deep pixels,
        # including a degenerate contour tip. Prefer the source pixel deepest
        # inside its extended fill mask; never place a number on a black line.
        fill_interior = cv2.distanceTransform(np.pad(shape, 1), cv2.DIST_L2, 5)[1:-1, 1:-1]
        label_scores = np.where(labels[top:bottom, left:right] == component, fill_interior, 0)
        anchor_y, anchor_x = np.unravel_index(int(label_scores.argmax()), label_scores.shape)
        anchor = [int(left+anchor_x)+.5, int(top+anchor_y)+.5]
        guide_sample = None
        if component in assigned:
            assignment = assigned[component]
            color, name = assignment['color'], assignment.get('name', 'Detail')
            color_source = 'seed'
        elif color_guide is not None:
            # The guide is ONLY a semantic palette hint. It never supplies lines,
            # geometry, alpha, or the displayed reference, so drift introduced by
            # an image edit cannot move a coloring boundary. Prefer deep interior
            # pixels and reject near-black guide ink before a robust Lab median.
            core = local != 0
            if interior.max() >= 4:
                core &= interior >= min(4, interior.max()*.5)
            samples = guide_lab[y:y+h, x:x+w][core]
            light_samples = samples[samples[:, 0] > 45]
            if len(light_samples):
                samples = light_samples
            median = np.median(samples, axis=0)
            distances_lab = np.linalg.norm(palette_lab-median, axis=1)
            palette_index = int(distances_lab.argmin())
            color, name, color_source = palette[palette_index], 'Detail', 'color-guide'
            guide_sample = {'medianLab': [round(float(v), 2) for v in median], 'paletteDistance': round(float(distances_lab[palette_index]), 2)}
        elif seeds:
            # Nearest reviewed palette anchor gives small unseeded ornaments a
            # coordinated local color. Critical skin/hair/background shapes must
            # have explicit seeds; the audit marks every inferred assignment.
            near = min(seeds, key=lambda seed: (seed['x']-anchor[0]/width)**2 + (seed['y']-anchor[1]/height)**2)
            color, name = near['color'].upper(), near.get('name', 'Detail')
            color_source = 'nearest-seed'
        else:
            color, name, color_source = palette[0], 'Detail', 'default'
        if identity in explicit:
            color, color_source = explicit[identity].upper(), 'explicit-region'
        if color not in palette:
            raise ValueError(f'{art_id}/{identity}: color {color} missing from palette')
        name = names.get(identity, name)
        regions.append({'id': identity, 'd': path, 'color': color, 'name': name, 'number': palette.index(color)+1, 'label': anchor, 'strokeWidth': 0, 'fillRule': 'evenodd'})
        fill_image[top:bottom, left:right][shape != 0] = rgb(color)
        touches = x == 0 or y == 0 or x+w == width or y+h == height
        diagnostics.append({'index': len(regions), 'id': identity, 'component': int(component), 'area': area, 'radius': round(float(interior.max()), 2), 'label': anchor, 'bounds': [x,y,w,h], 'holes': holes, 'touchesBorder': touches, 'color': color, 'name': name, 'colorSource': color_source, **({'guideSample': guide_sample} if guide_sample else {})})
        label = str(len(regions))
        box = map_draw.textbbox(tuple(anchor), label, font=font, anchor='mm')
        map_draw.rectangle((box[0]-2, box[1]-1, box[2]+2, box[3]+1), fill='#ffffc8')
        map_draw.text(tuple(anchor), label, fill='#ab004e', font=font, anchor='mm')

    unknown_overrides = (set(explicit) | set(names)) - {region['id'] for region in regions}
    if unknown_overrides:
        raise ValueError(f'{art_id}: overrides refer to missing stable region IDs: {sorted(unknown_overrides)}')
    alpha = 255-pixels
    overlay = np.zeros((height, width, 4), dtype=np.uint8)
    overlay[:, :, 3] = alpha
    # Tiny non-target islands retain the source white detail even during free
    # brushwork; this is explicit fixed ink/decoration, not an unreachable target.
    overlay[excluded, :3] = 255
    overlay[excluded, 3] = 255
    ink = Image.fromarray(overlay)
    reference = Image.alpha_composite(Image.fromarray(fill_image).convert('RGBA'), ink).convert('RGB')
    final_lineart = Image.alpha_composite(Image.new('RGBA', (width,height), 'white'), ink).convert('RGB')
    tiny = sum(region['area'] < 250*native_scale for region in diagnostics)
    requested = spec['difficulty']
    difficulty = requested
    # Region count and tight spaces can raise a requested difficulty, never lower it.
    if difficulty == 'Easy' and (len(regions) > 70 or tiny > 10):
        difficulty = 'Medium'
    if len(regions) > 180 or tiny > 45:
        difficulty = 'Hard'
    page = {key: spec[key] for key in ('id', 'title', 'category', 'tags', 'description')}
    palette = [color for color in palette if any(region['color'] == color for region in regions)]
    for region in regions:
        region['number'] = palette.index(region['color']) + 1
    page.update({'difficulty': difficulty, 'width': width, 'height': height, 'palette': palette, 'regions': regions, 'lines': [], 'shades': [], 'transparent': False, 'rasterInk': f'./art/ink/{art_id}.png', 'lineart': f'./art/lineart/{art_id}.png', 'reference': f'./art/references/{art_id}.png', 'assetVersion': 1, 'sourceSha256': source_hash})
    report = {'id': art_id, 'source': str(source.relative_to(ROOT)), 'sourceSha256': source_hash, 'colorGuide': spec.get('colorGuide'), 'colorGuideUse': 'Palette hints only; final reference uses source mask and ink', 'width': width, 'height': height, 'nativeResolution': True, 'difficulty': difficulty, 'requestedDifficulty': requested, 'visibleRegions': len(regions), 'smallestRegionPixels': min(r['area'] for r in diagnostics), 'tinyRegions': tiny, 'minimumRegionPixels': min_area, 'excludedDecorativeRegions': int((~keep[1:]).sum()), 'excludedDecorativePixels': int(excluded.sum()), 'inkThreshold': threshold, 'repairCount': len(repairs), 'gapClosingRadius': close_radius, 'gapClosingPixels': closed_pixels, 'seedConflicts': conflicts, 'rejectedSeeds': rejected, 'seedAssignments': seed_report, 'borderRegions': [{'id': r['id'], 'areaFraction': round(r['area']/(width*height), 5)} for r in diagnostics if r['touchesBorder']], 'regions': diagnostics}
    geometry_hash = hashlib.sha256('|'.join(r['id']+':'+r['d'] for r in regions).encode()).hexdigest()
    report['geometrySha256'] = geometry_hash
    if locked and locked['geometrySha256'] != geometry_hash:
        raise ValueError(f'{art_id}: released fill geometry changed; retain the existing settings or use a new page ID')
    folders = ['public/art/ink', 'public/art/lineart', 'public/art/references', 'public/art/thumbs', 'scripts/art/generated/png', 'docs/png-art']
    for folder in folders:
        (ROOT/folder).mkdir(parents=True, exist_ok=True)
    (ROOT/f'docs/png-art/{art_id}.json').write_text(json.dumps(report, indent=2)+'\n')
    numbered.thumbnail((1024,1536))
    numbered.save(ROOT/f'docs/png-art/{art_id}-regions.png', optimize=True)
    if conflicts and not draft:
        raise ValueError(f'{art_id}: {len(conflicts)} conflicting color seeds share an open region; review docs/png-art/{art_id}.json and repair its boundary (use --draft only for review)')
    ink.save(ROOT/f'public/art/ink/{art_id}.png', optimize=True)
    final_lineart.save(ROOT/f'public/art/lineart/{art_id}.png', optimize=True)
    reference.save(ROOT/f'public/art/references/{art_id}.png', optimize=True)
    reference.thumbnail((360,540))
    reference.save(ROOT/f'public/art/thumbs/{art_id}.webp', quality=86, method=4)
    (ROOT/f'scripts/art/generated/png/{art_id}.json').write_text(json.dumps(page, separators=(',', ':'))+'\n')
    print(f'{art_id}: {width}×{height}, {len(regions)} regions, {difficulty}, {len(conflicts)} seed conflicts, {report["excludedDecorativePixels"]} fixed decorative pixels')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', default='assets/source/new-collection.json')
    parser.add_argument('--only', nargs='*', help='Compile only these immutable page IDs')
    parser.add_argument('--draft', action='store_true', help='Write review assets even if semantic seeds reveal an open boundary')
    parser.add_argument('--lock', action='store_true', help='Record immutable reviewed source and region geometry hashes')
    args = parser.parse_args()
    manifest = json.loads((ROOT/args.manifest).read_text())
    if manifest.get('version') != 1:
        raise ValueError('Unsupported PNG manifest version')
    pages = manifest['pages']
    if len({p['id'] for p in pages}) != len(pages):
        raise ValueError('Duplicate immutable page IDs in manifest')
    if args.lock and args.draft:
        raise ValueError('Drafts with unreviewed boundaries cannot be locked')
    lock_path = (ROOT/args.manifest).with_suffix('.lock.json')
    locks = json.loads(lock_path.read_text()) if lock_path.exists() else {'version': 1, 'pages': {}}
    for spec in pages:
        if args.only is None or spec['id'] in args.only:
            report = build(spec, args.draft, locks['pages'].get(spec['id']))
            if args.lock:
                locks['pages'][spec['id']] = {key: report[key] for key in ('sourceSha256', 'geometrySha256', 'width', 'height', 'visibleRegions')}
    if args.lock:
        lock_path.write_text(json.dumps(locks, indent=2)+'\n')


if __name__ == '__main__':
    main()
