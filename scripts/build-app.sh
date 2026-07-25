#!/bin/zsh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="VideoPaste"
APP_PATH="$PROJECT_DIR/dist/$APP_NAME.app"
STAGING_DIR="$(/usr/bin/mktemp -d "/tmp/videopaste-build.XXXXXX")"
STAGED_APP_PATH="$STAGING_DIR/$APP_NAME.app"

cleanup() {
  /bin/rm -rf "$STAGING_DIR"
}
trap cleanup EXIT

cd "$PROJECT_DIR"
swift build -c release
BIN_DIR="$(swift build -c release --show-bin-path)"

/bin/mkdir -p "$STAGED_APP_PATH/Contents/MacOS" "$STAGED_APP_PATH/Contents/Resources"
/bin/cp "$BIN_DIR/VideoPaste" "$STAGED_APP_PATH/Contents/MacOS/VideoPaste"
/bin/cp \
  "$BIN_DIR/VideoPasteNativeHost" \
  "$STAGED_APP_PATH/Contents/MacOS/VideoPasteNativeHost"
/bin/cp "$PROJECT_DIR/App/Info.plist" "$STAGED_APP_PATH/Contents/Info.plist"
/bin/cp \
  "$PROJECT_DIR/App/VideoPasteIcon.icns" \
  "$STAGED_APP_PATH/Contents/Resources/VideoPasteIcon.icns"

/usr/bin/xattr -cr "$STAGED_APP_PATH"
/usr/bin/codesign --force --deep --sign - "$STAGED_APP_PATH"
/usr/bin/codesign --verify --deep --strict "$STAGED_APP_PATH"

/bin/rm -rf "$APP_PATH"
/bin/mkdir -p "$PROJECT_DIR/dist"
/usr/bin/ditto "$STAGED_APP_PATH" "$APP_PATH"

# File Provider can add harmless Finder metadata after the signed bundle lands
# in Documents. Remove it when possible; it is not part of the code signature.
/usr/bin/xattr -d com.apple.FinderInfo "$APP_PATH" 2>/dev/null || true
/usr/bin/xattr -d "com.apple.fileprovider.fpfs#P" "$APP_PATH" 2>/dev/null || true
/usr/bin/codesign --verify --deep "$APP_PATH"

echo "$APP_PATH"
