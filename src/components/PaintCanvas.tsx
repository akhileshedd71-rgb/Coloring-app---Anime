import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { ArtPage, BrushStroke, ColoringMode, ColoringState, Point, Tool } from '../types';
import { fitTransform, hitTestRegion, renderArtwork, screenToArt, zoomAt } from '../engine/render';
import type { RenderOptions, ViewTransform } from '../engine/render';

export interface PaintCanvasProps {
  page: ArtPage;
  state: ColoringState;
  tool: Tool;
  color: string;
  secondaryColor: string;
  brushSize: number;
  opacity: number;
  guided: boolean;
  mode: ColoringMode;
  selectedNumber: number;
  showNumbers: boolean;
  onChange: (state: ColoringState) => void;
  onPickColor: (color: string) => void;
  onRegionSelect?: (id: string | null) => void;
  fitKey: number;
  zoomAction?: { id: number; delta: number };
  onZoomChange?: (zoom: number) => void;
  hintRegion?: string | null;
}

interface TrackedPointer { x: number; y: number; pressure: number }
interface PendingTap { x: number; y: number; screenX: number; screenY: number; moved: boolean; tool: Tool }
interface Pinch { distance: number; view: ViewTransform; midpoint: { x: number; y: number } }
const srOnly: CSSProperties = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 };

