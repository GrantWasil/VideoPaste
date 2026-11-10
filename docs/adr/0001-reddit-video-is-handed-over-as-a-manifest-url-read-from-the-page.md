# Reddit video is handed over as a manifest URL read from the page

Reddit refuses anonymous requests for post data, so the helper can no longer start from a post link. The content script instead reads an HLS manifest URL on `v.redd.it` from the page it is already running in and sends only that URL to the helper, which stays anonymous. We chose this to keep the promise that VideoPaste never uses the browser's Reddit session or cookies.

## Considered Options

- **Ask Reddit for the post's data from the signed-in tab.** Rejected: the request rides on the user's Reddit session. It is the fallback to revisit if Reddit stops serving unsigned manifests.
- **Let the helper read browser cookies.** Rejected by the privacy promise.
- **Send the packaged MP4 when the page lists one.** Rejected: it exists only for short videos and expires within hours, so the manifest path would be needed anyway.

## Consequences

- Under RES the page holds only the video's id, so the manifest URL is built unsigned and capped at 720p. Signed manifests read from new Reddit and old Reddit's own player give 1080p.
- Unsigned manifest access is undocumented. If Reddit withdraws it, RES listings stop working until the rejected in-tab request is reconsidered.
- The extension no longer sends Reddit post links. A page with no Reddit-hosted video URL fails on the spot as "No video".
