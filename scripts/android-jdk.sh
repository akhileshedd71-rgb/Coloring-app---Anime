#!/usr/bin/env bash
set -euo pipefail
# Optional, pinned Linux x86_64 JDK bootstrap when the machine only has a JRE.
jdk_dir="${HOSHII_JDK_HOME:-/workspace/jdk-21}"
download_dir="${HOSHII_ANDROID_DOWNLOADS:-/tmp/hoshii-android-downloads}"
if [[ -x "$jdk_dir/bin/javac" ]]; then
  printf 'JDK already available at %s\n' "$jdk_dir"
  exit 0
fi
mkdir -p "$download_dir"
archive="$download_dir/jdk21.tar.gz"
curl --fail --location --retry 2 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jdk_x64_linux_hotspot_21.0.12.1_1.tar.gz' -o "$archive"
printf '%s  %s\n' 'ce79869e1307ed8ee1e2baa86a412b1eb5b75d10a01006d788a6f968bcfaee94' "$archive" | sha256sum --check --status
unpack_dir=$(mktemp -d "$download_dir/jdk-unpack.XXXXXXXX")
tar -xzf "$archive" --strip-components=1 -C "$unpack_dir"
mv "$unpack_dir" "$jdk_dir"
printf 'Verified Temurin JDK ready. Set JAVA_HOME=%s for builds.\n' "$jdk_dir"
