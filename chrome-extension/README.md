# VideoPaste for Chrome

The VideoPaste extension adds a compact, draggable **V** button to supported
Reddit video players and public video posts on X/Twitter. Clicking it asks the
local native helper to download the MP4 and place the file on the macOS
clipboard. The button shows **Loading…** followed by **Copied!** without opening
the VideoPaste app window.

## Install the public beta

Install `yt-dlp`, which is required for X/Twitter and Reddit post URLs, then
build the app and register its native helper for Firefox and Chrome from the
project root:

```sh
brew install yt-dlp
./scripts/build-app.sh
./scripts/install-videopaste-native-host.sh
```

Then:

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `chrome-extension` directory.
5. Refresh any open Reddit, X, or Twitter tabs.

The source build has the stable Chrome extension ID
`okkpnnbniecihdbgfndcnknjeoajbhnf`. The
[Chrome Web Store item](https://chromewebstore.google.com/detail/imfheadlgpfgpaiemfciehhbjkbhmjfl)
has ID `imfheadlgpfgpaiemfciehhbjkbhmjfl` and is pending review. The native-host
installer authorizes both exact IDs so Store and unpacked builds can use the
same local helper. The packaging script removes the development-only `key`
field from the upload ZIP so it cannot conflict with the Store-assigned item
identity.

X support is limited to public video posts that `yt-dlp` can reach without an
account or browser cookies.

## Package

From the project root:

```sh
./scripts/package-chrome-extension.sh
```

This writes `dist/videopaste-chrome.zip`. The native helper is packaged inside
`dist/VideoPaste.app` and registered separately by the install script. The ZIP
is deterministic, omits the development-only manifest key, and contains only
the explicitly allowlisted extension files.

## Test

```sh
npm install
npx playwright install chromium
npm test
```

Run the shared native-host protocol test after building the Mac app:

```sh
npm run test:native
```
