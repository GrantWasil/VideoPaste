# VideoPaste for Firefox

The VideoPaste extension adds a compact, draggable **V** button to supported
Reddit video players and public video posts on X/Twitter. Clicking it asks the
bundled native helper to download the MP4 and place the file on the macOS
clipboard. The button shows **Loading…** followed by **Copied!** without opening
the VideoPaste app window.

## Install the public beta

Install `yt-dlp`, which is required for X/Twitter and Reddit post URLs, then
build and register the native app from the project root:

```sh
brew install yt-dlp
./scripts/build-app.sh
./scripts/install-videopaste-native-host.sh
```

Then:

1. Open `about:debugging` in Firefox.
2. Choose **This Firefox**.
3. Choose **Load Temporary Add-on**.
4. Select this directory's `manifest.json`.
5. Refresh any open Reddit, X, or Twitter tabs.

The temporary extension remains installed until Firefox restarts. Permanent,
signed distribution is on the project roadmap.

## Use it

1. Open a supported Reddit video or a public X/Twitter post containing video.
2. Click the orange **V** on the video. You can drag it to reposition it.
3. Wait for **Copied!**, then paste the MP4 with **⌘V**.

Both `x.com` and `twitter.com` status links are supported, including common
`www` and `mobile` variants. VideoPaste does not sign in to X or use Firefox
cookies, so private or protected posts, deleted or unavailable posts,
sign-in-restricted posts, and posts without supported video cannot be
downloaded. The button reports common failures as **Private post**,
**Unavailable**, or **No video**; hover it to see the detailed error.

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
