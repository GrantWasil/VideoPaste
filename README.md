<p align="center">
  <img src="App/VideoPasteIcon.png" width="144" alt="VideoPaste app icon">
</p>

<h1 align="center">VideoPaste</h1>

<p align="center">
  <strong>Copy Reddit videos. Paste them anywhere.</strong>
</p>

<p align="center">
  A lightweight, local-first macOS app and Firefox extension that turns a
  Reddit video link into an MP4 on your clipboard.
</p>

> [!NOTE]
> VideoPaste is currently a source-distributed public beta. Signed Mac and
> Firefox releases are on the roadmap.

<img width="800" height="789" alt="CleanShot 2026-07-24 at 20 44 02" src="https://github.com/user-attachments/assets/4de203eb-8f66-40ca-a5c8-3a6229e09276" />


## Why VideoPaste?

Direct Reddit media links can expire or return an error when somebody else
opens them. VideoPaste downloads the video locally and copies the actual MP4
file, ready to paste into Signal, Messages, Slack, Discord, or another app.

## Features

- **One-click Firefox button** — hover the compact **V** on a Reddit video and
  click to download and copy it.
- **Draggable overlay** — move the button anywhere within the video so it never
  blocks something you want to see.
- **Silent native helper** — the extension shows **Loading…** and **Copied!**
  without opening the desktop app.
- **Menu-bar mode** — download a Reddit link already on your clipboard.
- **Recent downloads** — quickly copy or reopen the five latest videos.
- **Local and private** — no accounts, analytics, telemetry, or VideoPaste
  servers.

Downloaded videos remain in `~/Downloads/VideoPaste`.

## Requirements

- macOS 13 Ventura or newer
- Firefox 109 or newer for the browser extension
- Swift 6.2 or newer when building from source
- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) for ordinary Reddit post URLs

Direct `packaged-media.redd.it` MP4 links work without `yt-dlp`.

## Install from source

1. Install the optional but recommended Reddit post downloader:

   ```sh
   brew install yt-dlp
   ```

2. Clone and build VideoPaste:

   ```sh
   git clone https://github.com/GrantWasil/VideoPaste.git
   cd VideoPaste
   ./scripts/build-app.sh
   ./scripts/install-videopaste-native-host.sh
   open "dist/VideoPaste.app"
   ```

3. Install the temporary Firefox extension:

   - Open `about:debugging` in Firefox.
   - Choose **This Firefox**.
   - Choose **Load Temporary Add-on**.
   - Select `firefox-extension/manifest.json`.
   - Refresh any open Reddit tabs.

Temporary Firefox extensions remain installed until Firefox restarts. Reload
the same manifest to continue using the beta.

## Use it

### From Firefox

1. Open a Reddit video.
2. Click the orange **V** on the video. You can drag it somewhere else first.
3. Wait for **Copied!**
4. Switch to your chat and press **⌘V**.

### From the Mac app

1. Copy a Reddit video or post link.
2. Open VideoPaste from the Dock or menu bar.
3. Choose **Download Link from Clipboard**.
4. Paste the resulting MP4 with **⌘V**.

## How it works

| Component | Responsibility |
| --- | --- |
| Firefox extension | Finds Reddit videos and provides the draggable copy button |
| Native messaging host | Downloads and copies the MP4 without showing an app window |
| macOS app | Provides the standalone UI, menu-bar mode, and recent downloads |

The native host accepts only Reddit and `redd.it` URLs. See
[PRIVACY.md](PRIVACY.md) for the complete data-handling description.

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

The optional live Swift test reads a current video URL from
`REDDIT_SAMPLE_URL`.

## Contributing

Bug reports and pull requests are welcome. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

## License

VideoPaste is available under the [MIT License](LICENSE).

## Disclaimer

VideoPaste is an independent, unofficial project. It is not affiliated with,
endorsed by, or sponsored by Reddit, Signal, Mozilla, or Apple. Reddit and
other product names are trademarks of their respective owners.
