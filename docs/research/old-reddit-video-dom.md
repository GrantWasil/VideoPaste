# Old Reddit inline video: DOM and where to read the media URL

Researched 2026-11-10. Sources are the RES repository, Reddit's own player script, the archived Reddit source, and two saved copies of real old Reddit pages. Nothing here was observed in a running browser; see "Not verified".

## Answer

The hypothesis holds, on both counts, for both players.

1. **No post link is found.** Old Reddit wraps each post in `div.thing`, not `article` or `shreddit-post`, so `POST_SELECTOR` matches nothing, and a listing URL has no `/comments/` in it. `findPostURL` returns `null`.
2. **The playing `<video>` has a `blob:` source.** Both the native old Reddit player and the RES player hand the DASH manifest to dash.js, which plays through Media Source Extensions. `normalizeHTTPURL` rejects `blob:`, so `findDirectMediaURL` returns `null`.

Which player the user sees: in a listing with RES installed it is almost certainly the **RES player**. RES replaces the native expando whenever the native one is not already open, regardless of the `forceReplaceNativeExpando` option; that option only matters when the native expando is already open (comment pages).

There was **no recent RES change** behind this. RES has played v.redd.it videos with audio through dash.js and a `blob:` URL since v5.20.3 (July 2020). The only case where an http(s) URL sits on the RES `<video>` is a video with **no audio track**, where RES emits `<source src="https://v.redd.it/<id>/DASH_<n>.mp4">`. That is the likely reason it "sometimes works": silent clips work, clips with sound do not. (Inference; see below.)

### Most reliable way to get a URL

