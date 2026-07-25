# VideoPaste Privacy

VideoPaste is designed to work locally and does not operate a cloud service.

## Data VideoPaste handles

When you request a download, VideoPaste receives the supported Reddit,
X/Twitter, or direct-media URL you selected. It downloads the resulting media
to `~/Downloads/VideoPaste`, records the five most recent local file paths on
your Mac, and places the selected file on the macOS clipboard.

## Network requests

VideoPaste connects only as needed to retrieve requested media:

- The host in a direct-media URL you explicitly provide
- Reddit and `redd.it` hosts for Reddit post links
- X, Twitter, and their media hosts for public X/Twitter video posts
- Hosts contacted by `yt-dlp` while resolving a supported post

## Data VideoPaste does not collect

VideoPaste has no analytics, telemetry, advertising, user accounts, tracking,
or project-operated servers. It does not send clipboard contents, download
history, or downloaded files to the project maintainer.

## Browser permissions

The Firefox extension uses `nativeMessaging` to request a download from the
local VideoPaste helper. The helper accepts supported URLs on Reddit,
`redd.it`, `x.com`, and `twitter.com` domains and rejects other browser
requests. VideoPaste does not read Firefox cookies or use them to sign in to X.

## Third-party services

Reddit, X/Twitter, and any messaging app where you paste a video apply their
own privacy policies. If `yt-dlp` is installed, its behavior is governed by
that project.
