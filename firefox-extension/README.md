# VideoPaste for Firefox

The VideoPaste extension adds a compact, draggable **V** button to supported
Reddit video players and public video posts on X/Twitter. Clicking it asks the
bundled native helper to download the MP4 and place the file on the macOS
clipboard. The button shows **Loading…** followed by **Copied!** without opening
the VideoPaste app window.

## Install a signed release

Install `yt-dlp`, which is required for all Reddit and X/Twitter copying, then
build the app and register its native helper for Firefox and Chrome from the
project root:

```sh
brew install yt-dlp
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
5. Refresh any open Reddit, X, or Twitter tabs.

Development builds remain installed only until Firefox restarts.

## Use it

1. Open a supported Reddit video or a public X/Twitter post containing video.
2. Click the orange **V** on the video. You can drag it to reposition it.
3. Wait for **Copied!**, then paste the MP4 with **⌘V**.

On Reddit, VideoPaste copies videos hosted on Reddit. It copies a video the
page is already showing you, using the address the page contains. A video that
is an ad or is hosted somewhere else shows **No video**.

On X/Twitter, both `x.com` and `twitter.com` status links are supported,
including common `www` and `mobile` variants, and VideoPaste reaches public
posts only. Private or protected posts, deleted or unavailable posts, posts
shown only to signed-in accounts, and posts without supported video cannot be
downloaded.

VideoPaste never reads Firefox cookies or signs in to either site. When a copy
fails, the button names the failure, such as **Private post**,
**Unavailable**, or **No video**; hover it to see the detailed error.

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
