# VideoPaste for Firefox

The VideoPaste extension adds a compact, draggable **V** button to Reddit video
players. Clicking it asks the bundled native helper to download the MP4 and
place the file on the macOS clipboard. The button shows **Loading…** followed by
**Copied!** without opening the VideoPaste app window.

## Install the public beta

Build and register the native app from the project root:

```sh
./scripts/build-app.sh
./scripts/install-videopaste-native-host.sh
```

Then:

1. Open `about:debugging` in Firefox.
2. Choose **This Firefox**.
3. Choose **Load Temporary Add-on**.
4. Select this directory's `manifest.json`.
5. Refresh any open Reddit tabs.

The temporary extension remains installed until Firefox restarts. Permanent,
signed distribution is on the project roadmap.

## Package

From the project root:

```sh
./scripts/package-firefox-extension.sh
```

This writes `dist/videopaste-firefox.zip`. The native helper is packaged inside
`dist/VideoPaste.app` and registered separately by the install script.

## Test

```sh
npm install
npm test
```

Run the native-host protocol test after building the Mac app:

```sh
npm run test:native
```
