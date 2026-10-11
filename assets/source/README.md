# Original generated artwork source

## The Atelier PNG collection

The eleven `atelier-*.png` masters are original, individually generated 1024 × 1536
line drawings. Each adjacent Markdown file records the exact generation prompt,
visual review and any image-generation refinements. Separately generated
`*-color-guide.png` edits supply palette hints; they are retained unchanged but
do not define the interactive geometry or final published references.

`new-collection.json` is the expandable manifest. Its lock file protects published
source and region geometry. The app preserves the fine original PNG ink while
closed masks underneath support fills, gradients and clipped brushes. Published
lineart and aligned reference PNGs live in `public/art/`; source masters and
guides are not bundled in the APK. See [the PNG pipeline](../../docs/PNG_COLLECTION.md)
for commands, quality checks, boundary repairs and stable save compatibility.

## The original Lunar Botanist collectible

`moon-botanist.png` was generated for Hoshii with the image-generation tool, then
converted into an editable vector composition. It is not a supplied reference
image or an existing anime character. The source PNG is retained unchanged for
provenance and future cleanup; it is not bundled in the APK.

The generation brief requested an original adult lunar botanist in a 3:4
composition, expressive lavender eyes, flowing silver-lavender hair, a floral
kimono-inspired cape, cosmos flowers, butterflies and a crescent ornament.
The brief specified anatomically coherent hands, crisp closed ink contours,
separate cel-shadow and highlight planes, a warm ivory background, no text,
and no resemblance to an existing franchise character.

The generated output was visually reviewed for face, hands, hair, clothing and
composition. Its coloring-page derivative uses a simplified coordinated palette,
closed cutout regions, linked decorative accents and fixed fine ink. The app’s
finished reference is generated from that same vector derivative so it aligns
with every fill region. It is intentionally not the unchanged source PNG.

Regeneration and conversion: `scripts/trace-illustration.py`,
`scripts/art-requirements.txt`, and `docs/ARTWORK_PIPELINE.md`.
