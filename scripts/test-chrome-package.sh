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
node -e '
  const assert = require("node:assert/strict");
  const fs = require("node:fs");
  const [sourcePath, packagedPath] = process.argv.slice(1);
  const sourceManifest = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const packagedManifest = JSON.parse(fs.readFileSync(packagedPath, "utf8"));

  assert.equal(
    Object.hasOwn(sourceManifest, "key"),
    true,
    "The unpacked development manifest must retain its stable-ID key."
  );
  assert.equal(
    Object.hasOwn(packagedManifest, "key"),
    false,
    "Chrome Web Store packages must omit the development-only key field."
  );

  delete sourceManifest.key;
  assert.deepEqual(packagedManifest, sourceManifest);
' \
  "$PROJECT_DIR/chrome-extension/manifest.json" \
  "$TEST_DIR/packaged-manifest.json"

echo "Chrome package reproducibility test passed."
