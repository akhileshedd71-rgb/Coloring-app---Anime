# Delivery checks

Checks are executed in the prepared Linux cloud environment with Node 24, JDK 21,
Android SDK 35 and real Chromium Canvas2D. This report distinguishes automated
browser checks, native packaging, emulator observations and physical-device work.

## Passed automated checks

- TypeScript and optimized Vite production build.
- **26 unit checks**: transform and zoom math; remaining counts; atomic save/restore
  of fills, gradient data, strokes, pressure and clipping; save snapshots; quota
  failure; thumbnail rollback; independent duplicates; deletion; schema migration;
  preferences; browser and Android export adapters, chooser cancellation and cache
  cleanup.
- **39 real-browser engine checks**: reverse-order hit testing, reference colors,
  fill boundaries, guided/unrestricted brushes, eraser preserving fills/lines,
  gradients, shading, pressure width, pencil, opacity, airbrush falloff,
  deterministic sparkles, transparent export, final exported pixels, repeated
  renders, two-finger pinch, no accidental paint while navigating, accurate fill
  after zoom, number-mode enforcement and eyedropper pixels; fixed detailed ink remains above paint and erasing.
- **11 full-app Playwright workflows**: library search/filters/favorites/theme,
  mobile fill/gradient/undo/redo, restart and restore, rename/copy/fresh attempt,
  confirmed deletion, numbered fills/counts/hints, mobile/landscape layouts,
  high-resolution PNG/JPEG downloads with actual colored pixels, saved swatches,
  named palettes, brush settings and restored strokes, transparent character exports, interrupted asset loading,
  storage-error retry and keeping the unsaved canvas open.
- Whole-library validation: all published pages have independently tappable label
  anchors, can reach complete state and match their rendered suggested reference.
  The final library contains 112 pages and 17,072 regions; see
  `library-checks.json` for individual results.

The mobile suite caught a 4-pixel overflow at 360px width; the category strip inset
was corrected and the affected workflows rerun. The mobile Share button received
an explicit accessible name, and thumbnail saves now preserve a stable Retry
control while storage is failing. Recovery clears the stale warning; its test
passed after the correction. A visible-label boundary issue on one
flower petal was caught by the whole-library validator; identity-mask decoding and
pixel-center anchors were corrected before validation passed.

## Atelier PNG update — 12 October 2026

- Eleven individually image-generated native **1024 × 1536** PNG drawings were
  visually reviewed, including faces, hands, clothing, hair and scene details.
  The new collection contains two Easy pages, one Medium portrait and eight Hard
  pages; the complete library is 22 Easy / 24 Medium / 66 Hard.
- **7,551 new fill regions**, with all 106 semantic material probes passing.
  Fine gaps found in eye, mouth, hairline and moon outlines were repaired in the
  derived ink while every original source PNG remained unchanged. Per-page
  reports and reviewed repair coordinates are under `docs/png-art/` and in the
  source manifest.
- **Zero pixel differences** between all eleven published PNG references and the
  actual app renderer at native resolution. Blank canvas rendering also matches
  each published line-art PNG exactly. An initial mask-versus-Canvas edge
  antialiasing discrepancy was corrected by publishing references with Canvas.
- **44 real PNG boundary checks** apply gradients and deliberately oversized
  guided brushes to complex compound masks and verify every neighboring region
  anchor remains unchanged. See `png-canvas-checks.json`. Recorded timings are
  cloud Chromium samples, not Android benchmarks.
- Four Python pipeline regressions cover closed holes and ink fidelity, detected
  open material boundaries, immutable geometry locks, and explicit retention of
  a tiny iris without turning surrounding noise into required coloring targets.
- Additional browser checks verify PNG preload/retry, protected fine ink,
  compound-hole clipping, PNG export, cache stability, dimension rejection and
  compact number labels at deep zoom. A real touchscreen sequence colors a
  region of at most 60 source pixels accurately at 20× zoom.
- All **404 original published artwork assets** remain byte-for-byte unchanged;
  the previous 101 page models retain every region ID, shape, palette and label.
  `png-legacy-compatibility.json` records the model comparison.
- PNG download archive contains eleven aligned pairs at native resolution, plus
  titles, difficulties and palette metadata. Original masters, color guides and
  prompts remain in `assets/source/`; none require a network connection in-app.

The updated APK uses the same app ID and signing certificate as version 1.0.0,
with an increased version code. No new native-device interaction pass is claimed;
physical Android checks below remain outstanding.

## Native packaging

- Gradle `assembleDebug` succeeds with the actual bundled application and artwork.
- APK signature verifies with Android `apksigner` (v1/v2).
- Package: `studio.hoshii.coloring`, version 1.1.0 (version code 2), minSdk 23, targetSdk 35.
- Native lint: zero errors; one benign generated Capacitor XML unused-resource
  warning. No app-source errors.
- APK assets checked against the full catalog: page JSON, thumbnails and references
  are bundled; no development-server URL is configured.
- SHA256 delivered alongside the signed debug APK.

## Android emulator result and limits

An Android 15 software emulator accepted installation and upgrade, started
MainActivity, and displayed the native splash on the 101-page build. Its operating
system then reported “Process system isn’t responding,” with system-service and
unrelated system-app failures during WebView initialization. No native canvas,
Android Back, or share-sheet interaction pass is claimed. The final APK includes
the subsequently verified accessibility and save-recovery fixes; its signature,
asset completeness and current web bundle were rechecked. The emulator was stopped.

See `ANDROID_CHECKS.md` and the native diagnostic screenshots for evidence. Browser
canvas/export checks and mocked native adapter tests do not replace a physical
Android share-sheet test.

## Physical-device release checks still required

- Stylus pressure and palm rejection on real hardware; synthetic pressure and
  touch sequences are covered, but manufacturer stylus behavior varies.
- Long drawing sessions on low-memory phones, thermal throttling, process kills,
  storage pressure and large galleries with many long strokes.
- Android share targets on several OEM devices, external recipient read grants,
  edge-to-edge system bars, gesture navigation, rotation and tablets.
- Upgrade retention with the owner's production signing key and increasing
  version codes; uninstalling or changing the signing key removes local app data.
- Final human art-direction review at actual device sizes and accessibility review
  with TalkBack. The canvas has instructions and labels, but detailed visual
  coloring is inherently a visual interaction.

This APK is suitable for installation and testing. It is not a Play Store release,
and no physical-device or commercial-release certification is implied.
