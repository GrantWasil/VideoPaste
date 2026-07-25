#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEST_DIR="$(mktemp -d "${TMPDIR:-/tmp}/videopaste-package-test.XXXXXX")"

cleanup() {
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

FIRST_PACKAGE="$TEST_DIR/first.zip"
SECOND_PACKAGE="$TEST_DIR/second.zip"
"$PROJECT_DIR/scripts/package-firefox-extension.sh" "$FIRST_PACKAGE" >/dev/null
"$PROJECT_DIR/scripts/package-firefox-extension.sh" "$SECOND_PACKAGE" >/dev/null

cmp "$FIRST_PACKAGE" "$SECOND_PACKAGE"

unzip -Z1 "$FIRST_PACKAGE" | LC_ALL=C sort > "$TEST_DIR/actual-files.txt"
{
  printf '%s\n' \
    "background/native-bridge.js" \
    "content/videopaste.css" \
    "content/videopaste.js" \
    "icons/icon-48.png" \
    "icons/icon-96.png" \
    "manifest.json"
} | LC_ALL=C sort > "$TEST_DIR/expected-files.txt"
cmp "$TEST_DIR/expected-files.txt" "$TEST_DIR/actual-files.txt"

unzip -p "$FIRST_PACKAGE" manifest.json > "$TEST_DIR/packaged-manifest.json"
cmp \
  "$PROJECT_DIR/firefox-extension/manifest.json" \
  "$TEST_DIR/packaged-manifest.json"

echo "Firefox package reproducibility test passed."
