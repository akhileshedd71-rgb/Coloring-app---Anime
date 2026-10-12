import { expect, test, type Page, type TestInfo } from '@playwright/test';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import type { ArtMeta, ArtPage, Project } from '../src/types';

type Target = { id: string; number: number; x: number; y: number; label: [number, number] };
const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
});

test.afterEach(({ page }) => { expect(browserErrors.get(page)).toEqual([]); });

async function library(page: Page): Promise<ArtMeta[]> {
  await page.goto('/');
  await expect(page.locator('.art-card').first()).toBeVisible();
  const response = await page.request.get('/art/catalog.json');
  expect(response.ok()).toBeTruthy();
  const catalog = await response.json() as ArtMeta[];
  expect(catalog.length).toBeGreaterThanOrEqual(100);
  return catalog;
}

async function projects(page: Page): Promise<Project[]> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('hoshii-studio');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('projects', 'readonly');
      const read = transaction.objectStore('projects').getAll();
      transaction.oncomplete = () => { db.close(); resolve(read.result); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    };
  }));
}

async function openArt(page: Page, meta: ArtMeta, mode = 'Free color'): Promise<ArtPage> {
  await page.getByRole('searchbox', { name: 'Search artwork' }).fill(meta.title);
  await page.getByRole('button', { name: `Open ${meta.title}`, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: meta.title, exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: new RegExp(`^${mode}`) }).click();
  await dialog.getByRole('button', { name: 'Let’s add some color' }).click();
  await expect(page.getByTestId('paint-canvas')).toBeVisible();
  await expect(page.getByRole('heading', { name: meta.title, exact: true })).toBeVisible();
  const response = await page.request.get(meta.file.replace(/^\.\//, '/'));
  return response.json();
}

async function targets(page: Page, art: ArtPage): Promise<Target[]> {
  await page.getByRole('button', { name: 'Fit to screen', exact: true }).click();
  await expect(page.locator('.zoom-label')).toHaveText('100%');
  return page.evaluate(artwork => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="paint-canvas"]')!;
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min((rect.width - 36) / artwork.width, (rect.height - 36) / artwork.height);
    const ox = (rect.width - artwork.width * scale) / 2;
    const oy = (rect.height - artwork.height * scale) / 2;
    const context = document.createElement('canvas').getContext('2d')!;
    const paths = artwork.regions.map(region => new Path2D(region.d));
    return artwork.regions.filter((region, index) => {
      // Use actual visible hit geometry, and avoid overlay controls at the top/bottom.
      const [x, y] = region.label;
      if (paths.some((path, above) => above > index && context.isPointInPath(path, x, y, artwork.regions[above].fillRule ?? 'nonzero'))) return false;
      if (!context.isPointInPath(paths[index], x, y, region.fillRule ?? 'nonzero')) return false;
      const sy = oy + y * scale;
      return sy > 65 && sy < rect.height - 65;
    }).map(region => ({ id: region.id, number: region.number, label: region.label, x: rect.left + ox + region.label[0] * scale, y: rect.top + oy + region.label[1] * scale }));
  }, art);
}

async function tap(page: Page, target: Target) { await page.mouse.click(target.x, target.y); }

async function chooseHex(page: Page, hex: string) {
  await page.getByRole('button', { name: 'Open full color picker' }).click();
  await page.getByRole('textbox', { name: 'HEX color', exact: true }).fill(hex);
  await page.getByRole('textbox', { name: 'HEX color', exact: true }).press('Enter');
  await page.getByRole('dialog', { name: 'Color studio' }).getByRole('button', { name: 'Close dialog' }).click();
}

async function navigation(page: Page, name: string) {
  const mobile = page.getByRole('navigation', { name: 'Mobile navigation' });
  const nav = await mobile.isVisible() ? mobile : page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('button', { name: new RegExp(`^${name}`) }).click();
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
}

async function screenshot(page: Page, name: string) {
  await mkdir('docs/screenshots', { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.toast')).toHaveCount(0, { timeout: 5_000 });
  await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: false });
}

