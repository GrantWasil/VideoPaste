# Where new Reddit keeps a video's media URL in the DOM

Research date: 2026-11-10. All "observed" markup below was fetched anonymously from Reddit on 2026-11-10 unless a different date is given.

## Answer

On new Reddit (the "shreddit" frontend) every Reddit-hosted video is rendered as a `<shreddit-player>` element, and that element's own attributes hold the media URLs. A content script never needs the post link.

| Attribute on `<shreddit-player>` | What it holds | Present when |
|---|---|---|
| `src` | Signed HLS master playlist: `https://v.redd.it/<id>/HLSPlaylist.m3u8?f=…&v=1&a=<expiry>,<sig>` (host is sometimes `cf.v.redd.it`). For GIF posts: an MP4 rendition, `https://preview.redd.it/<id>.gif?width=…&format=mp4&s=…` | Always (every player observed, 280+) |
| `packaged-media-json` | JSON with a list of complete MP4 files (video and audio in one file) on `packaged-media.redd.it`, one per resolution | Only for Reddit-hosted videos of about 2 minutes or less; see "When there is no packaged MP4" |
| `preview` | `https://v.redd.it/<id>/CMAF_96.mp4` (tiny scrub-preview, video only) | Reddit-hosted video; absent on GIF posts |
| `caption-url` | `https://v.redd.it/<id>/wh_ben_en.vtt` | Reddit-hosted video |
| `post-id`, `post-type`, `post-domain`, `gif`, `post-nsfw`, `player-type` | Metadata, no media URL | Mostly always |

The same HLS URL is repeated in a light-DOM child `<source src="…" type="application/vnd.apple.mpegURL">`. That `<source>` is a child of `<shreddit-player>`, not of the inner `<video>`.

There is no DASH manifest URL anywhere in the markup. The string `DASHPlaylist.mpd` appears only as a query parameter (`m=DASHPlaylist.mpd`) inside the packaged MP4 URLs.

**Recommended derivation, in order:**

1. Find the `shreddit-player` (the script already does this with `closestAcrossRoots`).
2. If it has `packaged-media-json`, parse it and take the highest-resolution `playbackMp4s.permutations[].source.url` whose `videoCodec` is `H264`. This is a direct MP4 with audio. Use it immediately: the signature expired about 4–5 hours after the page was served in my sample.
3. Otherwise read the `src` attribute (or the child `<source src>`):
   - If it is a `v.redd.it` / `cf.v.redd.it` URL ending in `/HLSPlaylist.m3u8`, send the **whole signed URL, query string included**. yt-dlp downloads it with no cookies and no Reddit API call. The v.redd.it id is the first path segment.
   - If the player has the `gif` attribute and `src` is a `preview.redd.it`/`external-preview.redd.it` URL with `format=mp4`, that URL is a direct, silent MP4.
4. Never send the bare `https://v.redd.it/<id>` (what `shreddit-post[content-href]` holds). It redirects to the post page and yt-dlp then fails with "Account authentication is required".

The inner `<video>` is not a reliable source: before playback starts it has no `src` at all, and for videos without packaged media it normally holds a `blob:` URL.

## Why the current code hits the dead fallback

`findDirectMediaURL` in `firefox-extension/content/videopaste.js` collects `video.currentSrc`, `video.src`, `<source>` children **of the video**, and `src` / `media-url` / `video-url` on the container. `chooseSourceURL` then only accepts a `packaged-media.redd.it` host and otherwise returns the post URL.

Against the markup observed:

- `packaged-media-json` is never read, so a packaged MP4 is found only if the inner `<video>` has already been given one as its `src` (after playback has started).
- The container's `src` attribute is found, but it is an HLS URL on `v.redd.it`, so it is discarded in favour of the post link.
- The `<source>` element is a child of `shreddit-player`, so `video.querySelectorAll("source")` finds nothing.

So the fallback is taken for every video over about 2 minutes, every GIF post, and any shorter video whose `<video>` has not been initialised yet.

## Evidence: observed in real markup (2026-11-10)

### How the markup was obtained

