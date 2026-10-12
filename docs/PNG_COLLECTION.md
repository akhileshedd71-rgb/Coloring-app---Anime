# Adding PNG coloring pages

The Atelier and Anime favorites collections use individually generated, native 1024 × 1536 PNG illustrations. These are genuine source-resolution PNGs; no upscaled pixels are presented as additional drawn detail. Each original line-art PNG is retained unchanged under `assets/source/`, alongside its generation prompt and visual review. The app displays the original fine ink through a transparent PNG overlay, with an independent mask partition underneath it for interactive coloring. Existing vector pages remain supported.

## Files for each illustration

- `assets/source/<id>.png`: immutable generated original.
- `assets/source/<id>-color-guide.png`: separately generated colored edit, used **only to suggest palette colors**, never to supply final geometry or the displayed reference.
- `assets/source/<id>.md`: prompts, provenance, anatomy/composition review and any refinements.
- `public/art/lineart/<id>.png`: full-resolution blank coloring PNG, including any explicitly recorded boundary repairs.
- `public/art/ink/<id>.png`: the same crisp grayscale ink with transparent paper; fixed decorative white islands are retained.
- `public/art/references/<id>.png`: aligned finished-color PNG built from the original fill masks and original ink.
- `public/art/pages/<id>.json`: stable fill IDs, compound closed paths, interior labels, palette, dimensions and raster asset URLs.
- `public/art/thumbs/<id>.webp`: lightweight browsing preview, at most 360 × 540.
- `docs/png-art/<id>.json` and `<id>-regions.png`: region metrics, source hashes, color assignments and a numbered review map.

## Generate and review

Generate one composition per image at full resolution. Original Atelier pages use original character designs; Anime favorites uses the explicitly requested named characters, with `anime favorites`, `fan art` and series-name tags. Specify the intended character, expressive faces, anatomically coherent hands, crisp clean black outlines, white interiors and closed major material boundaries. Fine hair marks, eyelashes, fabric creases and similar open marks can be decorative ink inside a larger region. Avoid gray shaded areas intended to be recolored. Make easy pages truly simple with bold lines and large shapes; medium pages need controlled detail density, not just fewer characters.

Inspect every source at native resolution before conversion. Review faces and eye alignment, digits and hand poses, clothing joins, framing, background tangencies and closed skin/hair/outfit boundaries. If a generation needs visual changes, refine it with image generation before accepting it. Preserve the accepted individual PNG, not a grid/contact sheet crop.

Generate a colored edit using that exact source as reference and the requested palette. A generated edit may drift slightly. The compiler samples it only as a palette hint inside each original region, takes robust Lab medians excluding dark guide ink, and chooses the nearest curated color. The finished reference is then rebuilt from the original masks and ink. This guarantees geometric alignment even when the guide changes a detail.

## Manifest and commands

Add a page to `assets/source/new-collection.json` (schema `version: 1`):

```json
{
  "id": "atelier-new-character",
  "title": "An Original Character",
  "category": "Anime portraits",
  "difficulty": "Medium",
  "tags": ["atelier", "png illustration", "portrait"],
  "description": "A short description of the original composition.",
  "source": "assets/source/atelier-new-character.png",
  "colorGuide": "assets/source/atelier-new-character-color-guide.png",
  "palette": ["#FFFFFF", "#F5D5BE", "#C5D7EF"],
  "seeds": [
    {"x": 0.04, "y": 0.04, "color": "#FFFFFF", "name": "Paper"},
    {"x": 0.50, "y": 0.38, "color": "#F5D5BE", "name": "Face"},
    {"x": 0.40, "y": 0.20, "color": "#C5D7EF", "name": "Hair"}
  ]
}
```

Coordinates are normalized from 0 to 1 relative to the original source. Place seeds in clearly distinct materials. Seeds override guide suggestions and act as useful leak probes: incompatible colors landing in the same connected region cause the release build to fail. Add seeds for important skin, eye, hair, clothing and background regions. Every reference still needs visual review; successful probes alone do not prove every artistic boundary is ideal.

```bash
python -m venv /tmp/hoshii-art
/tmp/hoshii-art/bin/pip install -r scripts/art-requirements.txt
/tmp/hoshii-art/bin/python scripts/build-png-art.py --only atelier-new-character
npm run art
node scripts/validate-library.mjs
/tmp/hoshii-art/bin/python tests/png_pipeline_test.py
```

The standard `npm run art` compiler reads the prepared PNG pages without retracing them and publishes reference PNGs using the same native Canvas `Path2D` rasterizer and original ink as the app. This final publication step eliminates subtle edge differences between Python's integer mask composites and browser antialiasing. Run `build-png-art.py` first after adding or changing an unpublished source, then always run `npm run art`. `--only` accepts multiple IDs. A `--draft` pass can write review assets while reporting seed conflicts; the main art compiler refuses unresolved conflicts.