/** The model changes only at a completed stroke/tap. Navigation cancels provisional paint. */
export function PaintCanvas(props: PaintCanvasProps) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const view = useRef<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const fittedScale = useRef(1);
  const dimensions = useRef({ width: 1, height: 1, dpr: 1 });
  const pointers = useRef(new Map<number, TrackedPointer>());
  const provisional = useRef<BrushStroke | null>(null);
  const pendingTap = useRef<PendingTap | null>(null);
  const navigating = useRef(false);
  const pinch = useRef<Pinch | null>(null);
  const frame = useRef<number | null>(null);
  const animation = useRef<(NonNullable<RenderOptions['revealFill']> & { started: number }) | null>(null);
  const reducedMotion = useRef(false);
  const [announcement, setAnnouncement] = useState('Pinch with two fingers to zoom. Paint with one finger.');

  const draw = useCallback(() => {
    frame.current = null;
    const element = canvas.current;
    const ctx = element?.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;
    const current = latest.current;
    const size = dimensions.current;
    ctx.setTransform(size.dpr * view.current.scale, 0, 0, size.dpr * view.current.scale, size.dpr * view.current.x, size.dpr * view.current.y);
    let reveal: RenderOptions['revealFill'];
    if (animation.current) {
      const elapsed = (performance.now() - animation.current.started) / 240;
      if (elapsed >= 1) animation.current = null;
      else reveal = { ...animation.current, progress: 1 - Math.pow(1 - elapsed, 3) };
    }
    const renderedState = provisional.current ? { ...current.state, strokes: [...current.state.strokes, provisional.current] } : current.state;
    renderArtwork(ctx, current.page, renderedState, {
      numbers: current.mode === 'number' && current.showNumbers,
      selectedNumber: current.selectedNumber,
      hintRegion: current.hintRegion,
      revealFill: reveal,
    });
    if (animation.current) frame.current = requestAnimationFrame(draw);
  }, []);

  const requestDraw = useCallback(() => {
    if (frame.current === null) frame.current = requestAnimationFrame(draw);
  }, [draw]);

  const reportZoom = useCallback(() => {
    latest.current.onZoomChange?.(view.current.scale / fittedScale.current);
  }, []);

  const fit = useCallback(() => {
    const size = dimensions.current;
    const page = latest.current.page;
    view.current = fitTransform(size.width, size.height, page.width, page.height);
    fittedScale.current = view.current.scale;
    reportZoom(); requestDraw();
  }, [reportZoom, requestDraw]);

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const resize = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1 || !canvas.current) return;
      const previous = dimensions.current;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const next = { width: rect.width, height: rect.height, dpr };
      dimensions.current = next;
      canvas.current.width = Math.round(rect.width * dpr);
      canvas.current.height = Math.round(rect.height * dpr);
      if (previous.width === 1 || previous.height === 1) fit();
      else {
        const page = latest.current.page;
        const center = screenToArt({ x: previous.width / 2, y: previous.height / 2 }, view.current);
        const nextFit = fitTransform(next.width, next.height, page.width, page.height).scale;
        const ratio = view.current.scale / fittedScale.current;
        fittedScale.current = nextFit;
        view.current = { scale: nextFit * ratio, x: next.width / 2 - center.x * nextFit * ratio, y: next.height / 2 - center.y * nextFit * ratio };
        reportZoom(); requestDraw();
      }
    };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(element);
    return () => observer.disconnect();
  }, [fit, reportZoom, requestDraw]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reducedMotion.current = query.matches; };
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    provisional.current = null; pendingTap.current = null; animation.current = null;
    pointers.current.clear(); navigating.current = false; pinch.current = null;
    fit();
  }, [props.page.id, props.fitKey, fit]);

  useEffect(() => { requestDraw(); }, [props.state, props.mode, props.showNumbers, props.selectedNumber, props.hintRegion, requestDraw]);

  const zoom = useCallback((factor: number, anchor?: { x: number; y: number }) => {
    const size = dimensions.current;
    const scale = Math.max(fittedScale.current * 0.7, Math.min(fittedScale.current * 20, view.current.scale * factor));
    view.current = zoomAt(view.current, anchor ?? { x: size.width / 2, y: size.height / 2 }, scale);
    reportZoom(); requestDraw();
  }, [reportZoom, requestDraw]);

  useEffect(() => {
    if (props.zoomAction?.delta) zoom(props.zoomAction.delta > 0 ? 1.35 : 1 / 1.35);
  }, [props.zoomAction?.id, zoom]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoom(Math.exp(-event.deltaY * 0.002), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [zoom]);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  const localPoint = (event: Pick<PointerEvent, 'clientX' | 'clientY' | 'pressure' | 'pointerType'>): TrackedPointer => {
    const rect = canvas.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top, pressure: event.pointerType === 'pen' ? Math.max(0.05, event.pressure) : 1 };
  };

  const findRegion = (point: { x: number; y: number }) => {
    const ctx = canvas.current?.getContext('2d');
    return ctx ? hitTestRegion(ctx, latest.current.page, point.x, point.y) : null;
  };

  const beginPinch = () => {
    const [a, b] = Array.from(pointers.current.values());
    if (!a || !b) return;
    provisional.current = null; pendingTap.current = null; navigating.current = true;
    pinch.current = { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, view: { ...view.current } };
    requestDraw();
  };

  const pointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const local = localPoint(event.nativeEvent);
    pointers.current.set(event.pointerId, local);
    if (pointers.current.size > 1) { beginPinch(); return; }
    navigating.current = false;
    const current = latest.current;
    const point = screenToArt(local, view.current);
    const region = findRegion(point);
    current.onRegionSelect?.(region?.id ?? null);
    if (['fill', 'gradient', 'eyedropper'].includes(current.tool)) {
      pendingTap.current = { ...point, screenX: local.x, screenY: local.y, moved: false, tool: current.tool };
      return;
    }
    if (point.x < 0 || point.y < 0 || point.x > current.page.width || point.y > current.page.height) return;
    if (current.guided && !region) { setAnnouncement('Choose a closed region to paint inside.'); return; }
    if (current.mode === 'number' && region?.number !== current.selectedNumber) { setAnnouncement(`Choose color ${region?.number ?? 'for this region'} first.`); return; }
    const stroke: BrushStroke = {
      id: globalThis.crypto?.randomUUID?.() ?? `stroke-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      tool: current.tool, color: current.color, size: current.brushSize,
      opacity: current.opacity, points: [{ ...point, pressure: local.pressure }],
      regionId: current.guided ? region?.id : undefined,
    };
    provisional.current = stroke; requestDraw();
  };

  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    event.preventDefault();
    const local = localPoint(event.nativeEvent);
    pointers.current.set(event.pointerId, local);
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = Array.from(pointers.current.values());
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const origin = pinch.current;
      const factor = Math.hypot(a.x - b.x, a.y - b.y) / origin.distance;
      const scale = Math.max(fittedScale.current * 0.7, Math.min(fittedScale.current * 20, origin.view.scale * factor));
      const anchored = zoomAt(origin.view, origin.midpoint, scale);
      view.current = { ...anchored, x: anchored.x + midpoint.x - origin.midpoint.x, y: anchored.y + midpoint.y - origin.midpoint.y };
      reportZoom(); requestDraw(); return;
    }
    if (navigating.current) return;
    if (pendingTap.current && Math.hypot(local.x - pendingTap.current.screenX, local.y - pendingTap.current.screenY) > 9) pendingTap.current.moved = true;
    if (provisional.current) {
      const samples = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
      for (const sample of samples.length ? samples : [event.nativeEvent]) {
        const sampleLocal = localPoint(sample);
        const point: Point = { ...screenToArt(sampleLocal, view.current), pressure: sampleLocal.pressure };
        const previous = provisional.current.points[provisional.current.points.length - 1];
        if (Math.hypot(point.x - previous.x, point.y - previous.y) * view.current.scale >= 0.6) provisional.current.points.push(point);
      }
      requestDraw();
    }
  };

  const finishTap = (tap: PendingTap) => {
    if (tap.moved) return;
    const current = latest.current;
    if (tap.tool === 'eyedropper') {
      const ctx = canvas.current?.getContext('2d');
      if (!ctx) return;
      const { dpr } = dimensions.current;
      const pixel = ctx.getImageData(Math.max(0, Math.min(canvas.current!.width - 1, Math.floor(tap.screenX * dpr))), Math.max(0, Math.min(canvas.current!.height - 1, Math.floor(tap.screenY * dpr))), 1, 1).data;
      if (pixel[3] > 0) {
        const picked = `#${Array.from(pixel.slice(0, 3)).map(value => value.toString(16).padStart(2, '0')).join('')}`;
        current.onPickColor(picked); setAnnouncement(`Picked ${picked}.`);
      }
      return;
    }
    const region = findRegion(tap);
    if (!region) { setAnnouncement('Tap inside a closed region.'); return; }
    if (current.mode === 'number' && region.number !== current.selectedNumber) { setAnnouncement(`This region uses color ${region.number}. Select its numbered swatch first.`); return; }
    const color = current.mode === 'number' ? current.page.palette[region.number - 1] ?? region.color : current.color;
    const fill = tap.tool === 'gradient' ? { color, secondary: current.secondaryColor, angle: 135 } : { color };
    const previous = current.state.fills[region.id];
    if (previous?.color === fill.color && previous?.secondary === ('secondary' in fill ? fill.secondary : undefined)) return;
    const next = { ...current.state, fills: { ...current.state.fills, [region.id]: fill } };
    if (!reducedMotion.current) animation.current = { regionId: region.id, previous, x: tap.x, y: tap.y, progress: 0, started: performance.now() };
    current.onChange(next); setAnnouncement(`${region.name} colored.`); requestDraw();
  };

  const pointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>, canceled = false) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!navigating.current && !canceled) {
      if (provisional.current) {
        const stroke = provisional.current;
        provisional.current = null;
        latest.current.onChange({ ...latest.current.state, strokes: [...latest.current.state.strokes, stroke] });
        setAnnouncement(stroke.tool === 'eraser' ? 'Brushwork erased. Line art is protected.' : 'Brush stroke saved.');
      } else if (pendingTap.current) finishTap(pendingTap.current);
    }
    provisional.current = null; pendingTap.current = null;
    if (pointers.current.size === 0) { navigating.current = false; pinch.current = null; }
    else if (pointers.current.size >= 2) beginPinch();
    requestDraw();
  };

  return <div ref={stage} className="paint-canvas-stage" data-testid="canvas-stage" style={{ position: 'relative', width: '100%', height: '100%', minHeight: 120, flex: '1 1 0%', overflow: 'hidden', touchAction: 'none', background: 'var(--canvas-bg, #e9e7ef)' }}>
    <canvas ref={canvas} data-testid="paint-canvas" aria-label={`${props.page.title} coloring canvas. One finger paints; two fingers pan and zoom.`} role="img"
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={event => pointerEnd(event)} onPointerCancel={event => pointerEnd(event, true)}
      onContextMenu={event => event.preventDefault()}
      style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none', userSelect: 'none', cursor: props.tool === 'eyedropper' ? 'crosshair' : props.tool === 'fill' || props.tool === 'gradient' ? 'pointer' : 'crosshair' }} />
    <span aria-live="polite" aria-atomic="true" style={srOnly}>{announcement}</span>
  </div>;
}

export default PaintCanvas;
