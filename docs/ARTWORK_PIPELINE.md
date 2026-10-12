# Original artwork pipeline

The 31-page original Atelier collection and 20-page Anime favorites collection
preserve individually generated PNG line art. Anime favorites features named
franchise characters; its prompt and provenance records identify each as fan art. Follow the [PNG collection pipeline](PNG_COLLECTION.md) to add future
reference-inspired illustrations, retain original PNG masters, produce aligned
references, and protect saved projects with stable region IDs. The sections
below describe the earlier 101 vector pages, which remain unchanged.

The standard library is built from authored closed Bezier geometry, using a shared
1000 × 1300 coordinate space. It includes 10 pages in each of the ten categories.
The original character designs borrow broad qualities from the supplied visual
references—expressive eyes, flowing hair, floral garments, festival scenes and
streetwear—without copying an existing character or tracing those references.

## Source and outputs

- `scripts/art/portraits.mjs`: anime portraits, fantasy and streetwear.
- `scripts/art/scenes.mjs`: manga/duos, romance/friendship, festivals and cozy scenes.
- `scripts/art/kawaii.mjs`: comic heroes, chibi characters and kawaii subjects.
- `scripts/art/helpers.mjs`: shared geometric helpers only; each generator chooses
  its own face/hair/outfit/pose/scene geometry and color story.
- `scripts/build-art.mjs`: the deterministic compiler.

Each page publishes a JSON region model, line-art SVG, finished-color SVG and
360 × 468 WebP preview. All four derive from the **same geometry**, so zooming,
references, fills and decorative shading remain aligned. The high-resolution
3000 × 3900 export is rendered from vectors and saved strokes at export time.

The finished references are examples, not baked-in coloring. Users choose their
own shades. Shading is a separate optional aligned multiply layer. Eye highlights,
garment folds, decorative pieces and individual hair sections have stable regions.

## Compile and validate

```sh
npm run art
node scripts/validate-library.mjs
```

The compiler checks unique page/region IDs, closed finite paths, valid hex colors,
and distinct composition geometry hashes. It renders an identity mask with the
same Canvas2D path order as the app. Fully hidden shapes are removed from the
fillable model; they never inflate completion counts. Region numbers are placed
at the maximum visible interior distance, rather than at a centroid that may lie
outside a curved shape. Pixel-center anchors are checked through actual app hit
testing after compilation.

`docs/art-validation.json` records source/visible counts, occluded shapes removed,
smallest areas, tiny regions and unique geometry hashes. `docs/library-checks.json`
records the real-browser result for every page: each region is independently
tappable, every page can reach 100%, and coloring every region with its suggested
shade matches the engine’s finished reference pixel for pixel.

Difficulty includes actual visible region count and small-region density. The
easy library uses larger, bolder kawaii/chibi regions. Detailed embroidery, petals,
hair, multi-character scenes and background detail increase the difficulty.
Small regions remain reachable through 20× zoom and number-mode hints. Label
overlap at fit scale is normal on hard pages; zoom reveals individual labels.

## Visual review

Every source drawing was rendered and reviewed in category contact sheets for
face consistency, eyes, hair, hands, clothing, silhouettes and composition.
Detailed examples and line-art pages were inspected at full size. Review corrected
background lines crossing foreground figures, floating scarf details, hair lines
over garments, scene framing and occluded decoration. Automated visibility checks
then verified the final published region model.

This is a coherent stylized vector collection, with shared character anatomy and
reusable decorative vocabulary. Different pages change characters, hair geometry,
outfits, props and scene layouts; simple recolors are not counted as new pages.
The hand-authored collection is less painterly than the supplied images. Fine art
direction and physical-device viewing remain useful before a commercial release.

## Add or revise a page

1. Create an original illustration as closed paths with clear regions. Follow
   `src/types.ts` and `docs/ART_CONTRACT.md`. Use a unique stable `id` and unique
   region IDs. Region names, difficulty, tags and description should describe the
   actual content. Set `transparent` only for standalone compositions.
2. Use a coordinated palette and assign each region a color. The compiler remaps
   number indices to the final used palette. Decorative open strokes belong in
   `lines`; aligned translucent shadows belong in `shades`; solid unpaintable ink
   may be supplied through the optional `ink` layer.
3. Export `generatePages()` from the module and import it in `build-art.mjs`.
4. Compile, run the library validator, inspect the reference and line art, and
   exercise the page in free and number modes. Test tiny regions at deep zoom.
5. Rebuild/sync the APK. Commit source and published assets together.

Never reuse a region ID for a different shape, replace the geometry of an already
published ID, or delete an artwork referenced by saved projects. New compositions
and substantial corrections receive new page IDs. The app’s library and project
stores remain separate so new artwork does not reset existing coloring.

## Generated collectible edition

**The Lunar Botanist** is an additional detailed original illustration generated
for this project. The unchanged source is in `assets/source/moon-botanist.png`.
Its precise prompt and conversion provenance are in `assets/source/README.md`.
The supplied user reference images were not traced or redistributed.

`scripts/trace-illustration.py` smooths texture, separates a curated CIELAB palette,
uses VTracer to fit closed Bézier cutouts, flattens transforms, and preserves fine
eyelash, hair, hand and floral ink as a nonfillable overlay. Tiny nearby ornaments
of the same color are linked into fill groups; major skin, hair and garment areas
remain independent. Grouping prevents hundreds of tiny ornamental fragments from
becoming separate completion targets. The published reference is rendered from
the editable vector model, not the richer source PNG.

```sh
python3 -m venv /workspace/.venv-art
/workspace/.venv-art/bin/pip install -r scripts/art-requirements.txt
/workspace/.venv-art/bin/python scripts/trace-illustration.py
npm run art
node scripts/validate-library.mjs
```

The generated JSON is checked in, so Python is optional for ordinary app builds.
Ink stays above painting and erasing; separate shadow-color regions allow custom
lighting choices. Use the generated line-art and finished-reference SVGs for
review. Palette simplification changes some subtle source hues; eyes and major
focal accents were restored during cleanup.

Five standalone chibi/kawaii pages omit full-page backgrounds and support
transparent PNG export. Scene pages keep their backgrounds.
