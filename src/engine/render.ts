import type { ArtPage, ArtRegion, BrushStroke, ColoringState, Fill, Point } from '../types';

export interface ViewTransform { x: number; y: number; scale: number }
export interface RenderOptions {
  reference?: boolean;
  lineart?: boolean;
  transparent?: boolean;
  shading?: boolean;
  numbers?: boolean;
  selectedNumber?: number;
  hintRegion?: string | null;
  /** Presentation only. Saved state and exported files always contain the final fill. */
  revealFill?: { regionId: string; previous?: Fill; x: number; y: number; progress: number };
}

type PagePaths = { regions: Path2D[]; lines: Path2D[]; shades: Path2D[]; ink:Path2D[]; inverse: Path2D[] };
const pathCache = new WeakMap<ArtPage, PagePaths>();
const layers = new WeakMap<HTMLCanvasElement | OffscreenCanvas, { paint: HTMLCanvasElement; lines: HTMLCanvasElement; page?: ArtPage; lineTransform?: string }>();
// Pages retain their prepared image while in use. This small LRU only keeps spare
// images warm; evicting it cannot invalidate an open canvas or an export.
const pageInk = new WeakMap<ArtPage, HTMLImageElement>();
const inkCache = new Map<string, HTMLImageElement>();
const pendingInk = new Map<string, Promise<HTMLImageElement>>();
const MAX_INK_BYTES = 32 * 1024 * 1024;

/** Decode immutable PNG line art before a page becomes editable. Failures are retryable. */
export async function prepareArtwork(page: ArtPage): Promise<void> {
  if (!page.rasterInk || pageInk.has(page)) return;
  const source = page.rasterInk;
  let image = inkCache.get(source);
  if (!image) {
    let pending = pendingInk.get(source);
    if (!pending) {
      pending = new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        const timer = window.setTimeout(() => {
          element.onload = null; element.onerror = null; element.src = '';
          reject(new Error('The drawing took too long to load. Please try again.'));
        }, 30_000);
        element.onload = () => {
          window.clearTimeout(timer); element.onload = null; element.onerror = null;
          if (!element.naturalWidth || !element.naturalHeight) reject(new Error('The drawing image is empty. Please try again.'));
          else if (typeof element.decode === 'function') element.decode().then(() => resolve(element), () => reject(new Error('The drawing image could not be decoded. Please try again.')));
          else resolve(element);
        };
        element.onerror = () => {
          window.clearTimeout(timer); element.onload = null; element.onerror = null;
          reject(new Error('The drawing line art could not load. Please try again.'));
        };
        element.decoding = 'async'; element.src = source;
      });
      pendingInk.set(source, pending);
    }
    try { image = await pending; }
    finally { if (pendingInk.get(source) === pending) pendingInk.delete(source); }
  }
  if (image.naturalWidth !== page.width || image.naturalHeight !== page.height) {
    inkCache.delete(source);
    throw new Error('The drawing image and coloring regions do not align. Please update the artwork library.');
  }
  // Touch the LRU and budget decoded RGBA size, rather than compressed PNG size.
  inkCache.delete(source); inkCache.set(source, image); pageInk.set(page, image);
  let bytes = [...inkCache.values()].reduce((total, item) => total + item.naturalWidth * item.naturalHeight * 4, 0);
  while (inkCache.size > 3 || bytes > MAX_INK_BYTES) {
    const oldest = inkCache.keys().next().value!;
    const removed = inkCache.get(oldest)!;
    bytes -= removed.naturalWidth * removed.naturalHeight * 4; inkCache.delete(oldest);
  }
}

export function fitTransform(width: number, height: number, artWidth: number, artHeight: number, margin = 18): ViewTransform {
  const scale = Math.max(0.01, Math.min(Math.max(1, width - margin * 2) / artWidth, Math.max(1, height - margin * 2) / artHeight));
  return { scale, x: (width - artWidth * scale) / 2, y: (height - artHeight * scale) / 2 };
}

