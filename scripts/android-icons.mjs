import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';

const res = new URL('../android/app/src/main/res/', import.meta.url);
const mark = `<path d="M48 25C35 31 30 47 35 60c5 13 18 21 33 17-9 10-26 12-39 5-18-10-24-33-12-50 8-12 23-18 37-14Z" fill="#d8ccff"/>
<path d="M62 26c0 12-4 17-15 20 11 3 15 8 15 20 3-12 8-17 20-20-12-3-17-8-20-20Z" fill="#fff7df"/>
<path d="m40 69 20-20 7 7-20 20-10 3Z" fill="#ffb7c9"/>
<path d="m39 72 5 5-7 2Z" fill="#fff7df"/>
<path d="M80 66c0 5-2 8-7 9 5 2 7 4 7 9 2-5 4-7 9-9-5-1-7-4-9-9Z" fill="#d4f3ed"/>`;
const svg = (background = true, round = false) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">${background ? (round ? '<circle cx="54" cy="54" r="54" fill="#7561bd"/>' : '<rect width="108" height="108" rx="25" fill="#7561bd"/>') : ''}${mark}</svg>`;
for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  const folder = new URL(`mipmap-${density}/`, res);
  await mkdir(folder, { recursive: true });
  await sharp(Buffer.from(svg())).resize(size, size).png().toFile(new URL('ic_launcher.png', folder).pathname);
  await sharp(Buffer.from(svg(true, true))).resize(size, size).png().toFile(new URL('ic_launcher_round.png', folder).pathname);
  await sharp(Buffer.from(svg(false))).resize(Math.round(size * 2.25), Math.round(size * 2.25)).png().toFile(new URL('ic_launcher_foreground.png', folder).pathname);
}
await writeFile(new URL('../docs/hoshii-icon.svg', import.meta.url), svg());
console.log('Hoshii original launcher icons generated.');
