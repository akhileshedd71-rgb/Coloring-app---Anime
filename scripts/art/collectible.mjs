import { readFileSync } from 'node:fs';
// Source is retained in assets/source. Regenerate with scripts/trace-illustration.py.
// Every displayed reference is rendered from this editable vector composition.
export function generatePages() {
  return [JSON.parse(readFileSync(new URL('./generated/moon-botanist.json', import.meta.url), 'utf8'))];
}
