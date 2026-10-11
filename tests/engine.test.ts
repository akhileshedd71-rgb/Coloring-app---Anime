import { describe, expect, it } from 'vitest';
import { countRemaining, fitTransform, screenToArt, zoomAt } from '../src/engine/render';
import type { ArtPage, ColoringState } from '../src/types';

describe('canvas coordinate transforms', () => {
  it('fits tall art inside a small landscape viewport without cropping', () => {
    const fit = fitTransform(600, 280, 720, 960);
    expect(fit.scale * 960).toBeLessThanOrEqual(244);
    expect(fit.x).toBeGreaterThan(0);
    expect(fit.y).toBeCloseTo(18);
  });
  it('keeps the exact art coordinate under the finger when zooming deeply', () => {
    const view = { x: -271.125, y: 39.875, scale: 0.3875 };
    const finger = { x: 174.33, y: 238.45 };
    const before = screenToArt(finger, view);
    const after = screenToArt(finger, zoomAt(view, finger, 7.3));
    expect(after.x).toBeCloseTo(before.x, 10);
    expect(after.y).toBeCloseTo(before.y, 10);
  });
  it('handles zero layout measurements without infinite or negative transforms', () => {
    const fit = fitTransform(0, 0, 720, 960);
    expect(Number.isFinite(fit.x)).toBe(true);
    expect(Number.isFinite(fit.y)).toBe(true);
    expect(fit.scale).toBeGreaterThan(0);
  });
  it('inverts the view transform after zoom and pan', () => {
    const view = { x: -438, y: 172, scale: 8.21 };
    const art = { x: 58.1, y: 29.2 };
    const screen = { x: view.x + art.x * view.scale, y: view.y + art.y * view.scale };
    const restored = screenToArt(screen, view);
    expect(restored.x).toBeCloseTo(art.x, 10);
    expect(restored.y).toBeCloseTo(art.y, 10);
  });
});

describe('numbered region progress', () => {
  const page = { regions: [{ id: 'face', number: 1 }, { id: 'left-hand', number: 1 }, { id: 'hair', number: 2 }] } as ArtPage;
  it('counts stable region ids instead of counting colors or brush strokes', () => {
    const state: ColoringState = { fills: { face: { color: '#123456' }, stale: { color: '#111111' } }, strokes: [], shading: false };
    expect(countRemaining(page, state)).toBe(2);
    expect(countRemaining(page, state, 1)).toBe(1);
    expect(countRemaining(page, state, 2)).toBe(1);
    expect(countRemaining(page, state, 3)).toBe(0);
  });
  it('accepts a gradient fill as a completed region', () => {
    const state: ColoringState = { fills: { face: { color: '#123456' }, 'left-hand': { color: '#123456', secondary: '#ffffff' }, hair: { color: '#000000' } }, strokes: [], shading: true };
    expect(countRemaining(page, state)).toBe(0);
  });
});