test('library search, category and difficulty filters, favorites, theme persistence, desktop layout', async ({ page }) => {
  const catalog = await library(page);
  await noOverflow(page);
  await screenshot(page, 'home-desktop');
  const chosen = catalog.find(art => art.category === 'Kawaii')!;
  await page.getByRole('group', { name: 'Artwork categories' }).getByRole('button', { name: 'Kawaii', exact: true }).click();
  await page.getByLabel('Filter by difficulty').selectOption(chosen.difficulty);
  const expected = catalog.filter(art => art.category === chosen.category && art.difficulty === chosen.difficulty);
  await expect(page.locator('.art-grid .art-card')).toHaveCount(expected.length);
  await page.getByRole('searchbox', { name: 'Search artwork' }).fill(chosen.title);
  await expect(page.locator('.art-grid .art-card')).toHaveCount(1);
  await page.getByRole('button', { name: `Favorite ${chosen.title}`, exact: true }).click();
  await expect(page.getByRole('button', { name: `Unfavorite ${chosen.title}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await navigation(page, 'Favorites');
  await expect(page.locator('.art-grid .art-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Toggle dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await navigation(page, 'Favorites');
  await expect(page.locator('.art-grid .art-card')).toHaveCount(1);
  await page.getByRole('button', { name: `Unfavorite ${chosen.title}`, exact: true }).click();
  await expect(page.getByText('Keep your favorites close.')).toBeVisible();
  await noOverflow(page);
});

test('mobile fill, gradient, undo/redo, autosave restore, rename, duplicate and confirmed deletion', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const catalog = await library(page);
  await noOverflow(page); await screenshot(page, 'home-mobile');
  const art = await openArt(page, catalog.find(art => art.category === 'Anime portraits')!);
  const points = await targets(page, art);
  expect(points.length).toBeGreaterThan(5);
  await chooseHex(page, '#E65F88');
  await tap(page, points[0]);
  await expect.poll(async () => (await projects(page))[0].state.fills[points[0].id]?.color).toBe('#E65F88');
  await page.getByRole('button', { name: 'Gradient', exact: true }).click();
  await tap(page, points[1]);
  await expect.poll(async () => Boolean((await projects(page))[0].state.fills[points[1].id]?.secondary)).toBeTruthy();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await projects(page))[0].state.fills[points[1].id]).toBeUndefined();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect.poll(async () => Boolean((await projects(page))[0].state.fills[points[1].id]?.secondary)).toBeTruthy();
  await page.getByRole('button', { name: 'Fill', exact: true }).click();
  for (const target of points.slice(2, 6)) await tap(page, target);
  await expect(page.locator('.save-status')).toContainText('All changes saved');
  await screenshot(page, 'studio-mobile');
  await noOverflow(page);
  const before = (await projects(page))[0];
  await page.reload();
  await expect(page.locator('.continue-card')).toBeVisible();
  await navigation(page, 'My gallery');
  await page.locator('.gallery-grid .art-image').first().click();
  await expect(page.getByTestId('paint-canvas')).toBeVisible();
  expect((await projects(page))[0].state).toEqual(before.state);
  await expect(page.locator('.studio-subheader')).toContainText(`${art.regions.length - 6} regions waiting for color`);
  await page.getByRole('button', { name: 'Back to library' }).click();
  await expect(page.locator('.gallery-grid')).toBeVisible();
  await page.getByRole('button', { name: `Options for ${art.title}`, exact: true }).click();
  await page.getByRole('textbox', { name: 'Artwork name' }).fill('');
  await page.getByRole('textbox', { name: 'Artwork name' }).pressSequentially('My rose-colored day', {delay:15});
  await page.getByRole('button', { name: 'Save name' }).click();
  await expect(page.getByRole('heading', { name: 'My rose-colored day', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Options for My rose-colored day', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicate editable artwork' }).click();
  await expect(page.locator('.gallery-grid .art-card')).toHaveCount(2);
  const duplicated = await projects(page);
  expect(duplicated[0].state).toEqual(duplicated[1].state);
  expect(duplicated[0].id).not.toEqual(duplicated[1].id);
  await screenshot(page, 'gallery-mobile');
  await page.getByRole('button', { name: 'Options for My rose-colored day · copy', exact: true }).click();
  await page.getByRole('button', { name: 'Delete this artwork' }).click();
  await page.getByRole('dialog', { name: 'Confirm artwork deletion' }).getByRole('button', { name: 'Keep artwork' }).click();
  await expect(page.locator('.gallery-grid .art-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Delete this artwork' }).click();
  await page.getByRole('dialog', { name: 'Confirm artwork deletion' }).getByRole('button', { name: 'Delete artwork', exact: true }).click();
  await expect(page.locator('.gallery-grid .art-card')).toHaveCount(1);
  expect((await projects(page))[0].name).toBe('My rose-colored day');
  await page.getByRole('button', { name: 'Options for My rose-colored day', exact: true }).click();
  await page.getByRole('button', { name: 'Start a fresh coloring' }).click();
  await page.getByRole('dialog', { name: art.title }).getByRole('button', { name: 'Let’s add some color' }).click();
  await expect(page.getByTestId('paint-canvas')).toBeVisible();
  const attempts = await projects(page);
  expect(attempts).toHaveLength(2);
  expect(attempts.find(project => project.name === 'My rose-colored day')!.state).toEqual(before.state);
  expect(attempts.find(project => project.name === art.title)!.state.fills).toEqual({});
});

test('number mode counts regions, rejects wrong colors, provides hints and supports landscape controls', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const catalog = await library(page);
  const art = await openArt(page, catalog.find(art => art.difficulty === 'Easy')!, 'Color by number');
  const target = (await targets(page, art)).find(point => point.number !== 1)!;
  expect(target).toBeTruthy();
  await tap(page, target);
  expect(Object.keys((await projects(page))[0].state.fills)).toHaveLength(0);
  await expect(page.getByText(`This region uses color ${target.number}. Select its numbered swatch first.`, { exact: true })).toBeAttached();
  const count = art.regions.filter(region => region.number === target.number).length;
  await page.getByRole('button', { name: `Color ${target.number}, ${count} regions remaining`, exact: true }).click();
  await tap(page, target);
  await expect(page.getByRole('button', { name: `Color ${target.number}, ${count - 1} regions remaining`, exact: true })).toBeVisible();
  await expect.poll(async () => (await projects(page))[0].state.fills[target.id]?.color).toBe(art.palette[target.number - 1]);
  await page.getByRole('button', { name: 'Hint', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Look for the highlighted');
  await page.getByRole('button', { name: 'Toggle region numbers' }).click();
  await expect(page.getByRole('button', { name: 'Toggle region numbers' })).toHaveAttribute('aria-pressed', 'false');
  await page.setViewportSize({ width: 800, height: 360 });
  await noOverflow(page);
  await expect(page.getByRole('button', { name: 'Fit to screen' })).toBeVisible();
  await page.getByRole('button', { name: 'Fit to screen' }).click();
  await expect(page.locator('.zoom-label')).toHaveText('100%');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page.locator('.zoom-label')).toHaveText('135%');
  await page.getByRole('button', { name: 'Toggle full-screen painting' }).click();
  await expect(page.locator('.studio')).toHaveClass(/fullscreen/);
  await page.getByRole('button', { name: 'Toggle full-screen painting' }).click();
  await page.getByRole('button', { name: 'Back to library' }).click();
  await expect(page.locator('.app-shell')).toBeVisible();
});

test('PNG and JPEG exports contain the final coloring at full resolution', async ({ page }, testInfo: TestInfo) => {
  const catalog = await library(page);
  const art = await openArt(page, catalog.find(art => art.category === 'Anime portraits')!);
  const target = (await targets(page, art))[0];
  await page.getByRole('button', { name: 'Soft shading on', exact: true }).click();
  await chooseHex(page, '#EB5269');
  await tap(page, target);
  await expect.poll(async () => (await projects(page))[0].state.fills[target.id]?.color).toBe('#EB5269');
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export artwork' });
  await expect(dialog.getByAltText('Your current finished artwork')).toBeVisible();
  const scale = Math.min(3, 4096 / Math.max(art.width, art.height), Math.sqrt(12_000_000 / (art.width * art.height)));
  for (const format of ['png', 'jpeg']) {
    await dialog.getByLabel('File format').selectOption(format);
    const downloadEvent = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Export & share' }).click();
    const download = await downloadEvent;
    const destination = testInfo.outputPath(`finished.${format === 'jpeg' ? 'jpg' : 'png'}`);
    await download.saveAs(destination);
    const image = sharp(destination);
    const metadata = await image.metadata();
    expect(metadata.width).toBe(Math.round(art.width * scale));
    expect(metadata.height).toBe(Math.round(art.height * scale));
    expect(metadata.format).toBe(format);
    const pixel = await image.extract({ left: Math.round(target.label[0] * scale), top: Math.round(target.label[1] * scale), width: 1, height: 1 }).removeAlpha().raw().toBuffer();
    const distance = Math.abs(pixel[0] - 235) + Math.abs(pixel[1] - 82) + Math.abs(pixel[2] - 105);
    expect(distance).toBeLessThan(format === 'png' ? 6 : 35);
  }
  await dialog.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByTestId('paint-canvas')).toBeVisible();
});

test('a failed save keeps the coloring open and Retry save persists it', async ({ page }) => {
  const catalog = await library(page);
  const art = await openArt(page, catalog[0]);
  const target = (await targets(page, art))[0];
  await chooseHex(page, '#3EB69C');
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    Object.assign(window, { __failArtworkWrites: true });
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'projects' && (window as unknown as { __failArtworkWrites: boolean }).__failArtworkWrites) throw new DOMException('Simulated full storage', 'QuotaExceededError');
      return original.apply(this, args as [unknown, IDBValidKey]);
    };
  });
  await tap(page, target);
  await expect(page.getByRole('alert')).toContainText('Your latest change is still in memory.');
  await expect(page.getByTestId('paint-canvas')).toBeVisible();
  expect((await projects(page))[0].state.fills[target.id]).toBeUndefined();
  await page.getByRole('button', { name: 'Dismiss error' }).click();
  await page.getByRole('button', { name: 'Back to library' }).click();
  await expect(page.getByRole('alert')).toContainText('Your latest change is still in memory.');
  await expect(page.getByTestId('paint-canvas')).toBeVisible();
  await page.evaluate(() => { Object.assign(window, { __failArtworkWrites: false }); });
  await page.getByRole('button', { name: 'Retry save' }).click();
  await expect.poll(async () => (await projects(page))[0].state.fills[target.id]?.color).toBe('#3EB69C');
  await expect(page.locator('.save-status')).toContainText('All changes saved');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('an interrupted artwork load can be retried without losing library navigation', async ({ page }) => {
  const catalog = await library(page);
  const meta = catalog[0];
  const pathname = new URL(meta.file, 'http://127.0.0.1:5173/').pathname;
  await page.route(`**${pathname}`, route => route.abort('failed'));
  await page.getByRole('searchbox', { name: 'Search artwork' }).fill(meta.title);
  await page.getByRole('button', { name: `Open ${meta.title}`, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: meta.title, exact: true });
  await dialog.getByRole('button', { name: 'Let’s add some color' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(dialog).toBeVisible();
  await page.unroute(`**${pathname}`);
  await page.getByRole('button', { name: 'Dismiss error' }).click();
  await dialog.getByRole('button', { name: 'Let’s add some color' }).click();
  await expect(page.getByTestId('paint-canvas')).toBeVisible();
});

test('mobile custom palettes and advanced brush settings remain editable and persist', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const catalog = await library(page);
  const art = await openArt(page, catalog.find(art => art.difficulty === 'Easy')!, 'Paint & shade');
  const target = (await targets(page, art))[0];
  await page.getByRole('button', { name: 'Open full color picker' }).click();
  const colorDialog = page.getByRole('dialog', { name: 'Color studio' });
  await colorDialog.getByRole('textbox', { name: 'HEX color', exact: true }).fill('#3189AB');
  await colorDialog.getByRole('textbox', { name: 'HEX color', exact: true }).press('Enter');
  await colorDialog.getByRole('button', { name: 'Save current swatch' }).click();
  await colorDialog.getByRole('textbox', { name: 'Custom palette name' }).fill('Ocean daydream');
  await colorDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(colorDialog.getByRole('combobox', { name: 'Palette', exact: true })).toHaveValue('Ocean daydream');
  await colorDialog.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('.palette-name')).toContainText('Ocean daydream');
  await page.getByRole('button', { name: 'Advanced tool settings' }).click();
  const toolDialog = page.getByRole('dialog', { name: 'Tool settings' });
  await toolDialog.getByRole('slider', { name: 'Brush size' }).focus();
  await page.keyboard.press('End');
  await toolDialog.getByRole('slider', { name: 'Brush opacity' }).focus();
  await page.keyboard.press('Home');
  await toolDialog.getByRole('checkbox', { name: 'Stay inside the lines' }).uncheck();
  await toolDialog.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Brush', exact: true }).click();
  await page.mouse.move(target.x, target.y); await page.mouse.down();
  await page.mouse.move(target.x + 20, target.y + 10, { steps: 5 }); await page.mouse.up();
  await expect.poll(async () => (await projects(page))[0].state.strokes.length).toBe(1);
  const stroke = (await projects(page))[0].state.strokes[0];
  expect(stroke.tool).toBe('brush'); expect(stroke.color).toBe('#3189AB');
  expect(stroke.size).toBe(160); expect(stroke.opacity).toBe(0.05); expect(stroke.regionId).toBeUndefined();
  expect(stroke.points.length).toBeGreaterThan(2);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await projects(page))[0].state.strokes.length).toBe(0);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect.poll(async () => (await projects(page))[0].state.strokes.length).toBe(1);
  await page.reload();
  await page.locator('.continue-card').click();
  await expect(page.getByTestId('paint-canvas')).toBeVisible();
  expect((await projects(page))[0].state.strokes[0]).toEqual(stroke);
  await page.getByRole('button', { name: 'Open full color picker' }).click();
  await page.getByRole('dialog', { name: 'Color studio' }).getByRole('combobox', { name: 'Palette', exact: true }).selectOption('Ocean daydream');
  await expect(page.getByRole('dialog', { name: 'Color studio' }).getByRole('button', { name: 'Choose #3189AB', exact: true })).toBeVisible();
});

test('standalone character exports a transparent PNG with preserved colored pixels', async ({page}, testInfo) => {
  await page.setViewportSize({width:390,height:844});
  const catalog=await library(page);
  const chosen=catalog.find(art=>art.transparent);
  expect(chosen).toBeTruthy();
  const art=await openArt(page,chosen!);
  const target=(await targets(page,art))[0];
  await page.getByRole('button',{name:'Soft shading on',exact:true}).click();
  await chooseHex(page,'#E65B83');await tap(page,target);
  await expect.poll(async()=>(await projects(page))[0].state.fills[target.id]?.color).toBe('#E65B83');
  await page.getByRole('button',{name:'Share',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Export artwork'});
  await dialog.getByLabel('Transparent background').check();
  const pending=page.waitForEvent('download');
  await dialog.getByRole('button',{name:'Export & share'}).click();
  const file=testInfo.outputPath('transparent-character.png');await(await pending).saveAs(file);
  const metadata=await sharp(file).metadata();expect(metadata.hasAlpha).toBe(true);
  const corner=await sharp(file).extract({left:0,top:0,width:1,height:1}).raw().toBuffer();
  expect(corner[3]).toBe(0);
  const pixel=await sharp(file).extract({left:Math.round(target.label[0]*3),top:Math.round(target.label[1]*3),width:1,height:1}).raw().toBuffer();
  expect(pixel[3]).toBe(255);
  expect(Math.abs(pixel[0]-230)+Math.abs(pixel[1]-91)+Math.abs(pixel[2]-131)).toBeLessThan(10);
});

test('New Horizons exposes twenty new drawings across all ten categories', async ({ page }) => {
  const catalog = await library(page);
  const expansion = catalog.filter(item => item.tags.includes('new horizons'));
  expect(expansion).toHaveLength(20);
  expect(new Set(expansion.map(item => item.id)).size).toBe(20);
  const categories = [...new Set(expansion.map(item => item.category))];
  expect(categories).toHaveLength(10);
  for (const category of categories) expect(expansion.filter(item => item.category === category)).toHaveLength(2);
  await page.getByRole('searchbox', { name: 'Search artwork' }).fill('new horizons');
  await expect(page.locator('.art-grid .art-card')).toHaveCount(20);
  for (const meta of expansion) await expect(page.getByRole('button', { name: `Open ${meta.title}`, exact: true })).toBeVisible();
});

test('Anime favorites finds twenty characters by collection, series and name', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const catalog = await library(page);
  const expansion = catalog.filter(item => item.tags.includes('anime favorites'));
  expect(expansion).toHaveLength(20);
  expect(new Set(expansion.map(item => item.id)).size).toBe(20);
  await page.getByRole('group', { name: 'Artwork categories' }).getByRole('button', { name: 'Anime favorites', exact: true }).click();
  await expect(page.locator('.art-grid .art-card')).toHaveCount(20);
  for (const series of ['naruto', 'one piece', 'dragon ball z', 'demon slayer', 'jujutsu kaisen']) {
    const expected = expansion.filter(item => item.tags.includes(series));
    expect(expected).toHaveLength(4);
    await page.getByRole('searchbox', { name: 'Search artwork' }).fill(series);
    await expect(page.locator('.art-grid .art-card')).toHaveCount(4);
    for (const meta of expected) await expect(page.getByRole('button', { name: `Open ${meta.title}`, exact: true })).toBeVisible();
  }
  await page.getByRole('searchbox', { name: 'Search artwork' }).fill('zenitsu');
  await expect(page.locator('.art-grid .art-card')).toHaveCount(1);
  const zenitsu = expansion.find(item => item.id === 'anime-zenitsu')!;
  await page.getByLabel('Filter by difficulty').selectOption(zenitsu.difficulty);
  await expect(page.getByRole('button', { name: `Open ${zenitsu.title}`, exact: true })).toBeVisible();
  await noOverflow(page);
});

for (const artworkId of [undefined, 'atelier-celestial-violinist', 'atelier-little-star-witch', 'atelier-axolotl-garden', 'anime-naruto', 'anime-luffy', 'anime-goku', 'anime-zenitsu', 'anime-gojo']) {
test(`generated PNG ${artworkId ?? 'illustration'} fills, undo, restore and full-resolution export stay aligned`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const catalog = await library(page);
  const meta = catalog.find(item => artworkId ? item.id === artworkId : item.lineart?.endsWith('.png'));
  expect(meta, 'the library includes individually generated PNG artwork').toBeTruthy();
  const art = await openArt(page, meta!);
  expect(art.rasterInk).toBeTruthy();
  const target = (await targets(page, art))[0];
  expect(target).toBeTruthy();
  await page.getByRole('button', { name: 'Soft shading on', exact: true }).click();
  await chooseHex(page, '#ED547D'); await tap(page, target);
  await expect.poll(async () => (await projects(page))[0].state.fills[target.id]?.color).toBe('#ED547D');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => Object.keys((await projects(page))[0].state.fills).length).toBe(0);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect.poll(async () => (await projects(page))[0].state.fills[target.id]?.color).toBe('#ED547D');
  const before = (await projects(page))[0];
  await page.reload();
  await expect(page.locator('.continue-card')).toBeVisible();
  await navigation(page, 'My gallery');
  await page.locator('.gallery-grid .art-image').first().click();
  await expect(page.getByTestId('paint-canvas')).toBeVisible();
  expect((await projects(page))[0].state).toEqual(before.state);
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export artwork' });
  const pending = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export & share' }).click();
  const file = testInfo.outputPath('generated-illustration.png'); await (await pending).saveAs(file);
  const scale = Math.min(3, 4096 / Math.max(art.width, art.height), Math.sqrt(12_000_000 / (art.width * art.height)));
  const metadata = await sharp(file).metadata();
  expect(metadata.width).toBe(Math.round(art.width * scale)); expect(metadata.height).toBe(Math.round(art.height * scale));
  const pixel = await sharp(file).extract({ left: Math.round(target.label[0] * scale), top: Math.round(target.label[1] * scale), width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  // Original PNG ink includes faint paper/antialias pixels even inside a region.
  // Compare against the chosen fill composited with that immutable ink, rather
  // than assuming every interior sample has perfectly transparent source ink.
  const expected = await page.evaluate(async ({ art, scale, label }) => {
    const ink = new Image(); ink.src = art.rasterInk!; await ink.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(art.width * scale); canvas.height = Math.round(art.height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ED547D'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale); ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(ink, 0, 0, art.width, art.height);
    return Array.from(ctx.getImageData(Math.round(label[0] * scale), Math.round(label[1] * scale), 1, 1).data);
  }, { art, scale, label: target.label });
  expect(expected[0] - expected[1], 'the sampled region visibly contains the chosen pink fill').toBeGreaterThan(100);
  expect(Math.abs(pixel[0] - expected[0]) + Math.abs(pixel[1] - expected[1]) + Math.abs(pixel[2] - expected[2])).toBeLessThan(9);
  await noOverflow(page);
});
}

test('missing PNG ink blocks editing until a successful retry', async ({ page }) => {
  const catalog = await library(page);
  const meta = catalog.find(item => item.lineart?.endsWith('.png'));
  expect(meta).toBeTruthy();
  const response = await page.request.get(meta!.file.replace(/^\.\//, '/'));
  const art = await response.json() as ArtPage;
  const path = new URL(art.rasterInk!, 'http://127.0.0.1:5173/').pathname;
  await page.route(`**${path}`, route => route.abort('failed'));
  await page.getByRole('searchbox', { name: 'Search artwork' }).fill(meta!.title);
  await page.getByRole('button', { name: `Open ${meta!.title}`, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: meta!.title, exact: true });
  await dialog.getByRole('button', { name: 'Let’s add some color' }).click();
  await expect(page.getByRole('alert')).toContainText('line art could not load');
  await expect(page.getByTestId('paint-canvas')).toHaveCount(0);
  expect(await projects(page)).toHaveLength(0);
  await page.unroute(`**${path}`);
  await page.getByRole('button', { name: 'Dismiss error' }).click();
  await dialog.getByRole('button', { name: 'Let’s add some color' }).click();
  await expect(page.getByTestId('paint-canvas')).toBeVisible();
  expect(await projects(page)).toHaveLength(1);
});

test.describe('intricate PNG touch coloring', () => {
  test.use({ hasTouch: true });
  test('a tiny numbered region remains accurately tappable at 20x zoom', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const catalog = await library(page);
    const meta = catalog.find(item => item.id === 'atelier-cloud-ribbon')!;
    expect(meta).toBeTruthy();
    const art = await openArt(page, meta, 'Color by number');
    const response = await page.request.get(`/docs/png-art/${art.id}.json`);
    const diagnostics = await response.json() as { regions: { id: string; area: number; radius: number }[] };
    const target = (await targets(page, art)).find(point => diagnostics.regions.some(region => region.id === point.id && region.area <= 60 && region.radius >= 2));
    expect(target, 'the test reaches an actual tiny mask instead of a large synthetic region').toBeTruthy();
    const count = art.regions.filter(region => region.number === target!.number).length;
    await page.getByRole('button', { name: `Color ${target!.number}, ${count} regions remaining`, exact: true }).click();
    // Wheel zoom anchors the same artwork point beneath the pointer. The fill
    // itself uses a real touchscreen event after the 20x transformation.
    await page.mouse.move(target!.x, target!.y); await page.mouse.wheel(0, -3000);
    await expect(page.locator('.zoom-label')).toHaveText('2000%');
    await page.touchscreen.tap(target!.x, target!.y);
    await expect.poll(async () => (await projects(page))[0].state.fills[target!.id]?.color).toBe(art.palette[target!.number - 1]);
    expect(Object.keys((await projects(page))[0].state.fills)).toEqual([target!.id]);
    await expect(page.getByRole('button', { name: `Color ${target!.number}, ${count - 1} regions remaining`, exact: true })).toBeVisible();
    await noOverflow(page);
    await screenshot(page, 'atelier-deep-zoom');
  });
});
