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
- **26 real-browser engine checks**: reverse-order hit testing, reference colors,
  fill boundaries, guided/unrestricted brushes, eraser preserving fills/lines,
  gradients, shading, pressure width, pencil, opacity, airbrush falloff,
  deterministic sparkles, transparent export, final exported pixels, repeated
  renders, two-finger pinch, no accidental paint while navigating, accurate fill
  after zoom, number-mode enforcement and eyedropper pixels; fixed detailed ink remains above paint and erasing.
- **8 full-app Playwright workflows**: library search/filters/favorites/theme,
  mobile fill/gradient/undo/redo, restart and restore, rename/copy/fresh attempt,
  confirmed deletion, numbered fills/counts/hints, mobile/landscape layouts,
  high-resolution PNG/JPEG downloads with actual colored pixels, saved swatches,
  named palettes, brush settings and restored strokes, transparent character exports, interrupted asset loading,
  storage-error retry and keeping the unsaved canvas open.
- Whole-library validation: all published pages have independently tappable label
  anchors, can reach complete state and match their rendered suggested reference.
  The final library contains 101 pages and 9,521 regions; see
  `library-checks.json` for individual results.

The mobile suite caught a 4-pixel overflow at 360px width; the category strip inset
was corrected and the affected workflows rerun. The mobile Share button received
an explicit accessible name, and thumbnail saves now preserve a stable Retry
control while storage is failing. Recovery clears the stale warning; its test
passed after the correction. A visible-label boundary issue on one
flower petal was caught by the whole-library validator; identity-mask decoding and
pixel-center anchors were corrected before validation passed.

## Native packaging

- Gradle `assembleDebug` succeeds with the actual bundled application and artwork.
- APK signature verifies with Android `apksigner` (v1/v2).
- Package: `studio.hoshii.coloring`, version 1.0.0, minSdk 23, targetSdk 35.
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
