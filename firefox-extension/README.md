# VideoPaste for Firefox

The VideoPaste extension adds a compact, draggable **V** button to Reddit video
players. Clicking it asks the bundled native helper to download the MP4 and
place the file on the macOS clipboard. The button shows **Loading…** followed by
**Copied!** without opening the VideoPaste app window.

## Install a signed release

Build and register the native app from the project root:

```sh
./scripts/build-app.sh
./scripts/install-videopaste-native-host.sh
```

Then download `videopaste-firefox-<version>.xpi` and `SHA256SUMS` from the
matching [VideoPaste release](https://github.com/GrantWasil/VideoPaste/releases).
Optionally verify the checksum, then:

1. Open `about:addons` in Firefox.
2. Open the gear menu and choose **Install Add-on From File…**
3. Select the downloaded XPI.
4. Restart Firefox and confirm VideoPaste remains installed.

Release XPIs are Mozilla-signed and persist across browser restarts. This
self-distributed extension is upgraded manually by installing the newer
release XPI.

## Install a development build

After building and registering the native app:

1. Open `about:debugging` in Firefox.
2. Choose **This Firefox**.
3. Choose **Load Temporary Add-on**.
4. Select this directory's `manifest.json`.
5. Refresh any open Reddit tabs.

Development builds remain installed only until Firefox restarts.

## Package

From the project root:

```sh
./scripts/package-firefox-extension.sh
```

This writes `dist/videopaste-firefox-<version>.zip`. The package is
deterministic and contains only extension runtime files. The native helper is
packaged inside `dist/VideoPaste.app` and registered separately by the install
script.

Mozilla signing and owner release steps are documented in
[`../docs/firefox-release.md`](../docs/firefox-release.md).

## Test

```sh
npm install
npm test
```

Run the native-host protocol test after building the Mac app:

```sh
npm run test:native
```
