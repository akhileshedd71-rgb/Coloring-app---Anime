// Real Canvas2D checks for PNG mask boundaries, including compound holes.
// Run after compiling the library: node scripts/validate-png-canvas.mjs
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 5186, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
try {
  const tab = await browser.newPage();
  await tab.goto('http://127.0.0.1:5186');
  const pages = await tab.evaluate(async () => {
    const { prepareArtwork, renderArtwork } = await import('/src/engine/render.ts');
    const catalog = await (await fetch('/art/catalog.json')).json();
    const results = [];
    for (const meta of catalog.filter(item => item.lineart?.endsWith('.png'))) {
      const art = await (await fetch(meta.file)).json();
      await prepareArtwork(art);
      const canvas = document.createElement('canvas'); canvas.width = art.width; canvas.height = art.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const empty = { fills: {}, strokes: [], shading: false };
      renderArtwork(ctx, art, empty);
      const blank = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const offset = region => (Math.floor(region.label[1]) * art.width + Math.floor(region.label[0])) * 4;
      const selected = [...art.regions].sort((a, b) => b.d.length - a.d.length).slice(0, 2);
      const checks = [];
      for (const target of selected) {
        // A very wide stroke deliberately covers the entire page; only the
        // locked region may change, including when its contour has many holes.
        const stroke = { id: 'boundary-probe', tool: 'brush', color: '#25a95a', opacity: 1, size: Math.max(art.width, art.height) * 4,
          regionId: target.id, points: [{ x: art.width / 2, y: art.height / 2, pressure: 1 }] };
        const states = {
          gradient: { ...empty, fills: { [target.id]: { color: '#f43d6e', secondary: '#3f55eb', angle: 35 } } },
          guidedBrush: { ...empty, strokes: [stroke] },
        };
        for (const [mode, state] of Object.entries(states)) {
          renderArtwork(ctx, art, state);
          const colored = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          const leaks = art.regions.filter(region => region.id !== target.id && [0, 1, 2, 3].some(channel => colored[offset(region) + channel] !== blank[offset(region) + channel])).map(region => region.id);
          const targetChanged = [0, 1, 2].some(channel => colored[offset(target) + channel] !== blank[offset(target) + channel]);
          checks.push({ mode, region: target.id, otherAnchorsUnchanged: art.regions.length - 1 - leaks.length, targetChanged, leaks });
        }
      }
      // This is a reproducible cloud Chromium sample, not an Android benchmark.
      canvas.width = 720; canvas.height = Math.round(720 * art.height / art.width);
      ctx.setTransform(720 / art.width, 0, 0, 720 / art.width, 0, 0);
      const state = { ...empty, fills: Object.fromEntries(art.regions.map(region => [region.id, { color: region.color }])) };
      renderArtwork(ctx, art, state); ctx.getImageData(0, 0, canvas.width, canvas.height);
      const timings = [];
      for (let sample = 0; sample < 5; sample++) {
        const start = performance.now(); renderArtwork(ctx, art, state); ctx.getImageData(0, 0, canvas.width, canvas.height);
        timings.push(performance.now() - start);
      }
      results.push({ id: art.id, regions: art.regions.length, checks, chromiumRedrawMs: Number((timings.reduce((a, b) => a + b) / timings.length).toFixed(2)) });
      canvas.width = 1; canvas.height = 1;
    }
    return results;
  });
  assert.ok(pages.length > 0, 'Compile the PNG collection before running this check.');
  await writeFile('docs/png-canvas-checks.json', JSON.stringify({ environment: 'Headless cloud Chromium, 720-pixel canvas width, full pixel readback; not an Android performance result', pages }, null, 2));
  for (const page of pages) for (const check of page.checks) {
    assert.equal(check.targetChanged, true, `${page.id}/${check.region}: ${check.mode} failed to color its target`);
    assert.deepEqual(check.leaks, [], `${page.id}/${check.region}: ${check.mode} escaped its region`);
  }
  console.log(`PASS: ${pages.length} PNG pages; ${pages.length * 4} actual gradient/brush boundary checks preserve every neighboring region anchor.`);
} finally {
  await browser.close(); await server.close();
}
