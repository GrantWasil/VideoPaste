<p align="center">
  <img src="App/VideoPasteIcon.png" width="144" alt="VideoPaste app icon">
</p>

<h1 align="center">VideoPaste</h1>

<p align="center">
  <strong>Copy videos from Reddit and X. Paste them anywhere.</strong>
</p>

<p align="center">
  A lightweight, local-first macOS app and Firefox extension that turns a
  supported Reddit or public X/Twitter video post into an MP4 on your
  clipboard.
</p>

> [!NOTE]
> VideoPaste for macOS is currently a source-distributed public beta. Firefox
> releases that include a Mozilla-signed XPI install persistently; development
> builds loaded through `about:debugging` remain temporary.

<img width="800" height="789" alt="CleanShot 2026-07-24 at 20 44 02" src="https://github.com/user-attachments/assets/4de203eb-8f66-40ca-a5c8-3a6229e09276" />


## Why VideoPaste?

Sharing a post link is not always the same as sharing its video, and direct
Reddit media links can expire. VideoPaste downloads the requested video locally
and copies the actual MP4 file, ready to paste into Signal, Messages, Slack,
Discord, or another app.

## Features

- **One-click Firefox button** — hover the compact **V** on a supported Reddit
  video or public X/Twitter video post and click to download and copy it.
- **Draggable overlay** — move the button anywhere within the video so it never
  blocks something you want to see.
- **Silent native helper** — the extension shows **Loading…** and **Copied!**
  without opening the desktop app.
- **Menu-bar mode** — download a supported link already on your clipboard.
- **Recent downloads** — quickly copy or reopen the five latest videos.
- **Local and private** — no accounts, analytics, telemetry, or VideoPaste
  servers.

Downloaded videos remain in `~/Downloads/VideoPaste`.

## Requirements

- macOS 13 Ventura or newer
- Firefox 140 or newer for the browser extension
- Swift 6.2 or newer when building from source
- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) for Reddit post URLs and
  X/Twitter posts

Direct `packaged-media.redd.it` MP4 links work without `yt-dlp`.

## Install a Firefox release

The Firefox extension still requires the local VideoPaste app and native
helper. Build and register those components:

1. Install the post downloader. It is required for X/Twitter posts and ordinary
   Reddit post URLs:

   ```sh
   brew install yt-dlp
   ```

2. Clone the tag matching the release, then build and register VideoPaste:

   ```sh
   git clone --branch v<version> https://github.com/GrantWasil/VideoPaste.git
   cd VideoPaste
   ./scripts/build-app.sh
   ./scripts/install-videopaste-native-host.sh
   open "dist/VideoPaste.app"
   ```

3. Open the matching [VideoPaste release](https://github.com/GrantWasil/VideoPaste/releases),
   download `videopaste-firefox-<version>.xpi`, and optionally verify it with
   `SHA256SUMS`.
4. In Firefox, open `about:addons`, choose the gear menu, choose
   **Install Add-on From File…**, and select the XPI.
5. Restart Firefox once and confirm VideoPaste remains listed in
   `about:addons`.

The self-distributed extension does not update automatically. Repeat the XPI
installation with each newer release.

## Install a development build

Build and register the native app as above, then:

1. Open `about:debugging` in Firefox.
2. Choose **This Firefox**.
3. Choose **Load Temporary Add-on**.
4. Select `firefox-extension/manifest.json`.
5. Refresh any open Reddit, X, or Twitter tabs.

Development builds remain installed only until Firefox restarts. Reload the
same manifest to continue testing; use a release XPI for persistent use.

## Use it

### From Firefox

1. Open a supported Reddit video or a public X/Twitter post containing video.
2. Click the orange **V** on the video. You can drag it somewhere else first.
3. Wait for **Copied!**
4. Switch to your chat and press **⌘V**.

### From the Mac app

1. Copy a supported Reddit video/post link or an X/Twitter video-post link.
2. Open VideoPaste from the Dock or menu bar.
3. Choose **Download Link from Clipboard**.
4. Paste the resulting MP4 with **⌘V**.

VideoPaste accepts X/Twitter status links on `x.com` and `twitter.com`,
including common `www` and `mobile` variants. X support is limited to public
posts containing supported video that `yt-dlp` can reach without an account or
browser cookies. Private or protected posts, deleted or unavailable posts,
sign-in-restricted posts, and posts without video cannot be downloaded.

## How it works

| Component | Responsibility |
| --- | --- |
| Firefox extension | Finds supported Reddit and X/Twitter videos and provides the draggable copy button |
| Native messaging host | Downloads and copies the MP4 without showing an app window |
| macOS app | Provides the standalone UI, menu-bar mode, and recent downloads |

The native host accepts supported URLs on Reddit, `redd.it`, X, and Twitter.
See [PRIVACY.md](PRIVACY.md) for the complete data-handling description.

## Development

```sh
swift test
swift format lint --recursive --strict Sources Tests Package.swift

cd firefox-extension
npm install
npm test
```

Build and package artifacts:

```sh
./scripts/build-app.sh
./scripts/package-firefox-extension.sh
```

Firefox signing and release-owner setup is documented in
[`docs/firefox-release.md`](docs/firefox-release.md).

The optional live Swift test reads a current video URL from
`REDDIT_SAMPLE_URL`.

## Contributing

Bug reports and pull requests are welcome. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

## License

VideoPaste is available under the [MIT License](LICENSE).

## Disclaimer

VideoPaste is an independent, unofficial project. It is not affiliated with,
endorsed by, or sponsored by Reddit, X Corp., Signal, Mozilla, or Apple. Reddit,
X, Twitter, and other product names are trademarks of their respective owners.