export function screenToArt(point: { x: number; y: number }, view: ViewTransform): { x: number; y: number } {
  return { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale };
}

export function zoomAt(view: ViewTransform, anchor: { x: number; y: number }, scale: number): ViewTransform {
  const point = screenToArt(anchor, view);
  return { scale, x: anchor.x - point.x * scale, y: anchor.y - point.y * scale };
}

export function countRemaining(page: ArtPage, state: ColoringState, number?: number): number {
  return page.regions.filter(region => (number === undefined || region.number === number) && !state.fills[region.id]).length;
}

function pathsFor(page: ArtPage): PagePaths {
  let paths = pathCache.get(page);
  if (!paths) {
    const regions = page.regions.map(region => new Path2D(region.d));
    paths = {
      regions,
      lines: page.lines.map(line => new Path2D(line.d)),
      shades: page.shades.map(shade => new Path2D(shade.d)),
      ink: (page.ink ?? []).map(shape => new Path2D(shape.d)),
      inverse: page.rasterInk ? [] : regions.map(path => {
        const inverse = new Path2D();
        inverse.rect(-1, -1, page.width + 2, page.height + 2);
        inverse.addPath(path);
        return inverse;
      }),
    };
    pathCache.set(page, paths);
  }
  return paths;
}

/** Reverse ordering matches the visible artwork, including eyes over a face. */
export function hitTestRegion(ctx: CanvasRenderingContext2D, page: ArtPage, x: number, y: number): ArtRegion | null {
  if (x < 0 || y < 0 || x > page.width || y > page.height) return null;
  const paths = pathsFor(page);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  let hit: ArtRegion | null = null;
  for (let index = page.regions.length - 1; index >= 0; index--) {
    if (ctx.isPointInPath(paths.regions[index], x, y, page.regions[index].fillRule ?? 'nonzero')) { hit = page.regions[index]; break; }
  }
  ctx.restore();
  return hit;
}

function getLayers(ctx: CanvasRenderingContext2D, page: ArtPage) {
  let result = layers.get(ctx.canvas);
  if (!result) {
    result = { paint: document.createElement('canvas'), lines: document.createElement('canvas') };
    layers.set(ctx.canvas, result);
  }
  const transform = ctx.getTransform();
  const transformKey = [transform.a, transform.b, transform.c, transform.d, transform.e, transform.f, ctx.canvas.width, ctx.canvas.height].join(',');
  const buildLines = result.page !== page || result.lineTransform !== transformKey;
  result.page = page; result.lineTransform = transformKey;
  for (const layer of buildLines ? [result.paint, result.lines] : [result.paint]) {
    if (layer.width !== ctx.canvas.width) layer.width = ctx.canvas.width;
    if (layer.height !== ctx.canvas.height) layer.height = ctx.canvas.height;
    const layerContext = layer.getContext('2d')!;
    layerContext.setTransform(1, 0, 0, 1, 0, 0);
    layerContext.globalAlpha = 1;
    layerContext.globalCompositeOperation = 'source-over';
    layerContext.clearRect(0, 0, layer.width, layer.height);
    layerContext.setTransform(ctx.getTransform());
  }
  return { paint: result.paint, lineCanvas: result.lines, strokeContext: result.paint.getContext('2d')!, lineContext: result.lines.getContext('2d')!, buildLines };
}

function fillStyle(ctx: CanvasRenderingContext2D, page: ArtPage, region: ArtRegion, fill?: Fill): string | CanvasGradient {
  if (!fill) return '#ffffff';
  if (!fill.secondary) return fill.color;
  const angle = (fill.angle ?? 135) * Math.PI / 180;
  // Center the gradient on the region's curated interior point so small regions
  // receive both shades instead of a tiny slice of a page-wide gradient.
  const extent = Math.min(page.width, page.height) * 0.24;
  const dx = Math.cos(angle) * extent;
  const dy = Math.sin(angle) * extent;
  const gradient = ctx.createLinearGradient(region.label[0] - dx, region.label[1] - dy, region.label[0] + dx, region.label[1] + dy);
  gradient.addColorStop(0, fill.color);
  gradient.addColorStop(1, fill.secondary);
  return gradient;
}