- `https://www.reddit.com/r/<sub>/` and `https://www.reddit.com/r/<sub>/comments/<id>/…` return an 8 KB JavaScript challenge page to an anonymous client with a generic browser User-Agent (`sh.reddit.com` redirects to the same). I did not solve the challenge.
- Reddit's own HTML partial endpoints answered anonymously with full shreddit markup:
  - Feed: `https://www.reddit.com/svc/shreddit/community-more-posts/hot/?name=<subreddit>` (also `top/?name=…&t=month`).
  - Post page: `https://www.reddit.com/svc/shreddit/partial-post/<subreddit>/<t3_id>?postViewContext=CommentsPage&shreddit_pdp_safety_moderation=enabled`. This URL pattern comes from Reddit's shipped script (`getPDPPostUrl()` in the main bundle), which uses it to render the post on a post page.
  - Embed page: `https://embed.reddit.com/r/<sub>/comments/<id>/<slug>/`.
- Wayback Machine: one full feed page was usable, `https://web.archive.org/web/20261104003634/https://www.reddit.com/r/videos/` (captured 2026-11-04). It shows the same `shreddit-player` attribute set. Every archived post page I tried (captures from 2026-10-11 to 2026-11-10) was the challenge page, so the archive has no usable post-page markup.

Feeds sampled: r/videos, r/funny, r/aww, r/gifs, r/nextfuckinglevel, r/Unexpected, r/PublicFreakout, r/interestingasfuck, r/oddlysatisfying, r/CrazyFuckingVideos, r/WTF, r/FightPorn, r/CombatFootage, r/nsfw, r/popping, r/medizzy, r/MakeMeSuffer. Seven post-page partials: long video, short video, two crossposts, GIF, link-post GIF, NSFW GIF.

### A feed video with packaged media (abridged, r/PublicFreakout feed)

```html
<shreddit-async-loader bundleName="shreddit_player_loader">
  <shreddit-player
    src="https://v.redd.it/8wr8yqv3ks0i1/HLSPlaylist.m3u8?f=sd%2CsubsAll%2ChlsSpecOrder&v=1&a=1796935256%2C<sig>"
    packaged-media-json='{"playbackMp4s":{"duration":28,"permutations":[
      {"source":{"bitrateBps":262388,"dimensions":{"height":392,"width":220},
        "url":"https://packaged-media.redd.it/8wr8yqv3ks0i1/pb/m2-res_392p.mp4?m=DASHPlaylist.mpd&c=wh_ben_en&var=sgpssan&v=1&e=1794358800&s=<sig>",
        "videoCodec":"H264"}},
      … 480p, 640p …,
      {"source":{… "height":854,"width":480 …,"url":"https://packaged-media.redd.it/8wr8yqv3ks0i1/pb/m2-res_854p.mp4?…","videoCodec":"H264"}}]}}'
    caption-url="https://v.redd.it/8wr8yqv3ks0i1/wh_ben_en.vtt"
    preview="https://v.redd.it/8wr8yqv3ks0i1/CMAF_96.mp4"
    player-type="in_feed_player" post-id="t3_1xsnlg3" post-type="video" post-domain="v.redd.it"
    autoplay autoplay-pref single-playback … >
    <source src="https://v.redd.it/8wr8yqv3ks0i1/HLSPlaylist.m3u8?…" type="application/vnd.apple.mpegURL">
    <img slot="poster" …>
  </shreddit-player>
</shreddit-async-loader>
```

The enclosing `<shreddit-post>` has `id="t3_1xsnlg3"`, `post-type="video"`, `domain="v.redd.it"`, `permalink="/r/…/comments/…/"` and `content-href="https://v.redd.it/8wr8yqv3ks0i1"`.

### Element by element

