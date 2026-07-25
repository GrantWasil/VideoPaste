#!/bin/zsh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_PATH="${1:-$PROJECT_DIR/dist/VideoPaste.app}"
HOST_PATH="$APP_PATH/Contents/MacOS/VideoPasteNativeHost"
MANIFEST_DIR="$HOME/Library/Application Support/Mozilla/NativeMessagingHosts"
MANIFEST_PATH="$MANIFEST_DIR/com.grantwasil.videopaste.json"
TEMP_MANIFEST="$(/usr/bin/mktemp "/tmp/videopaste-host.XXXXXX")"

cleanup() {
  /bin/rm -f "$TEMP_MANIFEST"
}
trap cleanup EXIT

if [[ ! -x "$HOST_PATH" ]]; then
  echo "Native helper not found. Run ./scripts/build-app.sh first." >&2
  exit 1
fi

/bin/mkdir -p "$MANIFEST_DIR"
/usr/bin/plutil -create xml1 "$TEMP_MANIFEST"
/usr/bin/plutil -insert name -string "com.grantwasil.videopaste" "$TEMP_MANIFEST"
/usr/bin/plutil -insert description \
  -string "Downloads Reddit videos and copies them to the macOS clipboard." \
  "$TEMP_MANIFEST"
/usr/bin/plutil -insert path -string "$HOST_PATH" "$TEMP_MANIFEST"
/usr/bin/plutil -insert type -string "stdio" "$TEMP_MANIFEST"
/usr/bin/plutil -insert allowed_extensions \
  -json '["videopaste@grantwasil"]' \
  "$TEMP_MANIFEST"
/usr/bin/plutil -convert json "$TEMP_MANIFEST"
/bin/mv "$TEMP_MANIFEST" "$MANIFEST_PATH"

echo "$MANIFEST_PATH"
