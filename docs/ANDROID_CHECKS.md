# Android delivery checks

The current debug APK is `delivery/hoshii-1.1.0-debug.apk`, built by
`node scripts/android-build.mjs`. It is 61,228,330 bytes and has SHA256
`26cbfc0b605e7503ae2681f5e6e98cce5dcdc38d5c6d1ef334965717562f0b3b`.
The adjacent `.sha256` file identifies the same delivered binary. The original
1.0.0 APK and checksum remain in `delivery/` to preserve existing download links
and the upgrade baseline.

| Check | Result |
| --- | --- |
| JDK and native compiler | Temurin JDK 21.0.12.1; Java and Kotlin compilation passed |
| Android build | Gradle 8.11.1 / Android Gradle Plugin 8.7.2; `assembleDebug` passed |
| Native lint | `:app:lintDebug` passed: 0 errors; 1 generated Capacitor `config.xml` unused-resource warning |
| APK identity | `studio.hoshii.coloring`, Hoshii, version name 1.1.0 / version code 2 |
| Android versions | Minimum API 23; compile and target API 35 |
| APK signature | Android `apksigner verify` passed; v1 and v2 signatures present |
| Signing continuity | Public signing certificate exactly matches 1.0.0; application ID unchanged and native version code increased |
| Offline content | 112 catalog pages with 17,072 regions, including all 11 new PNG illustrations, their line art, ink, references, and thumbnails |
| Asset integrity | APK ZIP CRCs passed; all 494 files in `dist/` (including all 460 `public/` files) match the APK byte for byte; catalog and page PNG dependencies resolve inside the APK |
| Native network configuration | No remote `server.url`; WebView uses the bundled app |
| Sensitive permissions | No storage, camera, location, microphone, advertising-ID, or account permissions |
| Share provider | Private cache only; non-exported provider; temporary read grants |
| Emulator install and activity launch | Historical 1.0.0 candidate only: Android 15 / API 35 software emulator installed and upgraded the app, accepted MainActivity launch, and displayed the branded native splash |
| Native canvas, Back, restore, and share sheet | Unverified: prior software emulator suffered operating-system ANRs before reliable WebView interaction; 1.1.0 has no new native runtime claim |
| Physical device validation | Pending; see the list below |

## Updating the testing build

Both delivered APKs have public signing-certificate SHA256
`030e48dacbd59cc14825ad60d06b3f093a0004c0c487d1373fb3ec915770962f`.
Matching package identity and signer, with version code increasing from 1 to 2,
make the new APK eligible for an in-place update. Use `adb install -r` or install
the new APK over the old one; do not uninstall the old app if you want to retain
local artwork. Data retention across a real Android update still needs a device
check. The private debug keystore remains outside the repository.

The preserved 1.0.0 APK is 11,203,449 bytes with SHA256
`f12a57100dc2772f49a7857c4cdda59db6809263964a5055e6f697f2273d0ff2`.

## Historical emulator limitation

This machine has no `/dev/kvm`, so the Android 15 x86_64 emulator ran without
hardware acceleration. Its first boot took about 16 minutes and the operating
system later displayed **“Process system isn't responding”**. Logs also showed
ANRs in the unrelated `com.google.android.as` system app, media-service deaths,
and long PackageManager lock waits. This is a concrete limitation of this test
environment; it is not evidence of normal phone performance.

The test reached the [native splash](screenshots/native-splash.png), Capacitor
plugin registration, and a local `https://localhost/` asset request. It did not
complete reliable canvas or share-sheet interaction. The [system ANR capture](screenshots/native-emulator-system-anr.png)
documents the blocker. Do not interpret the splash as a passed native coloring
test. Browser canvas, export, and storage checks are reported separately.

The installed 101-page 1.0.0 candidate preceded its final small accessibility,
mobile-toolbar, listener-cleanup, and save-error fixes. That final 1.0.0 APK and
the current 112-page 1.1.0 APK each independently passed binary, signature, and
asset checks; neither has a complete native runtime pass. The test emulator was
stopped after those bounded 1.0.0 checks and was not restarted for this update.

The Android wrapper and library are testable without private credentials.
Dependency transport used normal verified TLS; the SDK bootstrap and Gradle
wrapper used pinned checksums. The SDK and JDK are outside the source checkout.

`apksigner` may report that library metadata under `META-INF` is not covered by
the legacy v1 JAR signature. The full APK verifies with APK Signature Scheme v2;
these are standard Android library metadata entries, not app verification errors.

Before a store release, test on physical Android phones and tablets: sustained
painting performance and memory pressure, stylus pressure/palm rejection, OEM
share destinations actually receiving exported files, screen cutouts and gesture
navigation, rotation while painting, app process reclamation, and upgrades using
the production signing key. Desktop browser tests cannot establish these native
device behaviors.
