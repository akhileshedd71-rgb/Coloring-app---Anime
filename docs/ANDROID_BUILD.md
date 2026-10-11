# Hoshii Android build

Hoshii is a bundled, offline Capacitor 7 application (`studio.hoshii.coloring`).
The Android shell serves the compiled React app and artwork from APK assets.
There is no development server URL, account, advertising SDK, analytics SDK, or
Google Services configuration in the app. Android's network permission supports
the standard WebView; coloring does not require a connection.

## Requirements

- Node.js 22 or newer, npm, and the checked-in npm lockfile.
- A complete JDK 21 including `javac` (a Java runtime alone is insufficient).
- Android SDK platform 35, build tools 35.0.0, and platform tools.
- Gradle 8.11.1 is downloaded by the checked-in wrapper. Its official SHA256 is
  pinned in `android/gradle/wrapper/gradle-wrapper.properties`.
- About 5 GB of available storage for the build toolchain and caches.

Android Studio can install the SDK and open `android/`. For a Linux x86_64 cloud
machine with writable `/workspace`, the provided helpers install verified tools:

```sh
bash scripts/android-jdk.sh
bash scripts/android-setup.sh
npm ci
npm run android:build
```

The optional JDK helper installs Temurin 21.0.12.1 from Adoptium's official
GitHub release and verifies the publisher SHA256. The SDK helper pins Android
command-line tools 19.0, verifies SHA256, and uses Google's SDK manager to install
platform packages. It accepts the SDK license needed for this development build.
The SDK tools archive was also checked against Google's published repository
metadata SHA1 during initial setup. No checksum or TLS verification is disabled.

For another workstation, set `JAVA_HOME` to JDK 21 and `ANDROID_HOME` to your SDK.
`HOSHII_JDK_HOME` and `HOSHII_ANDROID_DOWNLOADS` customize bootstrap destinations.
The SDK bootstrap is Linux specific; normal Android Studio builds support macOS
and Windows. Use `node scripts/android-build.mjs` directly if npm scripts have
not been installed yet.

The build helper runs the production web build, Capacitor sync, and
`assembleDebug --no-daemon --max-workers=2`, then writes:

```text
delivery/hoshii-1.0.0-debug.apk
delivery/hoshii-1.0.0-debug.apk.sha256
```

Generated web assets and local SDK configuration are ignored by Git. After web
or artwork changes, rerun the complete build helper so the APK includes them.
The APK is self-contained and supports Android 6.0+ (API 23); API 35 is the build
and target level. Use a current Android System WebView for the best canvas and
touch behavior.

## Managed cloud proxy and trust

The helper uses existing `HTTP_PROXY` / `HTTPS_PROXY` host and port settings for
Java downloads. On the managed Debian cloud machine, Java uses the existing
system CA trust store, including the session proxy CA. It preserves explicitly
configured Java trust stores. It does not copy authentication values into the
project. Dependencies require Google, Maven Central, Gradle distributions, and
the configured npm registry; the JDK bootstrap also uses GitHub release assets.

Cloud caches live outside the checkout at `/workspace/android-sdk`,
`/workspace/jdk-21`, `/workspace/.gradle`, and `/workspace/.android`.

## Install and inspect

```sh
adb install -r delivery/hoshii-1.0.0-debug.apk
adb shell am start -n studio.hoshii.coloring/.MainActivity
"$ANDROID_HOME/build-tools/35.0.0/apksigner" verify --verbose delivery/hoshii-1.0.0-debug.apk
"$ANDROID_HOME/build-tools/35.0.0/aapt" dump badging delivery/hoshii-1.0.0-debug.apk
```

You can also copy the APK to a phone, open it, and allow installation from that
file app. This is a signed **debug/testing APK**, not a Play Store release.
Keep the same app ID and signing key for upgrades that retain local art. A
different signing key requires uninstalling the previous build and would remove
its local data. A production release must use the owner's securely retained
release key; never commit a private signing key. Version codes must increase
for future published updates.

## Native integration

- File exports are written to the app's private cache and shared through a
  non-exported `FileProvider` with temporary URI read grants. The provider has
  no broad external-storage path and requests no storage permission.
- Capacitor App supplies Android back/background events to the web app.
- `adjustMarginsForEdgeToEdge: 'auto'` accounts for Android 15 system bars.
- The activity handles rotation, tablet resizing, and theme changes without
  reloading the WebView. Native splash and launcher artwork are original Hoshii
  assets; regenerate raster launcher sizes with `node scripts/android-icons.mjs`.
- Android user backups follow the device's operating-system backup settings.
  Editable coloring data stays in app storage and is separate from exported PNG
  or JPEG images.

## Device validation

The delivery check report records the exact automated and emulator checks run.
Before a store release, validate on physical low-memory phones and tablets,
including stylus pressure and palm rejection, OEM share targets, phone rotation,
gesture navigation, Android's process reclamation, and upgrade retention using
the production signing key. Browser tests do not establish those behaviors.
