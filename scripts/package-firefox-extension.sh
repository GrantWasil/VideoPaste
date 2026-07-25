#!/bin/zsh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXTENSION_DIR="$PROJECT_DIR/firefox-extension"
OUTPUT_PATH="$PROJECT_DIR/dist/videopaste-firefox.zip"
STAGING_DIR="$(/usr/bin/mktemp -d "/tmp/videopaste-firefox.XXXXXX")"

cleanup() {
  /bin/rm -rf "$STAGING_DIR"
}
trap cleanup EXIT

/bin/mkdir -p "$PROJECT_DIR/dist"
/bin/cp -R "$EXTENSION_DIR" "$STAGING_DIR/extension"
/usr/bin/xattr -cr "$STAGING_DIR/extension"

cd "$STAGING_DIR/extension"
/usr/bin/zip -q -r "$OUTPUT_PATH" \
  manifest.json \
  README.md \
  background \
  content \
  icons

echo "$OUTPUT_PATH"
