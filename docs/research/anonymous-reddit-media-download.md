# Anonymous download of Reddit-hosted video from a media URL

Researched 2026-11-10 with yt-dlp 2026.10.26 and Homebrew ffmpeg 9.0.2, from one US residential-style connection, no cookies anywhere.

## Answer

Yes. Given a manifest URL on `v.redd.it`, the helper can download one MP4 with audio, with no cookies, using its current yt-dlp flags unchanged.

- **What to hand the helper:** `https://v.redd.it/<id>/HLSPlaylist.m3u8` (preferably the full signed URL the page's player already carries) or `https://v.redd.it/<id>/DASHPlaylist.mpd`. yt-dlp routes both to its `generic` extractor on its own; no `--force-generic-extractor` or `--use-extractors` flag is needed.
- **What not to hand it:**
  - A bare `https://v.redd.it/<id>`: it redirects to the post and fails with "Account authentication is required".
  - A single rendition such as `CMAF_720.mp4`: it downloads fine but is video-only, so the result is silent. The helper's `isDirectVideoURL` currently treats any `.mp4` path as a direct download (`Sources/VideoPasteCore/VideoDownloader.swift:78-85`), so this would bypass yt-dlp and produce a silent file.
- **Headers:** none needed. Manifests, video renditions and audio renditions returned the same status with curl's default User-Agent, an empty one, a Python one, an ffmpeg one, a browser one, and with a Reddit or a foreign Referer.
- **Signing:** the `a=<expiry>,<signature>` token on manifest URLs is optional. Without it (or with a bad or expired one) the manifest is still served, but capped at 720p. With a valid one the manifest also lists 1080p. Tokens issued today expire in 30 days.
- **`packaged-media.redd.it`:** a single progressive MP4 that already contains audio, but the signature is mandatory and the URLs issued today expire within about 4.3 hours (on an hour boundary).
- **ffmpeg alone is not a substitute for yt-dlp here.** The installed ffmpeg has no DASH demuxer and truncated the HLS download. It only worked when given the video and audio rendition URLs as two explicit inputs.

Recommended input, in order of preference:

1. The signed `HLSPlaylist.m3u8` URL from the page's `<shreddit-player src>`: up to 1080p, valid 30 days.
2. An unsigned `https://v.redd.it/<id>/HLSPlaylist.m3u8` built from the id: up to 720p, no expiry observed.
3. `https://v.redd.it/<id>/DASHPlaylist.mpd`: same, but for one 2024 video it offered only 480p where HLS offered 720p.

## Verified by running something

All requests were anonymous. `<UA>` below is a generic desktop Chrome User-Agent string. `<flags>` is the helper's flag set from `Sources/VideoPasteCore/VideoDownloader.swift:213-226`:

```
--ignore-config --no-cookies --no-cookies-from-browser --no-playlist --playlist-items 1
--no-progress --merge-output-format mp4 --remux-video mp4 --print after_move:filepath --output <template>
```

Test videos (ids found in anonymous Reddit HTML, see "Where the ids came from"):

| id | posted | notes |
|---|---|---|
| `gaq9q44d0r0i1` | Nov 2026 | portrait, has audio, 1080p source |
| `kaznbswkht0i1` | Nov 2026 | no audio track |
| `a2mdj5d57qyc1` | May 2024 | from yt-dlp's own test list (`reddit.py:173-175`) |
| `zv89llsvexdz` | Aug 2017 | from yt-dlp's own test list (`reddit.py:22-24`) |

### The premise still holds

- `curl -A <UA> https://www.reddit.com/r/videos/hot.json` returned 403. So did `/r/aww/new.json`, `https://api.reddit.com/r/aww/new` and a post's `/.json`.
- `yt-dlp <flags> --simulate https://www.reddit.com/r/aww/comments/1xs1gik/` ended with `ERROR: [Reddit] 1xs1gik: Account authentication is required.`

### What `v.redd.it` serves anonymously

`curl -s -o /dev/null -r 0-99 -w '%{http_code}' -A <UA> https://v.redd.it/<id>/<path>`; 206 means served.

| path | `gaq9q44d0r0i1` (2026) | `kaznbswkht0i1` (2026, silent) | `a2mdj5d57qyc1` (2024) | `zv89llsvexdz` (2017) |
|---|---|---|---|---|
| `DASHPlaylist.mpd` | 206 | 206 | 206 | 206 |
| `HLSPlaylist.m3u8` | 206 | 206 | 206 | 206 |
| `CMAF_480.mp4` | 206 | 206 | 403 | 403 |
| `CMAF_720.mp4` | 206 | 206 | not tested | not tested |
| `CMAF_1080.mp4` | 206 | 206 | not tested | not tested |
| `DASH_480.mp4` | 403 | 403 | 206 | 403 |
| `DASH_720.mp4` | 403 | 403 | 200 | not tested |
| `CMAF_AUDIO_128.mp4`, `CMAF_AUDIO_64.mp4` | 206 | 403 | 403 | 403 |
| `DASH_AUDIO_128.mp4` | 403 | 403 | 206 | 403 |
| `DASH_audio.mp4` | 403 | 403 | 403 | 403 |
| `audio` | 403 | 403 | 403 | 206 |

Reading this table:

- Rendition file names depend on when the video was encoded: `CMAF_*` for the 2026 videos, `DASH_*` for the 2024 one, and `DASH_2_4_M` / `audio` for the 2017 one (names taken from each video's own `DASHPlaylist.mpd`). A 403 here is an S3-style `AccessDenied` XML body, meaning the object does not exist under that name, not that the client was refused. Guessing file names is therefore fragile; the manifest is the only reliable index.
- The silent video has no audio rendition at all, and its manifest lists no audio.
- A deleted video's manifests return 403 with body `Access denied` (observed on `xbmj4t3igy1d1`, also from yt-dlp's test list).

Renditions are single-track. `ffprobe https://v.redd.it/gaq9q44d0r0i1/CMAF_1080.mp4` showed one h264 stream, 1080x1920, no audio. `ffprobe .../CMAF_AUDIO_128.mp4` showed one aac stream.

### No particular User-Agent or Referer is needed

For `gaq9q44d0r0i1`, each of `DASHPlaylist.mpd`, `HLSPlaylist.m3u8`, `CMAF_720.mp4`, `CMAF_AUDIO_128.mp4` and `CMAF_720.m3u8` returned 206 under every one of these conditions:

- curl's default User-Agent
- an empty User-Agent (`-A ""`)
- `python-requests/2.31`
- `Lavf/61.7.100`
- browser User-Agent with `Referer: https://www.reddit.com/`
- browser User-Agent with `Referer: https://example.com/` and `Origin: https://example.com`

The manifest response carries `access-control-allow-origin: *` and `cache-control: public, max-age=1209600`.

### Signed manifest URLs: optional, they only unlock 1080p

The page's player carries a URL of this shape (taken from anonymous Reddit HTML for `gaq9q44d0r0i1`):

```
https://v.redd.it/<id>/HLSPlaylist.m3u8?f=hd%2CsubsAll%2ChlsSpecOrder&v=1&a=<unix-expiry>%2C<base64 of a 64-hex-char string>
```

The expiry value was 1796935242 when fetched at about 1794343240, which is 30.00 days ahead. Three separate fetches of different pages all gave 29.9997 to 29.9999 days.

Each variant below was fetched with `curl -A <UA>`; the response header `x-reddit-video-features` and the highest listed resolution were recorded.

| variant | status | `x-reddit-video-features` | top resolution |
|---|---|---|---|
| signed, exactly as issued | 200 | `hd,subsAll,hlsSpecOrder` | 1080x1920 |
| same `f`, no `a` | 200 | `sd,subsAll,hlsSpecOrder` | 720x1280 |
| `?f=hd` only, no `a` | 200 | `sd` | 720x1280 |
| no query at all | 200 | `sd` | 720x1280 |
| signature altered by one character | 200 | `sd,subsAll,hlsSpecOrder` | 720x1280 |
| valid signature, `f` changed to `hd` | 200 | `sd` | 720x1280 |
| valid signature, expiry changed to a past time | 200 | `sd,subsAll,hlsSpecOrder` | 720x1280 |
| HLS signature reused on `DASHPlaylist.mpd` | 200 | `sd,subsAll,hlsSpecOrder` | 1280 high |

So the signature covers the path, the `f` value and the expiry, and a failed check downgrades to SD instead of refusing. The rendition files themselves are not gated: `CMAF_1080.mp4` and `CMAF_1080.m3u8` returned 200 with no token at all.

### `packaged-media.redd.it`: muxed MP4 with audio, signature mandatory, short-lived

URL shape (from the player's `packaged-media-json` attribute):

```
https://packaged-media.redd.it/<id>/pb/m2-res_<height>p.mp4?m=DASHPlaylist.mpd&var=sgpssan&v=1&e=<unix-expiry>&s=<40 hex chars>
```

Tested on `m2-res_1280p.mp4` for `gaq9q44d0r0i1`:

| variant | status |
|---|---|
| as issued, browser / curl default / `Lavf` User-Agent | 206 |
| no query string | 403 |
| `s` removed | 403 |
| `s` altered by one character | 403 |
| `e` moved later, same `s` | 403 |
| the 1280p signature on the 1920p path | 403 |

- `ffprobe` on the signed URL showed h264 720x1280 plus aac, 11.87 s, 2,890,813 bytes: one file with audio.
- Every packaged URL fetched at 20:40 UTC had `e=1794358800`, which is 01:00:00 UTC the next day: 4.3 hours ahead and exactly on an hour boundary.
- Not every player had this attribute. In one listing response, 2 of 6 `<shreddit-player>` elements carried `packaged-media-json`; all 6 carried the signed HLS `src`.

### yt-dlp behaviour

**A bare id fails.** `yt-dlp <flags> --simulate https://v.redd.it/gaq9q44d0r0i1`:

```
[generic] Extracting URL: https://v.redd.it/gaq9q44d0r0i1
[redirect] Following redirect to https://www.reddit.com/r/aww/comments/1xshy5q/...
[Reddit] 1xshy5q: Downloading JSON metadata
ERROR: [Reddit] 1xshy5q: Account authentication is required.
```

The mechanism is an HTTP redirect, not a URL pattern: `curl` shows `https://v.redd.it/<id>` answering 302 to `https://www.reddit.com/video/<id>/`, which answers 301 to the post. Adding `--force-generic-extractor` gave the same Reddit error; adding `--use-extractors generic` gave `ERROR: Unsupported URL: https://www.reddit.com/r/aww/comments/...`. Neither flag rescues a bare id.

**Manifest URLs work with no extra flags.** `yt-dlp <flags> --simulate --print '%(extractor)s %(format_id)s %(width)sx%(height)s v=%(vcodec)s a=%(acodec)s'`:

| URL | output |
|---|---|
| `.../gaq9q44d0r0i1/DASHPlaylist.mpd` | `generic 4+7 720x1280 v=avc1.4d401f a=mp4a.40.2` |
| `.../gaq9q44d0r0i1/HLSPlaylist.m3u8` | `generic 1945+7-audio_0 720x1280 v=avc1.4d401f a=NA` |
| signed `HLSPlaylist.m3u8` | `generic 3847+7-audio_0 1080x1920 v=avc1.640028 a=NA` |
| `.../gaq9q44d0r0i1/CMAF_720.mp4` | `generic mp4 NAxNA v=NA a=NA` |
| `.../a2mdj5d57qyc1/HLSPlaylist.m3u8` | `generic ... 720x1042` |
| `.../a2mdj5d57qyc1/DASHPlaylist.mpd` | `generic ... 480x694` |

The last two rows show that the unsigned DASH manifest can list fewer renditions than the unsigned HLS one for the same video.

**Real downloads with the helper's exact flags**, each followed by `ffprobe` on the output file:

| input | exit | result |
|---|---|---|
| `gaq9q44d0r0i1/DASHPlaylist.mpd` | 0 | mp4, h264 720x1280 + aac, 11.87 s, 2,890,812 bytes |
| `gaq9q44d0r0i1/HLSPlaylist.m3u8` | 0 | mp4, h264 720x1280 + aac, 11.87 s, 2,890,812 bytes |
| signed `HLSPlaylist.m3u8` | 0 | mp4, h264 1080x1920 + aac, 11.87 s, 5,712,644 bytes |
| signed `packaged-media.redd.it/.../m2-res_1920p.mp4` | 0 | mp4, h264 1080x1920 + aac, 5,712,645 bytes |
| `gaq9q44d0r0i1/CMAF_720.mp4` | 0 | mp4, h264 720x1280, **no audio** |
| `kaznbswkht0i1/DASHPlaylist.mpd` (silent source) | 0 | mp4, h264 952x720, no audio, no error |
| `a2mdj5d57qyc1/DASHPlaylist.mpd` (2024) | 0 | mp4, h264 480x694 + aac, 53.9 s |
| `zv89llsvexdz/DASHPlaylist.mpd` (2017) | 0 | mp4, h264 264x480 + aac, 11.8 s |
| `DASHPlaylist.mpd` plus `--force-generic-extractor` | 0 | same as first row |
| `DASHPlaylist.mpd` plus `--use-extractors generic` | 0 | same as first row |

The DASH run prints `WARNING: [generic] Falling back on generic information extractor` on stderr; the HLS run prints no warning. With the generic extractor, `%(id)s` and `%(title)s` are `DASHPlaylist` or `HLSPlaylist`, so an output template must not rely on them for a unique or meaningful name.

### ffmpeg directly

- `ffmpeg -i https://v.redd.it/gaq9q44d0r0i1/DASHPlaylist.mpd -c copy out.mp4` failed: `Error opening input: Invalid data found when processing input`. `ffmpeg -demuxers` lists `hls` and `webm_dash_manifest` but no `dash` demuxer in this build.
- `ffmpeg -i .../HLSPlaylist.m3u8 -c copy out.mp4` exited 0 but logged `Invalid NAL unit size` errors and wrote 4.03 s of an 11.87 s video.
- Two explicit inputs worked: `ffmpeg -i .../CMAF_1080.mp4 -i .../CMAF_AUDIO_128.mp4 -map 0:v:0 -map 1:a:0 -c copy -movflags +faststart out.mp4` exited 0 and gave h264 1080x1920 + aac, 11.87 s, 5,712,644 bytes (byte-identical in size to the yt-dlp signed-HLS result). This needs the rendition names, which only the manifest gives reliably.

### Where the ids came from

Reddit served HTML containing video player markup to an anonymous `curl -A <UA>` with no cookies at these URLs (all 200):

- `https://embed.reddit.com/r/<sub>/comments/<post>/`
- `https://www.redditmedia.com/mediaembed/<post>`
- `https://embed.reddit.com/r/<sub>/`
- `https://www.reddit.com/svc/shreddit/community-more-posts/hot/?name=<sub>`

The plain post page `https://www.reddit.com/r/<sub>/comments/<post>/` returned an 8 KB stub with no media, and `old.reddit.com` redirected to a login page. This was only used to obtain test ids and signed URLs; whether these endpoints are stable or rate-limited was not examined.

## Inferred from reading, not run

- yt-dlp's Reddit extractor only claims `reddit.com` and `redditmedia.com` post URLs (`_VALID_URL`, `yt_dlp/extractor/reddit.py:20`). It has no pattern for `v.redd.it`, which is why manifest URLs fall through to `generic`. No other extractor in the installed package mentions `v.redd.it`.
- The "Account authentication is required" error is raised when `https://www.reddit.com/<slug>/.json` does not return JSON and no `reddit_session` cookie is present (`reddit.py:306-314`).
- When the extractor does get post data, it builds formats from the same anonymous URLs tested above: the post's `dash_url` / `hls_url`, falling back to `https://v.redd.it/<id>/DASHPlaylist.mpd` and `.../HLSPlaylist.m3u8`, and it appends `subsAll` to the HLS `f` parameter (`reddit.py:410-415`). Its only video-only "fallback" format is flagged `acodec: none` (`reddit.py:417-427`). So handing yt-dlp the manifest reproduces the extractor's format list minus post metadata (title, uploader, thumbnails).
- The upstream cause is tracked in yt-dlp issue #17856, "[reddit] Method for fetching post JSON appears to be unavailable", opened 2026-10-19 and still open; a contributor comment there says the `.json` method "is now only for logged-in/authenticated users". Earlier related items: issue #16877 (closed) and PR #16839 "[ie/reddit] Work around anonymous JSON API depreciation". Source: `https://github.com/yt-dlp/yt-dlp/issues/17856`, `/issues/16877`, `/pull/16839`.
- The signature in `a=` decodes to 64 hex characters, consistent with a keyed SHA-256; the packaged-media `s=` is 40 hex characters, consistent with a keyed SHA-1. Neither can be forged client-side, as the tampering tests above confirm in effect.

## Not verified

- **Real expiry behaviour.** The 30-day and ~4-hour lifetimes are read from the timestamps in freshly issued URLs. No URL was held until it actually expired. Editing the manifest expiry to a past time downgraded to SD; editing the packaged-media expiry gave 403, but that also invalidates the signature, so it does not show what a genuinely expired packaged URL returns.
- **Whether the packaged-media expiry is always the next hour boundary plus a fixed number of hours**, or was coincidence at the time of the fetch. One sample time only.
- **NSFW, quarantined, private-community and removed-by-moderator videos.** Only public, safe-for-work videos were tested (plus one deleted video, which returned 403).
- **Other networks.** Everything ran from one connection. Datacenter, VPN or flagged IP addresses may be treated differently; yt-dlp issue #15520 ("Your IP address is unable to access the Reddit API") suggests Reddit does discriminate by IP on other endpoints.
- **Rate limits** on `v.redd.it`: a few dozen requests triggered none.
- **A real HLS download of a pre-CMAF video.** The 2024 video's HLS playlist uses `.ts` byte ranges; it was simulated (720p selected) but only its DASH manifest was actually downloaded.
- **1080p without a token for older videos.** `CMAF_1080.mp4` was fetched unsigned for the 2026 videos only; `DASH_1080.mp4` did not exist for the 2024 test video.
- **Durability.** Unsigned manifest access is undocumented behaviour. Reddit could make the token mandatory at any time, which is the reason to prefer passing the signed URL from the page.
