#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEST_DIR="$(mktemp -d "${TMPDIR:-/tmp}/videopaste-chrome-package-test.XXXXXX")"

cleanup() {
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

FIRST_PACKAGE="$TEST_DIR/first.zip"
SECOND_PACKAGE="$TEST_DIR/second.zip"
"$PROJECT_DIR/scripts/package-chrome-extension.sh" "$FIRST_PACKAGE" >/dev/null
"$PROJECT_DIR/scripts/package-chrome-extension.sh" "$SECOND_PACKAGE" >/dev/null

cmp "$FIRST_PACKAGE" "$SECOND_PACKAGE"

unzip -Z1 "$FIRST_PACKAGE" | LC_ALL=C sort > "$TEST_DIR/actual-files.txt"
{
  printf '%s\n' \
    "README.md" \
    "background/native-bridge.js" \
    "content/runtime.js" \
    "content/videopaste.css" \
    "content/videopaste.js" \
    "icons/icon-16.png" \
    "icons/icon-32.png" \
    "icons/icon-48.png" \
    "icons/icon-128.png" \
    "manifest.json"
} | LC_ALL=C sort > "$TEST_DIR/expected-files.txt"
cmp "$TEST_DIR/expected-files.txt" "$TEST_DIR/actual-files.txt"

unzip -p "$FIRST_PACKAGE" manifest.json > "$TEST_DIR/packaged-manifest.json"
cmp \
  "$PROJECT_DIR/chrome-extension/manifest.json" \
  "$TEST_DIR/packaged-manifest.json"

echo "Chrome package reproducibility test passed."