/** Clip to the visible area, excluding every shape painted above this one. */
function clipRegion(ctx: CanvasRenderingContext2D, page: ArtPage, index: number, paths: PagePaths) {
  ctx.clip(paths.regions[index], page.regions[index].fillRule ?? 'nonzero');
  // Raster-derived masks partition the page, including holes. They never
  // overlap, so one clip is sufficient even for very detailed drawings.
  if (page.rasterInk) return;
  for (let above = index + 1; above < paths.regions.length; above++) ctx.clip(paths.inverse[above], 'evenodd');
}

function pressure(point: Point): number { return Math.max(0.12, Math.min(1, point.pressure || 0.5)); }

function strokePoints(stroke: BrushStroke, step: number, callback: (x: number, y: number, pressure: number, index: number) => void) {
  if (!stroke.points.length) return;
  let stamp = 0;
  const first = stroke.points[0];
  callback(first.x, first.y, pressure(first), stamp++);
  let remaining = step;
  for (let i = 1; i < stroke.points.length; i++) {
    const previous = stroke.points[i - 1];
    const current = stroke.points[i];
    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    const distance = Math.hypot(dx, dy);
    let offset = remaining;
    while (offset <= distance) {
      const t = offset / distance;
      callback(previous.x + dx * t, previous.y + dy * t, pressure(previous) * (1 - t) + pressure(current) * t, stamp++);
      offset += step;
    }
    remaining = offset - distance;
  }
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: BrushStroke) {
  if (!stroke.points.length) return;
  ctx.save();
  const size = Math.max(0.5, stroke.size);
  ctx.globalAlpha = Math.max(0, Math.min(1, stroke.opacity));
  ctx.fillStyle = stroke.color;
  ctx.strokeStyle = stroke.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (stroke.tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
  if (stroke.tool === 'airbrush') {
    ctx.globalAlpha *= 0.12;
    strokePoints(stroke, Math.max(1, size * 0.12), (x, y, p) => {
      const radius = size * (0.4 + p * 0.6);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, stroke.color);
      gradient.addColorStop(1, `${stroke.color.slice(0, 7)}00`);
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    });
  } else if (stroke.tool === 'sparkle') {
    strokePoints(stroke, Math.max(8, size * 1.5), (x, y, p, index) => {
      // Stable variation makes repainting, autosave and exports deterministic.
      const wave = Math.sin(index * 12.9898 + stroke.points[0].x * 0.1) * 43758.5453;
      const random = wave - Math.floor(wave);
      const radius = Math.max(1, size * (0.12 + random * 0.22) * (0.5 + p));
      const sx = x + Math.sin(index * 2.4) * size * 0.3;
      const sy = y + Math.cos(index * 1.9) * size * 0.3;
      ctx.shadowColor = stroke.color; ctx.shadowBlur = radius * 1.8;
      ctx.beginPath();
      ctx.moveTo(sx, sy - radius); ctx.quadraticCurveTo(sx + radius * 0.18, sy - radius * 0.18, sx + radius, sy);
      ctx.quadraticCurveTo(sx + radius * 0.18, sy + radius * 0.18, sx, sy + radius);
      ctx.quadraticCurveTo(sx - radius * 0.18, sy + radius * 0.18, sx - radius, sy);
      ctx.quadraticCurveTo(sx - radius * 0.18, sy - radius * 0.18, sx, sy - radius); ctx.fill();
    });
  } else {
    const pencil = stroke.tool === 'pencil';
    if (pencil) ctx.globalAlpha *= 0.85;
    const points = stroke.points.map((point, index, source) => {
      if (index === 0 || index === source.length - 1) return point;
      const previous = source[index - 1]; const next = source[index + 1];
      return { x: (previous.x + point.x * 2 + next.x) / 4, y: (previous.y + point.y * 2 + next.y) / 4, pressure: point.pressure };
    });
    const width = (point: Point) => size * (pencil ? 0.28 : 1) * (0.35 + pressure(point) * 0.65);
    if (points.length === 1) {
      ctx.beginPath(); ctx.arc(points[0].x, points[0].y, width(points[0]) / 2, 0, Math.PI * 2); ctx.fill();
    } else {
      // One filled compound silhouette supports changing stylus pressure without
      // dark seams where translucent segments overlap. Every subpath has the
      // same winding, so intersections form a union under the nonzero fill rule.
      ctx.beginPath();
      for (let index = 0; index < points.length; index++) {
        const point = points[index]; const radius = width(point) / 2;
        ctx.moveTo(point.x + radius, point.y); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.closePath();
        if (index === points.length - 1) continue;
        const next = points[index + 1]; const nextRadius = width(next) / 2;
        const distance = Math.hypot(next.x - point.x, next.y - point.y);
        if (distance < 0.001) continue;
        const nx = -(next.y - point.y) / distance; const ny = (next.x - point.x) / distance;
        ctx.moveTo(point.x + nx * radius, point.y + ny * radius);
        ctx.lineTo(point.x - nx * radius, point.y - ny * radius);
        ctx.lineTo(next.x - nx * nextRadius, next.y - ny * nextRadius);
        ctx.lineTo(next.x + nx * nextRadius, next.y + ny * nextRadius); ctx.closePath();
      }
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Draw with the caller's transform. Buffers are viewport-sized, even at deep zoom. */
export function renderArtwork(ctx: CanvasRenderingContext2D, page: ArtPage, state: ColoringState, options: RenderOptions = {}): void {
  const rasterInk = page.rasterInk ? pageInk.get(page) : undefined;
  if (page.rasterInk && !rasterInk) throw new Error('Prepare the drawing image before rendering.');
  const paths = pathsFor(page);
  const { paint, lineCanvas, strokeContext, lineContext, buildLines } = getLayers(ctx, page);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, page.width, page.height); ctx.clip();
  if (!options.transparent) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, page.width, page.height); }
  const reference = options.reference;
  for (let index = 0; index < page.regions.length; index++) {
    const region = page.regions[index];
    const fill = options.lineart ? undefined : reference ? { color: region.color } : state.fills[region.id];
    const reveal = options.revealFill?.regionId === region.id ? options.revealFill : undefined;
    ctx.fillStyle = fillStyle(ctx, page, region, reveal ? reveal.previous : fill);
    ctx.fill(paths.regions[index], region.fillRule ?? 'nonzero');
    if (reveal) {
      ctx.save(); ctx.clip(paths.regions[index], region.fillRule ?? 'nonzero');
      ctx.beginPath(); ctx.arc(reveal.x, reveal.y, Math.hypot(page.width, page.height) * Math.max(0, Math.min(1, reveal.progress)), 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = fillStyle(ctx, page, region, fill); ctx.fill(paths.regions[index], region.fillRule ?? 'nonzero'); ctx.restore();
    }
    if (buildLines && !rasterInk) {
      // Erase earlier outlines underneath a later shape, then add this outline.
      // The finished line layer is reused while filling or painting at this view.
      lineContext.globalCompositeOperation = 'destination-out'; lineContext.fill(paths.regions[index], region.fillRule ?? 'nonzero');
      lineContext.globalCompositeOperation = 'source-over';
      lineContext.strokeStyle = '#293044'; lineContext.lineWidth = region.strokeWidth ?? 2.2;
      lineContext.lineJoin = 'round'; lineContext.lineCap = 'round'; if(region.strokeWidth !== 0) lineContext.stroke(paths.regions[index]);
    }
  }
  if (!reference && !options.lineart) {
    for (const stroke of state.strokes) {
      strokeContext.save();
      strokeContext.beginPath(); strokeContext.rect(0, 0, page.width, page.height); strokeContext.clip();
      if (stroke.regionId) {
        const index = page.regions.findIndex(region => region.id === stroke.regionId);
        if (index < 0) { strokeContext.restore(); continue; }
        clipRegion(strokeContext, page, index, paths);
      }
      drawStroke(strokeContext, stroke); strokeContext.restore();
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(paint, 0, 0); ctx.restore();
  }
  if (!options.lineart && (options.shading ?? (reference || state.shading))) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    for (let index = 0; index < page.shades.length; index++) {
      const shade = page.shades[index]; ctx.globalAlpha = shade.opacity; ctx.fillStyle = shade.color ?? '#414067'; ctx.fill(paths.shades[index]);
    }
    ctx.restore();
  }
  if (buildLines) {
    for (let index = 0; index < page.lines.length; index++) {
      const line = page.lines[index];
      lineContext.strokeStyle = line.color ?? '#293044'; lineContext.globalAlpha = line.opacity ?? 1;
      lineContext.lineWidth = line.width ?? 1.6; lineContext.stroke(paths.lines[index]);
    }
    lineContext.globalAlpha = 1;
    for (let index=0; index<(page.ink?.length ?? 0); index++) {
      lineContext.fillStyle = page.ink![index].color;
      lineContext.fill(paths.ink[index]);
    }
    if (rasterInk) {
      lineContext.imageSmoothingEnabled = true; lineContext.imageSmoothingQuality = 'high';
      lineContext.drawImage(rasterInk, 0, 0, page.width, page.height);
    }
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(lineCanvas, 0, 0); ctx.restore();
  if (options.numbers && !options.reference && !options.lineart) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const transform = ctx.getTransform();
    const pixelRatio = ctx.canvas.width / (ctx.canvas.clientWidth || ctx.canvas.width);
    // Keep numbers readable without letting their badges grow over neighboring
    // tiny regions at deep zoom. Cap artwork units only when zoomed out.
    const cssScale = Math.hypot(transform.a, transform.b) / pixelRatio;
    const labelSize = Math.min(24, 12 / Math.max(0.01, cssScale));
    ctx.font = `600 ${labelSize}px sans-serif`;
    for (const region of page.regions) {
      if (state.fills[region.id]) continue;
      const selected = region.number === options.selectedNumber;
      ctx.fillStyle = selected ? '#6750a4' : 'rgba(255,255,255,0.91)';
      ctx.beginPath(); ctx.arc(region.label[0], region.label[1], labelSize * (selected ? 0.8 : 0.7), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = selected ? '#ffffff' : '#596172'; ctx.fillText(String(region.number), ...region.label);
    }
    ctx.restore();
  }
  if (options.hintRegion) {
    const index = page.regions.findIndex(region => region.id === options.hintRegion);
    if (index >= 0) {
      ctx.save(); ctx.strokeStyle = '#eaa53c'; ctx.lineWidth = 5; ctx.setLineDash([6, 4]); ctx.stroke(paths.regions[index]); ctx.restore();
    }
  }
  ctx.restore();
}

export async function exportArtwork(page: ArtPage, state: ColoringState, options: { format: 'png' | 'jpeg'; transparent?: boolean; scale?: number }): Promise<Blob> {
  await prepareArtwork(page);
  const canvas = document.createElement('canvas');
  const requestedScale = options.scale ?? 3;
  // Approximately 47 MB per RGBA buffer at the default 3000×3900 size.
  const scale = Math.max(0.1, Math.min(requestedScale, 4096 / Math.max(page.width, page.height), Math.sqrt(12_000_000 / (page.width * page.height))));
  canvas.width = Math.round(page.width * scale); canvas.height = Math.round(page.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your device could not create an export canvas. Try again after closing another app.');
  ctx.scale(scale, scale);
  renderArtwork(ctx, page, state, { transparent: options.format === 'png' && options.transparent && page.transparent });
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      // Release large backing stores promptly on Android.
      const cached = layers.get(canvas);
      if (cached) { cached.paint.width = 1; cached.lines.width = 1; }
      canvas.width = 1; canvas.height = 1;
      if (blob) resolve(blob); else reject(new Error('The image could not be exported. Please free storage and try again.'));
    }, `image/${options.format}`, 0.95);
  });
}