After visual and interaction review, record the immutable source and geometry:

```bash
/tmp/hoshii-art/bin/python scripts/build-png-art.py --lock
npm run art
node scripts/validate-library.mjs
```

`new-collection.lock.json` prevents changing a published source or mask geometry accidentally. A composition with changed geometry needs a **new page ID**. Color-guide, title or palette corrections can retain region IDs. Keep older source files and IDs available so saved projects continue to restore. New collections can follow this manifest format and loader without changing the painting engine.

## Boundaries, details and masks

The compiler thresholds grayscale ink at 200/255 by default and extracts four-connected white components. It retains components of at least 28 native pixels at 1024 × 1536, scaled proportionally for other resolutions. Tiny isolated white specks below that threshold remain fixed details in the PNG ink layer and do not count toward completion. This avoids presenting inaccessible noise as required coloring targets. Per-page reports record exactly how many decorative pixels and islands were excluded. Larger eye highlights remain fillable and can use the white palette swatch.

Regions extend at most 2.2 native pixels beneath the original black outline, with each extension pixel assigned to exactly one nearest component. Compound contours retain holes and use `fillRule: "evenodd"`. Contour simplification error is limited to 0.22 native pixels. Masks are disjoint, which also lets the engine clip guided strokes without subtracting every other region. The original PNG ink always renders above fills, gradients, brushes and erasing, preserving its visual fidelity.

IDs are hashes of each original component's geometry and location, independent of color assignments, palette order, title or catalog position. Label points are placed at the maximum interior distance, not at a centroid that might fall outside a curved region. The app validates every label using the real Canvas `Path2D` hit test.

For a real broken boundary, add a reviewed `repairs` entry before publication:

```json
{"repairs": [{"points": [[0.42, 0.33], [0.424, 0.337]], "width": 2}]}
```

Repair points are normalized and widths are native pixels. Repairs appear as visible ink in the final line art and reference; the original source remains unchanged. Optional `closeGaps: 1` or `2` applies a small visible morphological closure and reports the added pixel count. Neither repair mechanism is applied silently by default. Prefer refining the generated source when the defect is more than a tiny boundary gap.

Optional `regionColors` and `regionNames` map stable region IDs to explicit palette colors and readable material names. Use the numbered report to identify a difficult-to-seed region. `keepSeedRegions: true` retains explicitly seeded important details down to eight native pixels while leaving the normal 28-pixel noise threshold unchanged elsewhere. Rooftop Reverie's 14-pixel iris uses this mechanism and is individually verified by the engine's hit test. `minimumRegionPixels` and `inkThreshold` are available for an unpublished source, but changing either can alter geometry and will be blocked after locking.

The first Atelier release includes small, visible boundary repairs on six pages: Cloud Ribbon's faint eye boundaries, The Starlight Reader's faded forehead hairline, City Daydream's tiny eye boundaries, Melody Lane's lower smile, Lantern Promise's moon/wire intersections, and Rainy Day Tea's faint iris/eyelid boundaries. Each repair follows the existing implied contour; coordinates and widths are in the manifest. Opposing color probes verify the resulting skin/eye, hair/forehead, face/mouth and sky/moon regions are separate. The other five original line drawings require no boundary repair. Original source PNGs remain unchanged.

## Verification and limits

`validate-library.mjs` preloads the original raster ink, checks every label is independently tappable, fills every region, verifies 100% completion and compares the result to the engine reference. For PNG pages it additionally compares the **published PNG reference** against the actual engine at full native resolution with zero pixel tolerance. Blank engine rendering must also match the published line-art PNG byte-for-byte at the RGBA pixel level.

The compiler grades up from the requested difficulty using visible region count and tiny-region density. Easy pages with more than 70 regions or 10 tiny regions become Medium; more than 180 regions or 45 tiny regions becomes Hard. Density counts are based on native-resolution areas, not image dimensions alone. Fine lines that do not enclose a region remain decorative details rather than artificial extra taps.

The reference deliberately uses solid curated region colors over the source ink. It does not retain the color guide's unaligned painterly gradients. Users can develop gradients and brush shading in Paint & Shade while the source outlines remain fixed. This distinction preserves reliable fills and honest alignment without discarding the detailed illustration.

## Download collections

The packager creates separate archives for the 31 original Atelier pages and the 20 Anime favorites pages, keeping each below GitHub’s 100 MiB file limit. Run `python scripts/package-png-art.py --collection anime-favorites` for just the new collection, `--collection atelier` for the original PNG collection, or omit the option to package both. Each archive has its own catalog and SHA256 checksum. PNG recompression is lossless and decoded pixels are checked before packaging.
