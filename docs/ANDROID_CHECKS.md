# Android delivery checks

The checked-in debug APK is built by `node scripts/android-build.mjs`. The final
APK is 11,203,449 bytes and has SHA256
`f12a57100dc2772f49a7857c4cdda59db6809263964a5055e6f697f2273d0ff2`.
The adjacent `.sha256` file identifies the same delivered binary.

| Check | Result |
| --- | --- |
| JDK and native compiler | Temurin JDK 21.0.12.1; Java and Kotlin compilation passed |
| Android build | Gradle 8.11.1 / Android Gradle Plugin 8.7.2; `assembleDebug` passed |
| Native lint | `:app:lintDebug` passed: 0 errors; 1 generated Capacitor `config.xml` unused-resource warning |
| APK identity | `studio.hoshii.coloring`, Hoshii, version name 1.0.0 / version code 1 |
| Android versions | Minimum API 23; compile and target API 35 |
| APK signature | Android `apksigner verify` passed; v1 and v2 signatures present |
| Offline content | 101 catalog pages and all 405 public assets are bundled, including fonts, thumbnails, references, and the illustrated bonus page |
| Asset integrity | APK ZIP CRCs passed; every catalog `file`, `thumbnail`, and `reference`, plus every file under `public/`, resolves to an APK entry |
| Native network configuration | No remote `server.url`; WebView uses the bundled app |
| Sensitive permissions | No storage, camera, location, microphone, advertising-ID, or account permissions |
| Share provider | Private cache only; non-exported provider; temporary read grants |
| Emulator install and activity launch | Android 15 / API 35 software emulator installed and upgraded the app, accepted MainActivity launch, and displayed the branded native splash |
| Native canvas, Back, restore, and share sheet | Unverified: software emulator suffered operating-system ANRs before reliable WebView interaction |
| Physical device validation | Pending; see the list below |

## Emulator limitation

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

The installed 101-page build preceded the final small accessibility, mobile
toolbar, listener-cleanup, and save-error fixes. The delivered APK was rebuilt
from that final source and independently passed the binary, signature, and asset
checks above; a complete runtime pass of the exact final binary remains pending.
The test emulator was stopped after these bounded checks.

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
