// Pixel checks use Chromium's real Canvas2D implementation, not a canvas mock.
// Run: node tests/engine.browser.mjs
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({
  server: { host: '127.0.0.1', port: 5184, strictPort: true },
  plugins: [{ name: 'canvas-test-route', configureServer(instance) {
    instance.middlewares.use('/__engine_test', async (_request, response) => {
      const html = await instance.transformIndexHtml('/__engine_test', '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style></head><body><div id="fixture-root"></div><script type="module" src="/tests/engine-fixture.tsx"></script></body></html>');
      response.setHeader('Content-Type', 'text/html'); response.end(html);
    });
  } }],
});
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:5184/__engine_test');
  const results = await page.evaluate(async () => {
    const { renderArtwork, hitTestRegion, exportArtwork, prepareArtwork } = await import('/src/engine/render.ts');
    const canvas = document.createElement('canvas'); canvas.width = 200; canvas.height = 200;
    const ctx = canvas.getContext('2d');
    const art = {
      id: 'engine-fixture', title: 'Engine fixture', category: 'Test', difficulty: 'Easy', tags: [], width: 200, height: 200,
      palette: ['#e79062', '#548cff'], transparent: true, description: '',
      regions: [
        { id: 'face', d: 'M20 20H180V180H20Z', label: [45, 45], color: '#e79062', number: 1, name: 'Face', strokeWidth: 4 },
        { id: 'eye', d: 'M80 70H120V100H80Z', label: [100, 85], color: '#548cff', number: 2, name: 'Eye', strokeWidth: 3 },
      ],
      lines: [{ d: 'M50 130H150', width: 3, opacity: 0.6 }],
      shades: [{ d: 'M20 150H180V180H20Z', color: '#000000', opacity: 0.2 }],
    };
    const empty = { fills: {}, strokes: [], shading: false };
    const pixels = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
    const results = {};
    ctx.scale(4, 4);
    results.hitUnderTransform = hitTestRegion(ctx, art, 90, 85)?.id;
    results.hitOutside = hitTestRegion(ctx, art, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    renderArtwork(ctx, art, empty, { reference: true, shading: false });
    results.reference = [pixels(40, 40), pixels(90, 80)];
    renderArtwork(ctx, art, empty);
    results.blank = pixels(40, 40);
    const greenStroke = { id: 'a', tool: 'brush', color: '#00ff00', size: 22, opacity: 1, regionId: 'face', points: [{ x: 30, y: 85, pressure: 1 }, { x: 170, y: 85, pressure: 1 }] };
    const filled = { ...empty, fills: { face: { color: '#e79062' } }, strokes: [greenStroke] };
    renderArtwork(ctx, art, filled);
    results.guided = [pixels(45, 85), pixels(100, 85)];
    renderArtwork(ctx, art, { ...filled, strokes: [{ ...greenStroke, regionId: undefined }] });
    results.unrestricted = pixels(100, 85);
    renderArtwork(ctx, art, { ...filled, strokes: [greenStroke, { ...greenStroke, id: 'b', tool: 'eraser', points: [{ x: 35, y: 85, pressure: 1 }, { x: 70, y: 85, pressure: 1 }] }] });
    results.erased = [pixels(45, 85), pixels(100, 85), pixels(20, 85)];
    renderArtwork(ctx, art, { ...empty, fills: { face: { color: '#ff0000', secondary: '#0000ff', angle: 0 } } });
    results.gradient = [pixels(35, 45), pixels(85, 45)];
    renderArtwork(ctx, art, { ...empty, fills: { face: { color: '#ffffff' } }, shading: true });
    results.shading = [pixels(45, 140), pixels(45, 165)];
    renderArtwork(ctx, art, empty, { transparent: true });
    results.transparent = pixels(5, 5);
    const deterministicStroke = { ...greenStroke, tool: 'sparkle', size: 15, color: '#ee99cc', regionId: undefined };
    renderArtwork(ctx, art, { ...empty, strokes: [deterministicStroke] });
    const firstSparkle = canvas.toDataURL();
    renderArtwork(ctx, art, { ...empty, strokes: [deterministicStroke] });
    results.deterministic = firstSparkle === canvas.toDataURL();
    const airbrush = { ...greenStroke, tool: 'airbrush', size: 30, points: [{ x: 40, y: 45, pressure: 1 }] };
    renderArtwork(ctx, art, { ...empty, strokes: [airbrush] });
    results.airbrush = [pixels(40, 45), pixels(65, 45)];
    const pressureStroke = { ...greenStroke, size: 30, points: [{ x: 35, y: 50, pressure: 0.12 }, { x: 165, y: 50, pressure: 1 }] };
    renderArtwork(ctx, art, { ...empty, strokes: [pressureStroke] });
    results.pressure = [pixels(35, 60), pixels(165, 60)];
    renderArtwork(ctx, art, { ...empty, strokes: [{ ...pressureStroke, tool: 'pencil' }] });
    results.pencil = pixels(165, 60);
    renderArtwork(ctx, art, { ...empty, strokes: [{ ...greenStroke, opacity: 0.5, points: [{ x: 30, y: 50, pressure: 1 }, { x: 100, y: 50, pressure: 1 }, { x: 170, y: 50, pressure: 1 }] }] });
    results.opacity = [pixels(50, 50), pixels(100, 50)];
    renderArtwork(ctx, art, filled);
    const stable = canvas.toDataURL();
    renderArtwork(ctx, art, filled);
    results.stableRerender = stable === canvas.toDataURL();
    const inkArt={...art,id:'ink-fixture',regions:art.regions.map(region=>({...region,strokeWidth:0})),lines:[],shades:[],ink:[{d:'M40 70H60V100H40Z',color:'#1e2030'}]};
    renderArtwork(ctx,inkArt,{...filled,strokes:[{...greenStroke,regionId:undefined}]});
    results.fixedInk=pixels(50,85);
    renderArtwork(ctx,inkArt,{...filled,strokes:[greenStroke,{...greenStroke,tool:'eraser',regionId:undefined}]});
    results.inkAfterErase=pixels(50,85);
    renderArtwork(ctx,inkArt,empty);
    results.zeroWidthOutline=pixels(20,45);
    const exported = await exportArtwork(art, { ...empty, fills: { face: { color: '#e79062' } } }, { format: 'png', scale: 2, transparent: true });
    const bitmap = await createImageBitmap(exported);
    const exportCanvas = document.createElement('canvas'); exportCanvas.width = bitmap.width; exportCanvas.height = bitmap.height;
    const exportContext = exportCanvas.getContext('2d'); exportContext.drawImage(bitmap, 0, 0);
    results.export = { type: exported.type, width: bitmap.width, height: bitmap.height, color: Array.from(exportContext.getImageData(80, 80, 1, 1).data), alpha: exportContext.getImageData(5, 5, 1, 1).data[3] };
    bitmap.close();
    // A real PNG overlay with nested same-winding contours exercises the
    // mask representation used by individually generated illustrations.
    const inkCanvas = document.createElement('canvas'); inkCanvas.width = 200; inkCanvas.height = 200;
    const inkContext = inkCanvas.getContext('2d');
    inkContext.strokeStyle = '#16191f'; inkContext.lineWidth = 4;
    inkContext.strokeRect(20, 20, 160, 160); inkContext.strokeRect(80, 70, 40, 30);
    inkContext.fillStyle = '#16191f'; inkContext.globalAlpha = 0.42; inkContext.fillRect(35, 35, 1, 12);
    const rasterArt = { ...art, id: 'png-fixture', rasterInk: inkCanvas.toDataURL('image/png'), lines: [], shades: [], regions: [
      { ...art.regions[0], d: 'M20 20H180V180H20Z M80 70H120V100H80Z', fillRule: 'evenodd', strokeWidth: 0 },
      { ...art.regions[1], strokeWidth: 0 },
    ] };
    await prepareArtwork(rasterArt);
    renderArtwork(ctx, rasterArt, empty, { lineart: true });
    const originalBlank = canvas.toDataURL();
    const expected = document.createElement('canvas'); expected.width = 200; expected.height = 200;
    const expectedContext = expected.getContext('2d'); expectedContext.fillStyle = '#ffffff'; expectedContext.fillRect(0, 0, 200, 200); expectedContext.drawImage(inkCanvas, 0, 0);
    results.pngLineFidelity = originalBlank === expected.toDataURL();
    results.pngHoleHit = hitTestRegion(ctx, { ...rasterArt, regions: [rasterArt.regions[0]] }, 100, 85);
    renderArtwork(ctx, rasterArt, { ...empty, fills: { face: { color: '#e79062' } } });
    results.pngFill = [pixels(45, 85), pixels(100, 85), pixels(20, 85)];
    renderArtwork(ctx, rasterArt, { ...empty, strokes: [greenStroke] });
    results.pngClippedStroke = [pixels(45, 85), pixels(100, 85), pixels(80, 85)];
    renderArtwork(ctx, rasterArt, { ...empty, strokes: [{ ...greenStroke, regionId: undefined }, { ...greenStroke, tool: 'eraser', regionId: undefined }] });
    results.pngEraserInk = pixels(80, 85);
    const savedRasterState = { ...empty, fills: { face: { color: '#ff0000', secondary: '#0000ff', angle: 0 } } };
    renderArtwork(ctx, rasterArt, savedRasterState); const beforeRestore = canvas.toDataURL();
    results.pngGradient = [pixels(35, 45), pixels(85, 45), pixels(100, 85)];
    renderArtwork(ctx, rasterArt, JSON.parse(JSON.stringify(savedRasterState)));
    results.pngRestored = beforeRestore === canvas.toDataURL();
    renderArtwork(ctx, rasterArt, empty, { lineart: true });
    results.pngUndo = originalBlank === canvas.toDataURL();
    // Export must prepare a newly loaded page itself, including after eviction.
    const rasterExport = await exportArtwork({ ...rasterArt }, savedRasterState, { format: 'png', scale: 1 });
    const rasterBitmap = await createImageBitmap(rasterExport); expectedContext.clearRect(0, 0, 200, 200); expectedContext.drawImage(rasterBitmap, 0, 0);
    results.pngExport = { width: rasterBitmap.width, height: rasterBitmap.height, ink: Array.from(expectedContext.getImageData(80, 85, 1, 1).data), hole: Array.from(expectedContext.getImageData(100, 85, 1, 1).data) };
    rasterBitmap.close();
    for (let n = 0; n < 5; n++) await prepareArtwork({ ...rasterArt, rasterInk: `${rasterArt.rasterInk}#${n}` });
    renderArtwork(ctx, rasterArt, empty, { lineart: true });
    results.pngStableAfterLoads = originalBlank === canvas.toDataURL();
    ctx.setTransform(20, 0, 0, 20, -800, -800);
    renderArtwork(ctx, rasterArt, empty, { numbers: true, selectedNumber: 1 });
    results.deepZoomNumbers = [pixels(106, 100), pixels(120, 100)];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    try { await prepareArtwork({ ...rasterArt, width: 201 }); } catch (error) { results.pngMisalignment = error.message.includes('do not align'); }
    return results;
  });
  assert.deepEqual(results.fixedInk,[30,32,48,255]);
  assert.deepEqual(results.inkAfterErase,[30,32,48,255]);
  assert.deepEqual(results.zeroWidthOutline,[255,255,255,255]);
  assert.equal(results.hitUnderTransform, 'eye');
  assert.equal(results.hitOutside, null);
  assert.deepEqual(results.reference, [[231, 144, 98, 255], [84, 140, 255, 255]]);
  assert.deepEqual(results.blank, [255, 255, 255, 255]);
  assert.deepEqual(results.guided, [[0, 255, 0, 255], [255, 255, 255, 255]]);
  assert.deepEqual(results.unrestricted, [0, 255, 0, 255]);
  assert.deepEqual(results.erased.slice(0, 2), [[231, 144, 98, 255], [255, 255, 255, 255]]);
  assert.ok(results.erased[2][0] < 60, 'eraser must preserve the line art');
  assert.ok(results.gradient[0][0] > results.gradient[1][0] && results.gradient[0][2] < results.gradient[1][2], 'gradient must vary across the region');
  assert.ok(results.shading[0][0] > results.shading[1][0], 'aligned shading must darken only its geometry');
  assert.equal(results.transparent[3], 0);
  assert.equal(results.deterministic, true, 'sparkles must be stable across repaint and export');
  assert.ok(results.airbrush[0][0] < results.airbrush[1][0], 'soft brush must fall off toward its edge');
  assert.deepEqual(results.pressure, [[255, 255, 255, 255], [0, 255, 0, 255]], 'stylus pressure must vary the width along a stroke');
  assert.deepEqual(results.pencil, [255, 255, 255, 255], 'pencil must have a finer footprint');
  assert.deepEqual(results.opacity[0], results.opacity[1], 'translucent strokes must not develop dark seams at sample points');
  assert.equal(results.stableRerender, true, 'reused render buffers must not retain previous alpha/composite state');
  assert.deepEqual(results.export, { type: 'image/png', width: 400, height: 400, color: [231, 144, 98, 255], alpha: 0 });
  console.log('PASS: 20 Chromium canvas checks: immutable ink, eraser-safe ink, zero-width outlines, fill boundaries, layer order, hit testing, gradient, airbrush, sparkle, pencil, pressure, opacity, eraser, shading, transparency, stable redraw and final PNG pixels.');
  assert.equal(results.pngLineFidelity, true, 'blank coloring canvas preserves every original PNG ink pixel');
  assert.equal(results.pngHoleHit, null, 'a same-winding contour hole is not a fill target');
  assert.deepEqual(results.pngFill, [[231, 144, 98, 255], [255, 255, 255, 255], [22, 25, 31, 255]], 'PNG-backed fill respects holes and protected ink');
  assert.deepEqual(results.pngClippedStroke, [[0, 255, 0, 255], [255, 255, 255, 255], [22, 25, 31, 255]], 'guided brush stays inside its compound mask');
  assert.deepEqual(results.pngEraserInk, [22, 25, 31, 255]);
  assert.ok(results.pngGradient[0][0] > results.pngGradient[1][0] && results.pngGradient[0][2] < results.pngGradient[1][2]);
  assert.deepEqual(results.pngGradient[2], [255, 255, 255, 255]);
  assert.equal(results.pngRestored, true); assert.equal(results.pngUndo, true);
  assert.deepEqual(results.pngExport, { width: 200, height: 200, ink: [22, 25, 31, 255], hole: [255, 255, 255, 255] });
  assert.equal(results.pngStableAfterLoads, true, 'loading new images cannot evict the active page ink');
  assert.equal(results.pngMisalignment, true, 'reject mismatched image/mask dimensions before painting');
  assert.deepEqual(results.deepZoomNumbers, [[103, 80, 164, 255], [255, 255, 255, 255]], 'deep-zoom number badges stay readable and leave neighboring regions uncovered');
  console.log('PASS: 13 PNG checks: exact line fidelity, compound hit masks, contained fills and brushes, protected ink, gradient boundaries, editable-state restore, undo, aligned export, cache stability, alignment validation and bounded deep-zoom number labels.');

  await page.waitForFunction(() => window.__engineFixture?.zoom === 1);
  const session = await page.context().newCDPSession(page);
  const touch = (type, points) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([id, x, y]) => ({ id, x, y, radiusX: 2, radiusY: 2, force: 1 })) });
  // Two fingers centered on the page expand from 100 to 150 artwork units apart.
  await touch('touchStart', [[1, 96.5, 200]]);
  await touch('touchStart', [[1, 96.5, 200], [2, 253.5, 200]]);
  await touch('touchMove', [[1, 57.25, 200], [2, 292.75, 200]]);
  await touch('touchEnd', []);
  await page.waitForFunction(() => window.__engineFixture.zoom > 1.45);
  const gesture = await page.evaluate(() => ({ zoom: window.__engineFixture.zoom, strokes: window.__engineFixture.state.strokes.length, fills: Object.keys(window.__engineFixture.state.fills).length }));
  assert.ok(Math.abs(gesture.zoom - 1.5) < 0.01, 'pinch zoom follows the finger distance');
  assert.equal(gesture.strokes, 0, 'adding the second pointer cancels a provisional brush stroke');
  assert.equal(gesture.fills, 0, 'navigation never fills a region');
  await page.evaluate(() => window.__engineFixture.setSettings({ tool: 'fill' }));
  await page.waitForFunction(() => window.__engineFixture.settings.tool === 'fill');
  // Artwork (40,40), transformed about the center by the 1.5x pinch.
  await page.touchscreen.tap(33.7, 58.7);
  await page.waitForFunction(() => window.__engineFixture.state.fills.face?.color === '#e79062');
  await page.evaluate(() => window.__engineFixture.reset());
  await page.waitForFunction(() => window.__engineFixture.zoom === 1 && Object.keys(window.__engineFixture.state.fills).length === 0);
  await page.evaluate(() => window.__engineFixture.setSettings({ mode: 'number', selectedNumber: 2 }));
  await page.waitForFunction(() => window.__engineFixture.settings.mode === 'number');
  await page.touchscreen.tap(80.8, 105.8);
  assert.equal(await page.evaluate(() => Object.keys(window.__engineFixture.state.fills).length), 0, 'color by number rejects the wrong number');
  await page.touchscreen.tap(175, 176.45);
  await page.waitForFunction(() => window.__engineFixture.state.fills.eye?.color === '#548cff');
  await page.evaluate(() => window.__engineFixture.setSettings({ tool: 'eyedropper', mode: 'free' }));
  await page.waitForFunction(() => window.__engineFixture.settings.tool === 'eyedropper');
  // Wait for the presentation-only spreading animation to finish before sampling.
  await page.waitForTimeout(300);
  await page.touchscreen.tap(175, 176.45);
  await page.waitForFunction(() => window.__engineFixture.picked === '#548cff');
  console.log('PASS: 6 touch checks: pinch distance, provisional cancellation, no accidental fill, zoomed touch accuracy, numbered palette enforcement and eyedropper pixel sampling.');
} finally {
  await browser.close();
  await server.close();
}
