#!/usr/bin/env bash
set -euo pipefail

# Installs a pinned, verified Android CLI into a caller-selected writable location.
# JDK 21, curl, unzip, and sha256sum are prerequisites. Run from the repo root.
sdk_root="${ANDROID_HOME:-/workspace/android-sdk}"
download_dir="${HOSHII_ANDROID_DOWNLOADS:-/tmp/hoshii-android-downloads}"
mkdir -p "$sdk_root/cmdline-tools" "$download_dir"
if [[ ! -x "$sdk_root/cmdline-tools/19.0/bin/sdkmanager" ]]; then
  archive="$download_dir/commandlinetools-linux-13114758_latest.zip"
  curl --fail --location --retry 2 'https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip' -o "$archive"
  # Download validated against official repository2-1.xml SHA1; pinned SHA256 below.
  printf '%s  %s\n' '7ec965280a073311c339e571cd5de778b9975026cfcbe79f2b1cdcb1e15317ee' "$archive" | sha256sum --check --status
  unpack_dir=$(mktemp -d "$download_dir/unpack.XXXXXXXX")
  unzip -q "$archive" -d "$unpack_dir"
  mv "$unpack_dir/cmdline-tools" "$sdk_root/cmdline-tools/19.0"
  rmdir "$unpack_dir"
fi

export ANDROID_HOME="$sdk_root"
export ANDROID_USER_HOME="${ANDROID_USER_HOME:-$download_dir/user}"
mkdir -p "$ANDROID_USER_HOME"
proxy_args=()
if [[ -n "${HTTPS_PROXY:-}" ]]; then
  proxy_host=$(node -e 'process.stdout.write(new URL(process.env.HTTPS_PROXY).hostname)')
  proxy_port=$(node -e 'const u=new URL(process.env.HTTPS_PROXY);process.stdout.write(u.port || (u.protocol === "https:" ? "443" : "80"))')
  proxy_args=(--proxy=http "--proxy_host=$proxy_host" "--proxy_port=$proxy_port")
fi

# The SDK license is displayed by sdkmanager; setup accepts it for this build.
set +o pipefail
yes | "$sdk_root/cmdline-tools/19.0/bin/sdkmanager" --sdk_root="$sdk_root" "${proxy_args[@]}" 'platforms;android-35' 'build-tools;35.0.0' 'platform-tools'
result=${PIPESTATUS[1]}
set -o pipefail
if [[ "$result" != 0 ]]; then exit "$result"; fi
printf 'Android SDK ready at %s. Set ANDROID_HOME to this path for builds.\n' "$sdk_root"