- **`shreddit-player`**: as in the table above. Full attribute set seen: `src`, `packaged-media-json`, `preview`, `caption-url`, `poster`, `player-type` (`in_feed_player` in feeds, `post_detail_screen` on post pages), `post-id`, `post-type`, `post-domain`, `post-title`, `post-score`, `post-created-at`, `post-author-id`, `subreddit-id`, `subreddit-name`, plus booleans such as `gif`, `autoplay`, `post-nsfw`, `post-spoiler`, `post-promoted`.
- **`shreddit-player-2`**: not present in any markup fetched, and not defined in the player bundle I downloaded. Only `shreddit-player` is registered there.
- **`shreddit-post`**: no playlist or MP4 URL. `content-href` is `https://v.redd.it/<id>` for native video posts, the original post's relative permalink for crossposts (for example `/r/TrueAnon/comments/1xsb1rc/…`), the `i.redd.it/….gif` URL for GIF posts, and the external URL for link posts. `id` is the `t3_…` post id.
- **`shreddit-async-loader`**: a wrapper with only `bundleName="shreddit_player_loader"`. No media attributes.
- **`shreddit-embed`** (third-party video): one attribute `html` containing an escaped `<iframe>` and `providerName`. Seen: YouTube (`https://www.youtube.com/embed/<id>`), RedGIFs, Streamable via `cdn.embedly.com`. No `shreddit-player`, no Reddit media URL.
- **`shreddit-blurred-container reason="nsfw"|"spoiler"`**: wraps the media. The `shreddit-player`, with all its attributes, is already in the markup inside the `slot="revealed"` child.
- **`shreddit-media-lightbox-listener`**: its `telemetry` JSON attribute repeats the post's `url` (same value as `content-href`).

### Post pages match feeds

For the same post, the post-page partial carried the same `src` shape, and `packaged-media-json` was present or absent exactly as in the feed (short video and short crosspost: present; 2m14s video and 8m15s crosspost: absent). Only `player-type` and a few behavioural booleans differ. On embed pages (`embed.reddit.com`) the player has `src`, `preview`, `caption-url` and `post-id` and no `packaged-media-json`. I only fetched the embed page of one long video, which would not have had it anyway, so embed pages of short videos are untested.

### When there is no packaged MP4

Counts are over 233 non-ad Reddit-hosted video players in feed markup.

| Situation | `packaged-media-json` | What `src` is |
|---|---|---|
| Native video, 120 s or shorter | Present in 199 of 202 | Signed HLS URL |
| Native video longer than 120 s | Absent in all 31 (shortest was 122 s) | Signed HLS URL |
| Crosspost of a native video | Follows the same length rule (present on 3 short ones, absent on an 8m15s one) | Signed HLS URL of the original video |
| GIF post (`i.redd.it/….gif`, or an external GIF proxied by Reddit) | Never (27 seen) | `preview.redd.it` / `external-preview.redd.it` `…gif?format=mp4` |
| Link post whose media Reddit re-hosted (one imgur link) | Present; player also has `gif` | Signed HLS URL |
| NSFW GIF post in an NSFW subreddit | Never; player has `post-nsfw` and sits in a blurred container | `preview.redd.it … format=mp4` |
| Promoted (ad) video | Never (17 seen) | Signed HLS URL |
| Third-party embed (YouTube, RedGIFs, Streamable) | No player at all | n/a |
| Feed versus post page | No difference | No difference |

Durations: packaged videos report `playbackMp4s.duration` (5–120 s). For videos without it I read `mediaPresentationDuration` from `https://v.redd.it/<id>/DASHPlaylist.mpd`. The three short exceptions (52 s, 75 s, 89.5 s) were all in the r/popping top-of-month feed and were 5–25 days old; I do not know why they lack packaged media.

### What the media URLs return to an anonymous client

- **Packaged MP4** (`packaged-media.redd.it/<id>/pb/m2-res_<N>p.mp4?…&e=…&s=…`): HTTP 200, `video/mp4`. `ffprobe` on one file showed H.264 video plus AAC audio. The same URL without its query string returns 403. `e=1794358800` is 2026-11-11 01:00 UTC, roughly 4–5 hours after the page was fetched.
- **Signed HLS `src`**: 200. The `a=` value begins with a Unix time about 30 days after the fetch. For one portrait video the signed playlist listed renditions up to 1080x1920.
- **Unsigned `https://v.redd.it/<id>/HLSPlaylist.m3u8` and `…/DASHPlaylist.mpd`**: 200, also with curl's default User-Agent. For that same video they stopped at 720x1280, so the unsigned form can be lower quality than the signed `src`.
- **`https://v.redd.it/<id>/CMAF_<N>.mp4`, `CMAF_AUDIO_128.mp4`**: 200. The manifest lists video and audio as separate representations, so a `CMAF_<N>.mp4` URL is a video-only file. `DASH_480.mp4` (the older naming) returned 403.
- **Bare `https://v.redd.it/<id>`**: 302 to `https://www.reddit.com/video/<id>`.
- **GIF `…gif?width=…&format=mp4&s=…`**: 200, `video/mp4`.

