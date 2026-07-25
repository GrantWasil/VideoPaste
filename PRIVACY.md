# VideoPaste Privacy

VideoPaste is designed to work locally and does not operate a cloud service.

## Data VideoPaste handles

When you request a download, VideoPaste receives the Reddit video or post URL
you selected. It downloads the resulting media to
`~/Downloads/VideoPaste`, records the five most recent local file paths on your
Mac, and places the selected file on the macOS clipboard.

## Network requests

VideoPaste connects only as needed to retrieve requested media:

- Reddit and `redd.it` hosts for direct media and post links
- Hosts contacted by `yt-dlp` while resolving a Reddit post

## Data VideoPaste does not collect

VideoPaste has no analytics, telemetry, advertising, user accounts, tracking,
or project-operated servers. It does not send clipboard contents, download
history, or downloaded files to the project maintainer.

## Browser permissions

The Firefox extension uses `nativeMessaging` to request a download from the
local VideoPaste helper. The helper rejects URLs outside Reddit and `redd.it`
domains.

## Third-party services

Reddit and any messaging app where you paste a video apply their own privacy
policies. If `yt-dlp` is installed, its behavior is governed by that project.
