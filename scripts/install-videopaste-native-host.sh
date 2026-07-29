#!/bin/zsh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_PATH="${1:-$PROJECT_DIR/dist/VideoPaste.app}"
HOST_PATH="$APP_PATH/Contents/MacOS/VideoPasteNativeHost"
HOST_NAME="com.grantwasil.videopaste"
CHROME_STORE_EXTENSION_ID="imfheadlgpfgpaiemfciehhbjkbhmjfl"
CHROME_DEVELOPMENT_EXTENSION_ID="okkpnnbniecihdbgfndcnknjeoajbhnf"
CHROME_EXTENSION_IDS=(
  "$CHROME_STORE_EXTENSION_ID"
  "$CHROME_DEVELOPMENT_EXTENSION_ID"
)
if (( $# > 1 )); then
  CHROME_EXTENSION_IDS=("${@:2}")
fi
APPLICATION_SUPPORT_DIR="${VIDEOPASTE_APPLICATION_SUPPORT_DIR:-$HOME/Library/Application Support}"
FIREFOX_MANIFEST_DIR="$APPLICATION_SUPPORT_DIR/Mozilla/NativeMessagingHosts"
FIREFOX_MANIFEST_PATH="$FIREFOX_MANIFEST_DIR/$HOST_NAME.json"
CHROME_PRODUCT_DIRS=(
  "Google/Chrome"
  "Google/Chrome Beta"
  "Google/Chrome Dev"
  "Google/Chrome Canary"
  "Google/Chrome for Testing"
  "Google/ChromeForTesting"
)
CHROME_MANIFEST_PATHS=()
TEMP_MANIFEST=""

cleanup() {
  if [[ -n "$TEMP_MANIFEST" ]]; then
    /bin/rm -f "$TEMP_MANIFEST"
  fi
}
trap cleanup EXIT

if [[ ! -x "$HOST_PATH" ]]; then
  echo "Native helper not found. Run ./scripts/build-app.sh first." >&2
  exit 1
fi
HOST_PATH="$(cd "$(dirname "$HOST_PATH")" && pwd)/$(basename "$HOST_PATH")"

for chrome_extension_id in "${CHROME_EXTENSION_IDS[@]}"; do
  if [[ ! "$chrome_extension_id" =~ ^[a-p]{32}$ ]]; then
    echo "Chrome extension ID must contain 32 letters from a through p." >&2
    exit 1
  fi
done

chrome_allowed_origins_json="["
chrome_allowed_origins_separator=""
for chrome_extension_id in "${CHROME_EXTENSION_IDS[@]}"; do
  chrome_allowed_origins_json+="$chrome_allowed_origins_separator\"chrome-extension://$chrome_extension_id/\""
  chrome_allowed_origins_separator=","
done
chrome_allowed_origins_json+="]"

create_manifest() {
  local manifest_path="$1"

  /usr/bin/plutil -create xml1 "$manifest_path"
  /usr/bin/plutil -insert name -string "$HOST_NAME" "$manifest_path"
  /usr/bin/plutil -insert description \
    -string "Downloads Reddit and X videos and copies them to the macOS clipboard." \
    "$manifest_path"
  /usr/bin/plutil -insert path -string "$HOST_PATH" "$manifest_path"
  /usr/bin/plutil -insert type -string "stdio" "$manifest_path"
}

/bin/mkdir -p "$FIREFOX_MANIFEST_DIR"
TEMP_MANIFEST="$(/usr/bin/mktemp "/tmp/videopaste-firefox-host.XXXXXX")"
create_manifest "$TEMP_MANIFEST"
/usr/bin/plutil -insert allowed_extensions \
  -json '["videopaste@grantwasil"]' \
  "$TEMP_MANIFEST"
/usr/bin/plutil -convert json "$TEMP_MANIFEST"
/bin/mv "$TEMP_MANIFEST" "$FIREFOX_MANIFEST_PATH"
TEMP_MANIFEST=""

for product_dir in "${CHROME_PRODUCT_DIRS[@]}"; do
  manifest_dir="$APPLICATION_SUPPORT_DIR/$product_dir/NativeMessagingHosts"
  manifest_path="$manifest_dir/$HOST_NAME.json"
  /bin/mkdir -p "$manifest_dir"

  TEMP_MANIFEST="$(/usr/bin/mktemp "/tmp/videopaste-chrome-host.XXXXXX")"
  create_manifest "$TEMP_MANIFEST"
  /usr/bin/plutil -insert allowed_origins \
    -json "$chrome_allowed_origins_json" \
    "$TEMP_MANIFEST"
  /usr/bin/plutil -convert json "$TEMP_MANIFEST"
  /bin/mv "$TEMP_MANIFEST" "$manifest_path"
  TEMP_MANIFEST=""
  CHROME_MANIFEST_PATHS+=("$manifest_path")
done

echo "$FIREFOX_MANIFEST_PATH"
printf '%s\n' "${CHROME_MANIFEST_PATHS[@]}"
