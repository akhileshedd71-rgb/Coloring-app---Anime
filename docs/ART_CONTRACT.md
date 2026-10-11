# Shared artwork contract

`src/types.ts` defines the data consumed by the editor. Both vector illustrations and PNG illustrations use the same editable region IDs, suggested palette, brushes, gallery storage, and exports.

## Every illustration

- Keep a globally unique, permanent page `id`; region `id` values are permanent within that page. Saved projects reference these IDs. Add a new page/version instead of replacing published geometry under an existing ID.
- Supply `title`, `category`, `difficulty`, searchable `tags`, `description`, positive `width`/`height`, `palette`, `regions`, `lines`, `shades`, and `transparent`.
- A region has a closed SVG path `d`, a stable `id`, a useful `name`, HEX `color`, one-based palette `number`, and an interior `label: [x, y]`. The label must hit that region in the final visible composition. `palette[number - 1]` must equal `color`.
- Geometry, lines, shading, references, and labels use the same page coordinates. Every visible coloring region must be reachable; remove fully hidden shapes from the completion count.
- Difficulty follows actual region sizes, fine details, and density. Do not label a page Easy simply because its subject is cute.
- `transparent: true` is reserved for suitable standalone character artwork without a paper/background region. Scene pages remain opaque.
- A catalog entry includes `file` for the page JSON, lightweight `thumbnail`, and aligned finished `reference`; PNG entries also include `lineart`. Use bundled relative URLs beginning `./art/` so the library remains available offline.

## Vector pages

The original 101 pages use 1000 × 1300 coordinates. Generator modules export `generatePages()`; `node scripts/build-art.mjs` writes page JSON, SVG line art, aligned SVG reference, and a WebP thumbnail.

Regions draw in array order and hit-testing occurs in reverse order. Brush locking excludes overlaid regions, such as eyes over a face. The optional `strokeWidth` overrides the region outline; zero suppresses it. `lines` contains expressive stroked details, `ink` contains immutable colored path shapes, and `shades` contains optional aligned translucent paths. Their geometry remains fixed while the user colors.

## PNG pages

Each PNG drawing is generated and reviewed individually. The original generation is kept under `assets/source/`. The reviewed blank PNG, interactive mask geometry, transparent ink PNG, colored reference PNG, and thumbnail derive from that same composition. See [PNG collection pipeline](PNG_COLLECTION.md) for generation, cleanup, palette guides, and expansion instructions.

Additional `ArtPage` fields:

```ts
rasterInk?: string; // Transparent RGBA PNG, drawn above every coloring layer.
lineart?: string;   // Reviewed, opaque blank PNG for archival/download use.
reference?: string; // Aligned suggested-color PNG.
```

`width` and `height` must equal the actual ink PNG dimensions. Regions are mask contours with `strokeWidth: 0` and optional `fillRule: 'evenodd'`. The even-odd rule preserves compound holes and islands. Masks form a disjoint partition: their interiors must not overlap. The renderer relies on this invariant to clip a brush directly to its selected mask without subtracting thousands of unrelated regions. Fine decorative ink remains in the PNG; it must not be approximated by newly traced black vector outlines.

The original PNG line detail is immutable. Fill, gradient, brush, airbrush, sparkle, eraser, and optional shading draw beneath it. Erasing never removes the ink. Tiny fixed decorative details that do not have a usable coloring surface must be documented by the pipeline and excluded from the completion count. A published colored reference uses the same masks, suggested colors, and ink as the editor, allowing only subpixel anti-aliasing differences at contour edges.

## Loading and rendering

Call `await prepareArtwork(page)` before mounting an editor or calling `renderArtwork`. Vector pages require no asynchronous assets. PNG pages wait for the ink to load and decode and validate its dimensions. Failed loads are retryable and must not create an editable project with missing line art.

`exportArtwork` prepares the image itself before rendering, including thumbnails, gallery previews, and native PNG/JPEG sharing. It exports the final saved state without fill-reveal animations, number labels, or hint decorations. It retains the 4096-pixel longest-edge and 12-million-pixel memory limits. The displayed export resolution must use the same calculation.

The image LRU retains at most three spare images and budgets decoded RGBA bytes at 32 MiB. Live page objects retain their own prepared ink, so loading another drawing cannot invalidate an open canvas or an in-progress export. Page and viewport caches use weak ownership; they are not a permanent decoded copy of the entire library.

## Checks before publishing new artwork

```sh
npm run art
node scripts/validate-library.mjs
node scripts/validate-png-canvas.mjs
npm run test:canvas
npm run test:e2e
```

The library validator checks visible label hits, palette numbering, completion, aligned references, and published PNG assets. The PNG canvas validator colors two complex masks per drawing using gradients and page-wide guided brush strokes, checking that every other region anchor remains unchanged. Browser engine tests cover compound holes, exact PNG ink fidelity, undo/restored state, eraser protection, export, image-cache stability, and readable number badges at deep zoom. Review the drawings visually as well; geometry tests do not establish anatomical quality.