### yt-dlp behaviour (yt-dlp 2026.10.26, no cookies)

- Signed HLS `src` URL, unsigned `HLSPlaylist.m3u8`, and `DASHPlaylist.mpd`: formats listed through the generic extractor.
- A full download of a 2m37s video from its signed `src` URL, using the same flags as the helper's `ytdlpArguments`, produced an MP4 with H.264 video and AAC audio, 157.5 s long.
- Bare `https://v.redd.it/<id>`: follows the redirect to the post, then `ERROR: [Reddit] …: Account authentication is required`.

## Evidence: Reddit's shipped player script

Source: `https://www.redditstatic.com/js/concat?c=sce_0&prefix=en-US/&chunks=BFm9vVAtnh` (the chunk that the main bundle maps to `shreddit_player_loader`), fetched 2026-11-10. Chunk names are build hashes and will change.

Read directly from the code:

- Only `shreddit-player` is registered as the player element.
- `isMp4` is true when `packaged-media-json` is set; `isHls` is `src.includes(".m3u8") && !isMp4`.
- With packaged media, the controller parses the JSON, splits permutations into H.264 and VP9 lists by `source.videoCodec`, and sets `videoElement.src` to the chosen permutation's URL. If a `packaged-auth-token` attribute exists it is added to that URL as a query parameter.
- With HLS, it loads hls.js and calls `hls.loadSource(src)` then `hls.attachMedia(videoElement)`. If hls.js reports it is unsupported, it sets `videoElement.src = src` instead.
- With neither (GIF posts), it sets `videoElement.src = src`.
- The `<video>` is created with `document.createElement("video")` and inserted by the component's `render()`. `initializeVideoElement()` runs only from `play`, `load`, or the autoplay path.
- Declared attributes not seen in anonymous markup: `packaged-auth-token`, `packaged-auth-expires-at`, `streaming-auth-token`, `streaming-auth-expires-at`, `is-video-processing`, `media-origin`.

## Inferred, not observed

I could not run Reddit in a real browser session, so the state of the live inner `<video>` is inferred from the script above:

- Before the player has played, loaded or autoplayed, the `<video>` has no `src`.
- Video with packaged media: `video.src` is an `https://packaged-media.redd.it/…mp4` URL, possibly with `#t=<seconds>` appended after a quality switch.
- Video without packaged media in Firefox or Chrome: hls.js attaches a MediaSource, so `video.src` is a `blob:` URL. In a browser where hls.js is unsupported (iOS Safari), `video.src` is the HLS URL.
- GIF post: `video.src` is the `preview.redd.it … format=mp4` URL.
- The `<video>` has no `<source>` children; the script never creates any.
- The `<video>` lives in the player's shadow root. The component has `:host` styles and no visible render-root override in this chunk, but I did not confirm the base class.
- "About 2 minutes" as the packaged-media cut-off is fitted to the sample (longest with: 120 s; shortest long one without: 122 s). Reddit does not document it.

## Secondary corroboration (weak)

- Reddit-Embed-Linker, `src/functions.ts` (`https://github.com/DukeBas/Reddit-Embed-Linker`, last commit 2022-05-17, so stale): takes the player's `src` and does `link.split('/HLSPlaylist')[0]` to get `https://v.redd.it/<id>`. It then builds `/DASH_<quality>.mp4`, a naming that now returns 403.
- Open Media Grabber userscript 0.2.1 (`https://greasyfork.org/scripts/589485-open-media-grabber/code`): its Reddit module reads the post's JSON (`secure_media.reddit_video`) rather than DOM attributes, which is the route that anonymous clients can no longer use.
- A web search found no open-source project that reads `packaged-media-json`.

## Not verified

- Markup served to a logged-in user, including whether `packaged-auth-token` / `streaming-auth-token` appear and whether the URLs then need them.
- An NSFW Reddit-hosted video (only NSFW GIF posts were served to me; anonymous feeds of mixed subreddits contained no NSFW-flagged video posts).
- The home feed, r/popular, user profiles, search results, the media lightbox and comment-embedded videos (one comment GIF player was seen, with `src`, `gif`, `comment-id`).
- Whether the full page served to a browser adds anything beyond what the partial endpoints return.
- Why three short videos had no packaged media.
- How long the signed HLS URL really stays valid, and whether an unsigned playlist is always capped at 720p.
