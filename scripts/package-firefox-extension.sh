#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXTENSION_DIR="$PROJECT_DIR/firefox-extension"
VERSION="$(node -p "require('$EXTENSION_DIR/manifest.json').version")"
OUTPUT_ARGUMENT="${1:-$PROJECT_DIR/dist/videopaste-firefox-$VERSION.zip}"
OUTPUT_DIRECTORY="$(dirname "$OUTPUT_ARGUMENT")"
OUTPUT_FILENAME="$(basename "$OUTPUT_ARGUMENT")"

if [[ "$OUTPUT_FILENAME" != *.zip ]]; then
  echo "Firefox package output must end in .zip: $OUTPUT_ARGUMENT" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIRECTORY"
OUTPUT_DIRECTORY="$(cd "$OUTPUT_DIRECTORY" && pwd)"
OUTPUT_PATH="$OUTPUT_DIRECTORY/$OUTPUT_FILENAME"
STAGING_DIR="$(mktemp -d "${TMPDIR:-/tmp}/videopaste-firefox.XXXXXX")"
FILE_LIST="$STAGING_DIR.files"

cleanup() {
  rm -rf "$STAGING_DIR"
  rm -f "$FILE_LIST"
}
trap cleanup EXIT

mkdir -p \
  "$STAGING_DIR/background" \
  "$STAGING_DIR/content" \
  "$STAGING_DIR/icons"
cp "$EXTENSION_DIR/manifest.json" "$STAGING_DIR/manifest.json"
cp "$EXTENSION_DIR/background/native-bridge.js" "$STAGING_DIR/background/"
cp "$EXTENSION_DIR/content/videopaste.css" "$STAGING_DIR/content/"
cp "$EXTENSION_DIR/content/videopaste.js" "$STAGING_DIR/content/"
cp "$EXTENSION_DIR/icons/icon-48.png" "$STAGING_DIR/icons/"
cp "$EXTENSION_DIR/icons/icon-96.png" "$STAGING_DIR/icons/"

# ZIP timestamps and extra attributes vary by machine unless normalized.
export TZ=UTC
find "$STAGING_DIR" -exec touch -t 198001010000 {} +
(
  cd "$STAGING_DIR"
  find . -type f -print | LC_ALL=C sort > "$FILE_LIST"
  rm -f "$OUTPUT_PATH"
  zip -q -X "$OUTPUT_PATH" -@ < "$FILE_LIST"
)

echo "$OUTPUT_PATH"
