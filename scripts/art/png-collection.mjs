import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

/** PNG pages retain their original ink. Compile new sources with build-png-art.py. */
export function generatePages() {
  const manifestPath = new URL('../../assets/source/new-collection.json', import.meta.url);
  if (!existsSync(manifestPath)) return [];
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  return manifest.pages.map(({ id, source }) => {
    const path = new URL(`./generated/png/${id}.json`, import.meta.url);
    if (!existsSync(path)) throw Error(`Compile PNG source ${id} first: python scripts/build-png-art.py`);
    const page = JSON.parse(readFileSync(path, 'utf8'));
    const sourcePath = new URL(`../../${source}`, import.meta.url);
    const checksum = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
    if (checksum !== page.sourceSha256) throw Error(`PNG source changed for ${id}; compile and review it under a new page ID before publishing`);
    return page;
  });
}
