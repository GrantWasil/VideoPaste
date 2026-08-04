# VideoPaste Privacy

VideoPaste is designed to work locally and does not operate a cloud service.

## Data VideoPaste handles

On supported Reddit, X, and Twitter pages, the browser extension locally
inspects the current page URL, links, and video elements to identify supported
video players and add its **Copy video** control. This page information is not
retained or sent to the project maintainer.

When you request a download, VideoPaste receives the supported Reddit,
X/Twitter, or direct-media URL you selected. It downloads the resulting media
to `~/Downloads/VideoPaste`, places the selected file on the macOS clipboard,
and keeps metadata for up to five recent downloads on your Mac. Each recent
entry contains the local file path, byte count, and download time.

Downloaded files remain in `~/Downloads/VideoPaste` until you delete or move
them, or until optional automatic cleanup moves eligible files to the macOS
Trash. Recent-entry metadata remains in VideoPaste's local Application Support
data until a newer entry displaces it, you remove it from Recents, automatic
cleanup removes the corresponding file, or you delete the app's data. Using
VideoPaste's Trash control moves the downloaded file to the macOS Trash and
removes its recent entry.

## Automatic cleanup

Automatic cleanup is off by default. If you enable it, VideoPaste stores the
enabled state, retention amount, and selected unit (hours, days, or weeks) in
the app's local macOS preferences. These settings are not transmitted.

While the menu-bar utility is running, VideoPaste checks for expired downloads
at launch, after a download, when its menu or window opens, and periodically.
Cleanup is limited to regular, non-symlink video files in
`~/Downloads/VideoPaste` whose names match VideoPaste's generated download
pattern. Eligible files are moved to the macOS Trash. VideoPaste does not empty
Trash or permanently erase those files.

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

The extensions run only on supported Reddit, X, and Twitter pages. Their site
access is used to identify video players, add the user-facing control, and
derive the selected post or media URL. They do not keep a browsing-history
database.

The Firefox and Chrome extensions use `nativeMessaging` only after you click
their **Copy video** button. They send the selected Reddit or X/Twitter post URL
or embedded media URL and a download command to the local VideoPaste helper.
The helper accepts supported URLs on Reddit, `redd.it`, `x.com`, and
`twitter.com` domains and rejects other browser requests. VideoPaste does not
read browser cookies or use them to sign in to X. It disables external
configuration and cookie inputs when it runs `yt-dlp`, so a user's local
`yt-dlp` settings cannot add browser authentication.

Mozilla treats data sent to a native application as transmission outside the
extension, even though VideoPaste's helper is local. The extension therefore
declares `browsingActivity` and `websiteContent` in its Firefox data-collection
permissions. The project maintainer does not receive this data.

## Chrome Web Store Limited Use

VideoPaste's use of information received from browser pages complies with the
[Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/limited-use/),
including its Limited Use requirements. VideoPaste uses page content and URLs
only to provide its disclosed video-copying feature. It does not sell this
information, use it for advertising or creditworthiness, transfer it for
unrelated purposes, or make it available for human review by the project
maintainer.

## Third-party services

Reddit, X/Twitter, and any messaging app where you paste a video apply their
own privacy policies. If `yt-dlp` is installed, its behavior is governed by
that project.