| Step | Read | Works for | Gives |
|---|---|---|---|
| 1 | `video.closest(".thing")?.getAttribute("data-permalink")`, resolved against `location.origin` | native and RES | Post URL, e.g. `/r/<sub>/comments/<id36>/<slug>/`. This is what the helper already wants for yt-dlp. |
| 2 | `video.closest("[data-mpd-url], [data-hls-url]")` (it is the `<video>`'s parent) | native only | `https://v.redd.it/<id>/DASHPlaylist.mpd?a=…` and `…/HLSPlaylist.m3u8?a=…` (signed, expiring query). Also `data-link-url` = the permalink. |
| 3 | `.thing[data-url]` when its host is `v.redd.it` | native and RES, organic posts | `https://v.redd.it/<id>`; the id is the first path segment. RES itself derives the id this way. |

Recommended: add `.thing` to `POST_SELECTOR` (step 1 then works with the existing `data-permalink` branch, since `normalizeHTTPURL` resolves relative URLs). Use step 2 or 3 only if a direct manifest or media id is wanted. Do not read the id from the `<video>` in either player.

One hazard on the native player: it contains a **second `<video>`** in `.seek-bar-floating` whose `src` is `https://v.redd.it/<id>/DASH_96.mp4`, a silent 96p seek preview. `scan()` attaches a button to every `<video>`, and for that element `findDirectMediaURL` would return the preview URL. Once `.thing` resolves, `chooseSourceURL` prefers the post URL, so the fix in step 1 also covers this; without it, that button would send the preview clip.

## Evidence

### A. The post row (`.thing`) — observed in real markup

Saved copy of an old Reddit listing (r/worldnews, post timestamps Dec 2023 to Jan 2024):
<https://github.com/vox-browser/vox/blob/e40fa2fdd043754703c1abd91bb19a0d96edded8/pixel_tests/sites/old-reddit-worldnews/index.html> (the listing is one long line, line 252).

An ordinary link post:

```html
<div class=" thing id-t3_18uytcx linkflair … link " id="thing_t3_18uytcx" onclick="click_thing(this)"
  data-fullname="t3_18uytcx" data-type="link" data-gildings="0" data-whitelist-status="some_ads"
  data-is-gallery="false" data-author="…" data-author-fullname="…" data-subreddit="worldnews"
  data-subreddit-prefixed="r/worldnews" data-subreddit-fullname="t5_2qh13" data-subreddit-type="public"
  data-timestamp="1703995341000" data-url="https://www.reddit.com/live/18hnzysb1elcs"
  data-permalink="/r/worldnews/comments/18uytcx/rworldnews_live_thread_russian_invasion_of/"
  data-domain="reddit.com" data-rank="" data-comments-count="396" data-score="1023"
  data-promoted="false" data-nsfw="false" data-spoiler="false" data-oc="false"
  data-num-crossposts="0" data-context="listing" >
```

The same page contains one Reddit-hosted video post (a promoted post, `t3_147utz7`). Its row adds `data-kind='video'`, plus ad attributes:

```html
<div class=" thing id-t3_147utz7 link promoted … " id="thing_t3_147utz7" …
  data-fullname="t3_147utz7" data-type="link" … data-is-gallery="false" … data-kind='video' …
  data-url="https://alb.reddit.com/cr?za=…"
  data-permalink="/user/<author>/comments/147utz7/<slug>/"
  data-domain="<advertiser domain>" … data-promoted="true" … data-context="listing" >
```

Observed:
- `data-permalink` is present and is a root-relative post path on both rows.
- `data-fullname` is `t3_<id36>`.
- There is no `data-is-video` attribute. `data-kind='video'` appears on the video row and on no other row in this page.
- On this promoted row `data-url` is an ad click-tracker and `data-domain` is the advertiser, so neither points at `v.redd.it`.

Not observed (no organic v.redd.it row in either saved page): that an organic video post has `data-url="https://v.redd.it/<id>"` and `data-domain="v.redd.it"`. Supporting source evidence: RES resolves the media URL from `thing.element.getAttribute('data-url')` and its v.redd.it host takes the id from that URL's path
(<https://github.com/honestbleeps/Reddit-Enhancement-Suite/blob/7d430d738e160256c4dffdcddcfc5daf6577b705/lib/modules/showImages.js#L829-L834>,
<https://github.com/honestbleeps/Reddit-Enhancement-Suite/blob/7d430d738e160256c4dffdcddcfc5daf6577b705/lib/modules/hosts/vreddit.js#L36-L38>). RES would not expand v.redd.it posts at all if this did not hold.

### B. The native old Reddit expando — observed markup plus Reddit's player script

**Before expanding** (same saved page, same row). The expando is a hidden sibling inside the row, with the player markup HTML-escaped in an attribute:

```html
<div class="expando-button collapsed hide-when-pinned video"></div>
…
<div class="expando expando-uninitialized" style='display: none'
     data-cachedhtml=" &lt;div class=&quot;media-preview …" data-pin-condition="…">
  <span class="error">loading...</span>
</div>
```

The archived Reddit source shows the same template and that clicking the button writes `data-cachedhtml` into the expando and removes `expando-uninitialized`
(<https://github.com/reddit-archive/reddit/blob/753b17407e9a9dca09558526805922de24133d53/r2/r2/templates/link.html#L153-L155>,
<https://github.com/reddit-archive/reddit/blob/753b17407e9a9dca09558526805922de24133d53/r2/r2/public/static/js/expando.js#L68>, `#L175`). That archive (Oct 2017) predates the video player and contains no player code.

**`data-cachedhtml`, unescaped** (observed, trimmed):

```html
<div class="media-preview no-constraints-when-pinned" id="media-preview-147utz7" style="…">
  <div class="media-preview-content video-player">
    <div class="no-constraints-when-pinned" style="…">
      <div id="video-147utz7" class="portrait"
           data-hls-url="https://v.redd.it/dsdqfecebe5b1/HLSPlaylist.m3u8?a=1706663278%2C…&amp;v=1&amp;f=sd"
           data-id-36="147utz7"
           data-link-url="/user/<author>/comments/147utz7/<slug>/"
           data-mpd-url="https://v.redd.it/dsdqfecebe5b1/DASHPlaylist.mpd?a=1706663278%2C…&amp;v=1&amp;f=sd"
           data-obfuscated-poster-url="" data-orientation="portrait"
           data-seek-preview-url="https://v.redd.it/dsdqfecebe5b1/DASH_96.mp4"
           data-video-height="486" data-video-width="729.0" … data-is-gif="false"></div>
      <script type="text/javascript">
        …
        var videoPlayerElement = $("#video-147utz7");
        var canPlayDash = (typeof (window.MediaSource || window.WebKitMediaSource) === "function");
        var videoOptions = {
          id: videoPlayerElement.data("id36"),
          linkUrl: videoPlayerElement.data("linkUrl"),
          src: canPlayDash ? videoPlayerElement.data("mpdUrl") : videoPlayerElement.data("hlsUrl"),
          type: canPlayDash ? RedditVideoPlayer.Types.MPD : RedditVideoPlayer.Types.HLS,
          …
        };
        var redditVideoPlayer = new RedditVideoPlayer(videoPlayerElement, videoOptions);
        …
        '<div data-control-type="seekBar" data-preview-video-src="' + videoPlayerElement.data('seekPreviewUrl') + '">'
```

So the manifest URLs live on `div#video-<id36>`: `data-mpd-url` (DASH), `data-hls-url` (HLS), `data-seek-preview-url` (silent low-res MP4), `data-link-url` (permalink). The v.redd.it media id is the first path segment of any of the three.

**What the script does to that element.** Reddit's player script, `https://www.redditstatic.com/videoplayer.XCrwE8Bi5A4.js` (fetched 2026-11-10, 588,277 bytes, SHA-256 `ead30249d4b479bb58ca297197fcf92f148ea2be82c82d2262d787f78057c459`). The file name comes from a saved old Reddit page whose newest post is dated June 2026: <https://github.com/dondai1234/master-fetch/blob/86d1b1329c/tests/old_reddit_real.html>. The file is minified to one line; quoted by identifier:

- `RedditVideoPlayer=function(e,t,n){this.root=$(e),this.root.empty(),this.root.addClass(RedditVideoPlayer.CLASS_NAME), … this.video=$("<video>").attr(i), … this.root.append(this.video,this.poster,this.controls)` with `RedditVideoPlayer.CLASS_NAME="reddit-video-player-root"`. The root keeps its `data-*` attributes (`empty()` removes children only) and gains the class; the `<video>` is its direct child and is created with no `src`.
- `_initializeDashPlayer=function(){"MediaSource"in window?(this.dashPlayer=dashjs.MediaPlayer().create(), … this.dashPlayer.initialize(this.video[0],this.options.src,this.options.autoplay)` — MPD playback goes through a bundled dash.js. The bundle's MSE controller does `window.URL.createObjectURL(e)` and `setSource(n)`, which is where the `blob:` `src` comes from.
- `_initializeNativePlayer=function(){this.video.attr("src",this.options.src)` — only when `MediaSource` is missing does the `<video>` get the http(s) HLS URL. Firefox desktop has `MediaSource`.
- `RedditVideoSeekBar=function(e,t,n){ … this.previewContainer=$("<div>").addClass("seek-bar-floating"),this.previewVideo=$("<video muted preload>").attr("src",n)` — the second `<video>`, with the seek-preview MP4 as an http(s) `src`.

The matching stylesheet in the saved page confirms the resulting structure: `.reddit-video-player-root>video`, `.reddit-video-player-root>div>* .reddit-video-seek-bar-root .seek-bar-floating video`
(<https://github.com/vox-browser/vox/blob/e40fa2fdd043754703c1abd91bb19a0d96edded8/pixel_tests/sites/old-reddit-worldnews/assets/videoplayer.ANmi3DZjWG4.css>).

Resulting expanded tree (assembled from the above, not captured live):

```
div.thing[data-permalink][data-fullname][data-url]
  div.entry
    div.expando
      div.media-preview#media-preview-<id36>
        div.media-preview-content.video-player
          div
            div#video-<id36>.reddit-video-player-root.portrait
                [data-mpd-url][data-hls-url][data-seek-preview-url][data-link-url]
              video                       <- src = blob:…
              div                         <- controls
                … div.reddit-video-seek-bar-root > div.seek-bar-floating > video[src=https://v.redd.it/<id>/DASH_96.mp4]
```

### C. The RES expando — from RES source

Repository <https://github.com/honestbleeps/Reddit-Enhancement-Suite>, commit `7d430d738e160256c4dffdcddcfc5daf6577b705` (2026-11-09; `package.json` version 5.26.3). Paths below are relative to that commit.

**When RES takes over.** `lib/modules/showImages.js` L948-L955:

```js
if (nativeExpando) {
	const forceReplaceNativeExpandoOption = siteModule.options && siteModule.options.forceReplaceNativeExpando;
	if (nativeExpando.open && !(forceReplaceNativeExpandoOption && forceReplaceNativeExpandoOption.value)) {
		console.log('Native expando has already been opened; skipping.', element.href);
		return;
	}
	nativeExpando.detach();
}
```

In a listing the native expando is collapsed when RES scans the row, so RES detaches the native button and box and installs its own, even though `forceReplaceNativeExpando` defaults to `false` (`lib/modules/hosts/vreddit.js` L22-L27). If RES fails to build its expando it reattaches the native one (`showImages.js` L971-L975). The v5.20.4 changelog states the intent of the default: "Disable forceReplaceNativeExpando by default, so Reddit's player appears in the comment section" (`changelog/v5.20.4.md` L10). RES recognises a native video expando by `box.dataset.cachedhtml` matching `video-player` (`lib/modules/showImages/expando.js` L55), consistent with section B.

**What RES fetches.** `lib/modules/hosts/vreddit.js` L36-L80: the id is `pathname.slice(1)` of the post's media URL; RES downloads `https://v.redd.it/${id}/DASHPlaylist.mpd`, rewrites each `BaseURL` to absolute, then:

```js
const sources = (muted && id) ?
	videoSourcesByBandwidth.map(rep => ({ source: rep.querySelector('BaseURL').textContent, type: 'video/mp4' })) :
	[{ source: (new XMLSerializer()).serializeToString(manifest), type: 'application/dash+xml' }];
```

`muted` is true when the manifest has no `AudioChannelConfiguration` (L62).

**What ends up in the DOM.** Template `lib/modules/showImages/templates.js` L107-L119: `div.res-video > div.res-video-container > video[preload=auto]`, with no `src` and no manifest attribute. The box is `div.res-expando-box` (`expando.js` L113), appended to the row's `.entry` (`showImages.js` L986). Then `showImages.js` L2005-L2036:

- For a type the browser can play natively (the silent case, `video/mp4`): `<source src="https://v.redd.it/<id>/DASH_<n>.mp4" type="video/mp4">` children, highest bitrate first.
- For `application/dash+xml`: RES loads its bundled `/dash.mediaplayer.min.js`, makes `URL.createObjectURL(new Blob([v.source], …))` for the manifest text, and calls `player.attachView(this.video); player.attachSource(url)`. The only child added to `<video>` is a dummy `<span>` (L2033). No http(s) URL for the media is written anywhere in the box.

```
div.thing[data-permalink][data-fullname][data-url]
  div.entry
    div.res-expando-box
      … div.res-video
          div.res-video-container
            video                 <- with audio: src = blob:…, child <span>
                                  <- silent:     <source src="https://v.redd.it/<id>/DASH_<n>.mp4">
```

**History.**

- Before July 2020 RES handled only silent v.redd.it videos, as direct MP4 `<source>`s, and threw `Audio is not supported` for the rest, leaving them to the native player (removed lines in commit `507c0b2e89a839a9c08fff90c28f3dcf826b2a03`).
- `507c0b2e` (2020-07-22, first in v5.20.3): "Support for all v.redd.it videos … Uses the dash.js library". `changelog/v5.20.3.md` L7: "add v.redd.it inline support with new player". 20 of the 30 lines of the current source-attachment block (L2005-L2034) still blame to this commit.
- `2d020b8e` (2020-07-23, v5.20.4): default of `forceReplaceNativeExpando` set to `false`.
- `62c36e04` (2024-03-29) and `7babe2cd` (2024-05-04): changed only when Reddit's `videoplayer.*` script is blocked from loading (now only if a cached copy of the option is `true`), not how RES plays video.
- v5.26.0 (2026-10-30): "Upgrade dash.js to 5.2.1" (`changelog/v5.26.0.md` L18). Dependency bump only; `git log -S'dashjs'` on `showImages.js` and `package.json` shows no change to the attach code since 2020, and 2026 commits touching `vreddit.js` and `showImages.js` are Flow/type upgrades, gallery and search work.

### D. What VideoPaste does with each tree — read from this repo

`firefox-extension/content/videopaste.js`:

- `PLAYER_SELECTOR` (L195-L202) and `POST_SELECTOR` (L203-L207) list only new-Reddit elements. Neither `.thing`, `.reddit-video-player-root` nor `.res-video-container` matches.
- `findButtonMount` (L447-L468) therefore falls through to `element.parentElement`: `div.reddit-video-player-root` (native) or `div.res-video-container` (RES).
- `findDirectMediaURL` (L522-L550) reads `video.currentSrc`, `video.src`, `<source>` elements and the container's `src` / `media-url` / `video-url` attributes. `normalizeHTTPURL` (L373-L387) drops `blob:`. Native: nothing left (it does not read `data-mpd-url`). RES with audio: nothing left. RES silent: the `DASH_<n>.mp4` URL.
- `findPostURL` (L638-L661): `closestAcrossRoots(container, POST_SELECTOR)` is `null`; the path has no `/comments/`; returns `null`. Had `.thing` matched, the existing `data-permalink` branch (L641) or the `a[href*='/comments/']` fallback (L648) would succeed.
- `chooseSourceURL` (L664-L682) returns `findPostURL(container) ?? directURL`, so the result is `null` for native and for RES with audio, which is the "Open post first" path (L799).

## Observed versus inferred

Observed in real markup or source:
- `.thing` attribute set and `data-permalink`; `data-kind='video'` on a video row; the unexpanded `.expando[data-cachedhtml]`; the `data-mpd-url` / `data-hls-url` / `data-seek-preview-url` / `data-link-url` element and its init script (one promoted post, captured Jan 2024).
- Reddit's player script (file name current as of a June 2026 page) creates a source-less `<video>`, plays MPD via dash.js and MSE, and creates a second preview `<video>` with an http(s) `src`.
- RES source: takeover rule, manifest fetch, `blob:` manifest, MP4 `<source>`s for silent video, and the commit history above.

Inferred:
- That the playing `<video>`'s `src` reads `blob:…` at runtime. This follows from dash.js attaching a `MediaSource` object URL; no live DOM was inspected.
- That Firefox-based browsers take the dash.js path in RES. It depends on `video.canPlayType('application/dash+xml')` being empty, which is the general behaviour of desktop Firefox and Chromium but was not tested in Zen.
- That organic v.redd.it rows carry `data-url="https://v.redd.it/<id>"`, `data-domain="v.redd.it"` and `data-kind="video"` (section A).
- That "a direct URL used to be on the `<video>`" refers to silent videos under RES, or to new Reddit. No RES version put an http(s) URL on the `<video>` for a v.redd.it video with audio.

## Not verified

- No live old Reddit page could be loaded. Anonymous requests to `old.reddit.com` returned a login wall (HTTP 200, "Welcome to Reddit"), the Wayback Machine reports the URLs as excluded (HTTP 403), and the Common Crawl index timed out or had no captures.
- The native markup sample is a promoted post from January 2024. The player script was re-fetched in November 2026 and still reads the same attributes via the same inline init pattern, but current `data-cachedhtml` for an organic post was not seen.
- Crossposts of video posts: which `data-url` and `data-permalink` the row carries was not checked.
- Whether the user's RES has the `https://*.redd.it/*` host permission. Without it RES may fall back to the native player, in which case section B applies instead of C. Both fail the same way today and both are fixed by resolving `.thing[data-permalink]`.
