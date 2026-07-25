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

The Firefox extension uses `nativeMessaging` only after you click its
**Copy video** button. It sends the selected Reddit post URL or embedded media
URL and a download command to the local VideoPaste helper. The helper rejects
URLs outside Reddit and `redd.it` domains.

Mozilla treats data sent to a native application as transmission outside the
extension, even though VideoPaste's helper is local. The extension therefore
declares `browsingActivity` and `websiteContent` in its Firefox data-collection
permissions. The project maintainer does not receive this data.

## Third-party services

Reddit and any messaging app where you paste a video apply their own privacy
policies. If `yt-dlp` is installed, its behavior is governed by that project.
