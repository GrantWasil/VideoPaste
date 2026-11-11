const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

const SIGNED_HLS_URL =
  "https://v.redd.it/8wr8yqv3ks0i1/HLSPlaylist.m3u8?f=sd%2CsubsAll%2ChlsSpecOrder&v=1&a=1796935256%2Csignature";

async function openFixture(browser, runtimeNamespace, markup) {
  const page = await browser.newPage();
  // Fixture media must never be fetched from Reddit by the test browser.
  await page.route("**/*", (route) => route.abort());
  await page.setContent(markup);
  await page.evaluate((runtimeNamespace) => {
    window.__vpNativeMessages = [];
    window.__vpNativeResolvers = [];
    if (runtimeNamespace === "browser") {
      window.browser = {
        runtime: {
          sendMessage(message) {
            window.__vpNativeMessages.push(message);
            return new Promise((resolve) => {
              window.__vpNativeResolvers.push(resolve);
            });
          },
        },
      };
      return;
    }

    window.chrome = {
      runtime: {
        connect() {
          const messageListeners = [];
          const disconnectListeners = [];
          let disconnected = false;

          return {
            onMessage: {
              addListener(listener) {
                messageListeners.push(listener);
              },
            },
            onDisconnect: {
              addListener(listener) {
                disconnectListeners.push(listener);
              },
            },
            disconnect() {
              if (disconnected) {
                return;
              }
              disconnected = true;
              disconnectListeners.forEach((listener) => listener());
            },
            postMessage(message) {
              window.__vpNativeMessages.push(message);
              window.__vpNativeResolvers.push((response) => {
                messageListeners.forEach((listener) =>
                  listener(response)
                );
              });
            },
          };
        },
      },
    };
  }, runtimeNamespace);

  await page.addStyleTag({
    path: path.resolve(
      __dirname,
      "../content/videopaste.css"
    ),
  });
  await page.addScriptTag({
    path: path.resolve(
      __dirname,
      runtimeNamespace === "browser"
        ? "../content/runtime.js"
        : "../../chrome-extension/content/runtime.js"
    ),
  });
  await page.addScriptTag({
    path: path.resolve(
      __dirname,
      "../content/videopaste.js"
    ),
  });

  return page;
}

function sentMessages(page) {
  return page.evaluate(() => window.__vpNativeMessages);
}

async function respond(page, response) {
  await page.evaluate((response) => {
    window.__vpNativeResolvers.shift()(response);
  }, response);
}

async function testNewRedditPlayer(browser, runtimeNamespace) {
  const page = await openFixture(
    browser,
    runtimeNamespace,
    `
      <shreddit-post
        permalink="/r/videos/comments/example/post/"
        content-href="https://v.redd.it/8wr8yqv3ks0i1"
      >
        <shreddit-player
          id="feed-player"
          src="${SIGNED_HLS_URL.replaceAll("&", "&amp;")}"
          packaged-media-json='{"playbackMp4s":{"permutations":[{"source":{"url":"https://packaged-media.redd.it/8wr8yqv3ks0i1/pb/m2-res_854p.mp4?s=signature"}}]}}'
          preview="https://v.redd.it/8wr8yqv3ks0i1/CMAF_96.mp4"
          post-type="video"
          style="display: block; height: 225px; width: 400px;"
        >
          <source
            src="${SIGNED_HLS_URL.replaceAll("&", "&amp;")}"
            type="application/vnd.apple.mpegURL"
          >
        </shreddit-player>
      </shreddit-post>
    `
  );

  const directButton = page.locator(".vp-copy-button");
  await directButton.waitFor();
  assert.equal(await directButton.count(), 1);
  assert.match(await directButton.textContent(), /Copy video/);

  const compactButtonRect = await directButton.boundingBox();
  assert.ok(compactButtonRect);
  assert.ok(
    compactButtonRect.width <= 32,
    "The resting Copy video control should be a compact V circle"
  );

  await directButton.hover();
  await page.waitForFunction(
    () =>
      document.querySelector(".vp-copy-button").getBoundingClientRect()
        .width > 90
  );
  const expandedButtonRect = await directButton.boundingBox();
  assert.ok(expandedButtonRect);
  assert.ok(
    expandedButtonRect.width > compactButtonRect.width + 50,
    "The V circle should expand to show Copy video on hover"
  );
  const rightTextPadding = await directButton.evaluate((button) => {
    const buttonRect = button.getBoundingClientRect();
    const labelRect = button
      .querySelector(".vp-copy-button__label")
      .getBoundingClientRect();
    return buttonRect.right - labelRect.right;
  });
  assert.ok(
    rightTextPadding >= 10,
    `The expanded label should have right breathing room (got ${rightTextPadding}px)`
  );

  const directPlayerRect = await page
    .locator("#feed-player")
    .boundingBox();
  assert.ok(directPlayerRect);
  const dragTarget = {
    x: directPlayerRect.x + 70,
    y: directPlayerRect.y + 85,
  };
  await page.mouse.move(
    expandedButtonRect.x + 15,
    expandedButtonRect.y + expandedButtonRect.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(dragTarget.x, dragTarget.y, { steps: 5 });
  await page.mouse.up();
  await page.mouse.move(0, 0);
  await page.waitForFunction(
    () =>
      document.querySelector(".vp-copy-button").getBoundingClientRect()
        .width <= 32
  );

  const draggedButtonRect = await directButton.boundingBox();
  assert.ok(draggedButtonRect);
  assert.ok(
    Math.abs(
      draggedButtonRect.x + draggedButtonRect.width / 2 - dragTarget.x
    ) <= 2,
    "Dragging should place the compact V at the pointer location"
  );
  assert.ok(
    draggedButtonRect.x >= directPlayerRect.x &&
      draggedButtonRect.y >= directPlayerRect.y &&
      draggedButtonRect.x + draggedButtonRect.width <=
        directPlayerRect.x + directPlayerRect.width &&
      draggedButtonRect.y + draggedButtonRect.height <=
        directPlayerRect.y + directPlayerRect.height,
    "The dragged V must remain inside the video"
  );
  assert.equal(
    await page.evaluate(() => window.__vpNativeMessages.length),
    0,
    "Dragging the V must not trigger a download"
  );

  await directButton.click();
  assert.match(await directButton.textContent(), /Loading/);
  const directMessage = await page.evaluate(
    () => window.__vpNativeMessages.at(-1)
  );
  assert.equal(directMessage.type, "vp-download-and-copy");
  assert.equal(
    directMessage.url,
    SIGNED_HLS_URL,
    "New Reddit must send the player's signed manifest URL untouched"
  );
  assert.deepEqual(Object.keys(directMessage).sort(), ["type", "url"]);
  await respond(page, {
    ok: true,
    status: "copied",
    fileName: "reddit-video.mp4",
  });
  await page.waitForFunction(
    () =>
      document.querySelector(".vp-copy-button__label").textContent ===
      "Copied!"
  );

  await page.evaluate((signedHLSURL) => {
    customElements.define(
      "shreddit-player",
      class extends HTMLElement {
        connectedCallback() {
          const root = this.attachShadow({ mode: "open" });
          const frame = document.createElement("div");
          frame.style.cssText = "height: 100%; width: 100%;";

          const video = document.createElement("video");
          video.src =
            "https://packaged-media.redd.it/example/shadow-video.mp4";
          frame.append(video);
          root.append(frame);
        }
      }
    );

    const player = document.createElement("shreddit-player");
    player.id = "shadow-player";
    player.setAttribute("src", signedHLSURL);
    player.style.cssText =
      "display: block; height: 225px; position: relative; width: 400px;";
    document.body.append(player);
  }, SIGNED_HLS_URL);

  await page.waitForFunction(() => {
    const player = document.querySelector("#shadow-player");
    return (
      player?.querySelector(".vp-copy-button") ||
      player?.shadowRoot?.querySelector(".vp-copy-button")
    );
  });

  const shadowButtonRect = await page
    .locator("#shadow-player")
    .evaluate((player) => {
      const button =
        player.shadowRoot.querySelector(".vp-copy-button") ??
        player.querySelector(".vp-copy-button");
      const rect = button.getBoundingClientRect();
      return {
        height: rect.height,
        width: rect.width,
        x: rect.x,
        y: rect.y,
      };
    });

  assert.ok(
    shadowButtonRect.width > 0 && shadowButtonRect.height > 0,
    "The Copy video button must render inside Reddit's shadow-DOM player"
  );

  const shadowPlayerRect = await page
    .locator("#shadow-player")
    .boundingBox();
  assert.ok(shadowPlayerRect);
  await page.mouse.move(
    shadowButtonRect.x + shadowButtonRect.width / 2,
    shadowButtonRect.y + shadowButtonRect.height / 2
  );
  const expandedShadowButtonRect = await page
    .locator("#shadow-player")
    .evaluate((player) => {
      const button = player.shadowRoot.querySelector(
        ".vp-copy-button"
      );
      const rect = button.getBoundingClientRect();
      return {
        height: rect.height,
        width: rect.width,
        x: rect.x,
        y: rect.y,
      };
    });
  const shadowDragTarget = {
    x: shadowPlayerRect.x + shadowPlayerRect.width - 20,
    y: shadowPlayerRect.y + 100,
  };
  await page.mouse.move(
    expandedShadowButtonRect.x + 15,
    expandedShadowButtonRect.y +
      expandedShadowButtonRect.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    shadowDragTarget.x,
    shadowDragTarget.y,
    { steps: 5 }
  );
  await page.mouse.up();

  const movedShadowButton = await page
    .locator("#shadow-player")
    .evaluate((player) => {
      const button = player.shadowRoot.querySelector(
        ".vp-copy-button"
      );
      const rect = button.getBoundingClientRect();
      const playerRect = player.getBoundingClientRect();
      return {
        expandsLeft: button.classList.contains(
          "vp-copy-button--expand-left"
        ),
        inside:
          rect.left >= playerRect.left &&
          rect.right <= playerRect.right &&
          rect.top >= playerRect.top &&
          rect.bottom <= playerRect.bottom,
      };
    });
  assert.equal(
    movedShadowButton.expandsLeft,
    true,
    "A control placed on the right should expand toward the video center"
  );
  assert.equal(
    movedShadowButton.inside,
    true,
    "The expanded shadow-DOM control must remain inside the video"
  );

  const shadowMessage = await clickAndReadMessage(
    page,
    page.locator("#shadow-player .vp-copy-button")
  );
  assert.equal(
    shadowMessage.url,
    SIGNED_HLS_URL,
    "A playing new Reddit player must still send its manifest, never the packaged MP4"
  );
  await page.close();
}

async function clickAndReadMessage(page, button) {
  const sentBefore = (await sentMessages(page)).length;
  await button.click();
  const messages = await sentMessages(page);
  assert.equal(
    messages.length,
    sentBefore + 1,
    "One click must send exactly one message"
  );
  const message = messages.at(-1);
  assert.equal(message.type, "vp-download-and-copy");
  await respond(page, { ok: true, status: "copied" });
  return message;
}

// Markup written from the live old Reddit pages recorded in issue #23.
function nativePlayerMarkup(id, videoID) {
  const signature = "a=1796935256%2Csignature&amp;v=1&amp;f=sd";
  return `
    <div class="media-preview">
      <div class="media-preview-content video-player">
        <div
          id="${id}"
          class="reddit-video-player-root"
          data-hls-url="https://v.redd.it/${videoID}/HLSPlaylist.m3u8?${signature}"
          data-mpd-url="https://v.redd.it/${videoID}/DASHPlaylist.mpd?${signature}"
          data-seek-preview-url="https://v.redd.it/${videoID}/CMAF_96.mp4"
          style="height: 225px; width: 400px;"
        >
          <video src="blob:https://old.reddit.com/${videoID}"></video>
          <div>
            <div class="reddit-video-seek-bar-root">
              <div class="seek-bar-floating">
                <video
                  muted
                  preload
                  src="https://v.redd.it/${videoID}/CMAF_96.mp4"
                ></video>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function testOldRedditNativePlayer(browser, runtimeNamespace) {
  const page = await openFixture(
    browser,
    runtimeNamespace,
    `
      <div
        class="thing link"
        data-url="https://v.redd.it/sb1bhrydqu0i1"
        data-domain="v.redd.it"
        data-promoted="false"
        data-permalink="/r/interesting/comments/1xsz1jk/the_human_urge_to_pet_everything_fluffy/"
      >
        <div class="entry">
          <div class="expando">
            ${nativePlayerMarkup("post-player", "sb1bhrydqu0i1")}
          </div>
        </div>
      </div>
      <div
        class="thing link"
        data-url="https://v.redd.it/q42ef3o5xx881"
        data-domain="v.redd.it"
        data-promoted="false"
        data-permalink="/r/thecatdimension/comments/s0ln6f/the_old_reddit_switcharoo/"
      >
        <div class="entry">
          <div class="expando">
            <div class="crosspost-preview">
              ${nativePlayerMarkup("crosspost-player", "q42ef3o5xx881")}
            </div>
          </div>
        </div>
      </div>
    `
  );

  const postButton = page.locator("#post-player .vp-copy-button");
  const crosspostButton = page.locator("#crosspost-player .vp-copy-button");
  await postButton.first().waitFor();
  await crosspostButton.first().waitFor();
  assert.equal(
    await page.locator(".vp-copy-button").count(),
    2,
    "Each old Reddit player gets one button, not one per <video>"
  );
  assert.equal(await postButton.count(), 1);
  assert.equal(await crosspostButton.count(), 1);

  assert.equal(
    (await clickAndReadMessage(page, postButton)).url,
    "https://v.redd.it/sb1bhrydqu0i1/HLSPlaylist.m3u8?a=1796935256%2Csignature&v=1&f=sd",
    "Old Reddit's own player must send its signed HLS manifest untouched"
  );
  assert.equal(
    (await clickAndReadMessage(page, crosspostButton)).url,
    "https://v.redd.it/q42ef3o5xx881/HLSPlaylist.m3u8?a=1796935256%2Csignature&v=1&f=sd",
    "An intact crosspost must send the original video's signed manifest"
  );

  await page
    .locator("#crosspost-player")
    .evaluate((player) => player.removeAttribute("data-hls-url"));
  assert.equal(
    (await clickAndReadMessage(page, crosspostButton)).url,
    "https://v.redd.it/q42ef3o5xx881/DASHPlaylist.mpd?a=1796935256%2Csignature&v=1&f=sd",
    "Without an HLS manifest the player's DASH manifest is sent"
  );
  await page.close();
}

// RES replaces the native expando in listings; its player holds no manifest.
function resPlayerMarkup(videoMarkup) {
  return `
    <div class="res-expando-box">
      <div class="res-video">
        <div
          class="res-video-container res-media-movable res-element-keep-visible"
          style="height: 225px; width: 400px;"
        >
          ${videoMarkup}
        </div>
      </div>
    </div>
  `;
}

async function testOldRedditRESPlayer(browser, runtimeNamespace) {
  const page = await openFixture(
    browser,
    runtimeNamespace,
    `
      <div
        id="video-row"
        class="thing link"
        data-url="https://v.redd.it/sb1bhrydqu0i1"
        data-domain="v.redd.it"
        data-promoted="false"
        data-permalink="/r/interesting/comments/1xsz1jk/the_human_urge_to_pet_everything_fluffy/"
      >
        <div class="entry">
          <div class="expando-button collapsed video"></div>
        </div>
      </div>
      <div
        id="deleted-crosspost-row"
        class="thing link"
        data-url="https://v.redd.it/3fk2n1hd9vsa1"
        data-domain="v.redd.it"
        data-promoted="false"
        data-permalink="/r/kittengifs/comments/12m0b8d/the_cutest_handful/"
      >
        <div class="entry">
          <div class="expando">
            <div class="crosspost-preview"></div>
          </div>
        </div>
      </div>
    `
  );

  assert.equal(
    await page.locator(".vp-copy-button").count(),
    0,
    "A row with no expanded player gets no button"
  );

  await page.locator("#video-row .entry").evaluate((entry, markup) => {
    entry.insertAdjacentHTML("beforeend", markup);
  }, resPlayerMarkup(`<video src="blob:https://old.reddit.com/res"></video>`));

  const button = page.locator(".vp-copy-button");
  await button.first().waitFor();
  assert.equal(
    await button.count(),
    1,
    "A player expanded after page load gets one button"
  );
  assert.equal(
    (await clickAndReadMessage(page, button)).url,
    "https://v.redd.it/sb1bhrydqu0i1/HLSPlaylist.m3u8",
    "Under RES the manifest URL is built from the post row's v.redd.it id"
  );
  await page.close();
}

async function testGIFPost(browser, runtimeNamespace) {
  const page = await openFixture(
    browser,
    runtimeNamespace,
    `
      <shreddit-post
        permalink="/r/gifs/comments/example/gif/"
        content-href="https://i.redd.it/abc123example.gif"
      >
        <shreddit-player
          gif
          src="https://preview.redd.it/abc123example.gif?width=480&amp;format=mp4&amp;s=signature"
          style="display: block; height: 225px; width: 400px;"
        ></shreddit-player>
      </shreddit-post>
    `
  );

  const button = page.locator(".vp-copy-button");
  await button.waitFor();
  assert.equal(
    (await clickAndReadMessage(page, button)).url,
    "https://preview.redd.it/abc123example.gif?width=480&format=mp4&s=signature",
    "A GIF post's complete MP4 is sent as it is"
  );
  await page.close();
}

async function testNoRedditHostedVideo(browser, runtimeNamespace) {
  const page = await openFixture(
    browser,
    runtimeNamespace,
    `
      <div
        class="thing link"
        data-url="https://i.imgur.com/example.gifv"
        data-domain="i.imgur.com"
        data-promoted="false"
        data-permalink="/r/gifs/comments/example/elsewhere/"
      >
        <div class="entry">
          ${resPlayerMarkup(`
            <video>
              <source src="https://i.imgur.com/example.mp4" type="video/mp4">
            </video>
          `)}
        </div>
      </div>
    `
  );

  const button = page.locator(".vp-copy-button");
  await button.waitFor();
  await freezeClock(page);
  await button.click();
  const noVideo = {
    label: "No video",
    tooltip:
      "VideoPaste copies videos hosted on Reddit. This one is an ad or is hosted somewhere else.",
  };
  assert.deepEqual(await shownOn(button), noVideo);
  assert.deepEqual(
    await sentMessages(page),
    [],
    "With no Reddit-hosted video nothing is sent to the helper"
  );

  await page.clock.fastForward(60_000);
  assert.deepEqual(
    await shownOn(button),
    noVideo,
    "An on-the-spot error must stay while the pointer is over the button"
  );
  await page.mouse.move(0, 0);
  await assertResetsIn3200ms(page, button, noVideo);
  await page.close();
}

async function openPlayerFixture(browser, runtimeNamespace) {
  const page = await openFixture(
    browser,
    runtimeNamespace,
    `
      <shreddit-player
        src="${SIGNED_HLS_URL.replaceAll("&", "&amp;")}"
        style="display: block; height: 225px; width: 400px;"
      ></shreddit-player>
    `
  );
  const button = page.locator(".vp-copy-button");
  await button.waitFor();
  return { page, button };
}

function shownOn(button) {
  return button.evaluate((button) => ({
    label: button.querySelector(".vp-copy-button__label").textContent,
    tooltip: button.title,
  }));
}

// Clicks and checks the click started exactly one attempt.
async function clickToSend(page, button) {
  const sentBefore = (await sentMessages(page)).length;
  await button.click();
  const messages = await sentMessages(page);
  assert.equal(
    messages.length,
    sentBefore + 1,
    "One click must send exactly one message"
  );
  assert.deepEqual(messages.at(-1), {
    type: "vp-download-and-copy",
    url: SIGNED_HLS_URL,
  });
  assert.equal((await shownOn(button)).label, "Loading…");
}

// Answers the attempt in flight and returns what the button then shows.
async function answer(page, button, response) {
  await respond(page, response);
  await page.waitForFunction(
    () =>
      document.querySelector(".vp-copy-button__label").textContent !==
      "Loading…"
  );
  return shownOn(button);
}

async function clickAndFail(page, button, response) {
  await clickToSend(page, button);
  return answer(page, button, response);
}

const LOGIN_REQUIRED_TOOLTIP =
  "This post is only shown to signed-in accounts. VideoPaste downloads without your account or cookies, so it can't copy this one.";
const YTDLP_MISSING_TOOLTIP =
  "VideoPaste needs yt-dlp to download this video. Install it by running “brew install yt-dlp” in Terminal, then try again.";
const HELPER_UNREACHABLE_TOOLTIP =
  "The browser can't reach the VideoPaste helper. In your VideoPaste folder, run “./scripts/build-app.sh” to build the app, then “./scripts/install-videopaste-native-host.sh” to register the helper.";

// Each failure as the new helper (or, for an unreachable helper, the
// background script) reports it: `prose` is the sentence a helper of any
// released version sends, `code` what 0.2.0 sends beside it. A failure with
// no `tooltip` keeps its prose as the tooltip.
const FAILURES = [
  {
    code: "private_post",
    prose: "This post is private. VideoPaste can only download public posts.",
    label: "Private post",
  },
  {
    code: "login_required",
    prose:
      "This post requires a signed-in account. VideoPaste only downloads public posts without using browser cookies.",
    label: "Login required",
    tooltip: LOGIN_REQUIRED_TOOLTIP,
  },
  {
    code: "no_video",
    prose: "This post doesn’t contain a supported video.",
    label: "No video",
  },
  {
    code: "unavailable",
    prose: "This post is unavailable or has been deleted.",
    label: "Unavailable",
  },
  {
    code: "unavailable",
    prose:
      "This video link has expired or is unavailable. Copy a fresh video address and try again.",
    label: "Unavailable",
  },
  {
    code: "ytdlp_missing",
    prose:
      "This looks like a video post rather than a direct video link. Install yt-dlp with “brew install yt-dlp”, or right-click the video and choose Copy Video Address.",
    label: "Setup needed",
    tooltip: YTDLP_MISSING_TOOLTIP,
  },
  // An unreachable helper: the background script's own sentence, then what
  // Firefox and Chrome say when no helper is registered or it will not run.
  ...[
    "The browser could not reach the VideoPaste helper.",
    "No such native application com.grantwasil.videopaste",
    "Specified native messaging host not found.",
    "Access to the specified native messaging host is forbidden.",
    "Failed to start native messaging host.",
    "Native host has exited.",
  ].map((prose) => ({
    code: "helper_unreachable",
    prose,
    label: "Setup needed",
    tooltip: HELPER_UNREACHABLE_TOOLTIP,
  })),
  // Everything else is `failed`: the helper's remaining sentences, raw
  // `yt-dlp` output it passes on, and system errors.
  ...[
    "That doesn’t look like a complete web address.",
    "Please paste an http:// or https:// Reddit or X link.",
    "The helper only accepts Reddit and X video post links.",
    "The browser requested an unsupported action.",
    "The video host returned an unreadable response.",
    "The video host rejected the download (HTTP 500).",
    "The video host returned an empty video file.",
    "The download finished, but the video file could not be found.",
    "The video was saved, but macOS would not copy it to the clipboard.",
    "Video post download failed.",
    "yt-dlp could not start: The file “yt-dlp” doesn’t exist.",
    "ERROR: ffmpeg and ffprobe not found",
    "ERROR: [generic] Unable to download webpage: HTTP Error 404: Not Found",
    "ERROR: [Reddit] sb1bhrydqu0i1: No video formats found!",
    "ERROR: [twitter] 1891234567890123462: This video is protected by a password, use the --video-password option",
    "ERROR: unable to open for writing: [Errno 2] No such file or directory: 'video.mp4.part'",
    "A server with the specified hostname could not be found.",
  ].map((prose) => ({ code: "failed", prose, label: "Try again" })),
];

async function testFailureLabels(browser, runtimeNamespace) {
  const { page, button } = await openPlayerFixture(browser, runtimeNamespace);

  for (const failure of FAILURES) {
    const shown = await clickAndFail(page, button, {
      ok: false,
      error: failure.prose,
      code: failure.code,
    });
    assert.equal(
      shown.label,
      failure.label,
      `Code ${failure.code} must be labelled "${failure.label}"`
    );
    assert.equal(shown.tooltip, failure.tooltip ?? failure.prose);

    const shownByOlderHelper = await clickAndFail(page, button, {
      ok: false,
      error: failure.prose,
    });
    assert.equal(
      shownByOlderHelper.label,
      failure.label,
      `With no code, "${failure.prose}" must still be labelled "${failure.label}"`
    );
    assert.equal(
      shownByOlderHelper.tooltip,
      shown.tooltip,
      "The tooltip must be the same with an older helper"
    );
  }

  assert.equal(
    (
      await clickAndFail(page, button, {
        ok: false,
        error: "This post is private. VideoPaste can only download public posts.",
        code: "a_code_from_a_newer_helper",
      })
    ).label,
    "Try again",
    "An unrecognised code is the catch-all, whatever the prose says"
  );
  assert.deepEqual(
    await clickAndFail(page, button, { ok: false }),
    { label: "Try again", tooltip: "The video could not be copied." },
    "A failure that says nothing is the catch-all"
  );

  await page.close();
}

const RESTING = {
  label: "Copy video",
  tooltip: "Click to copy the video, or drag this control to reposition it",
};
const LOGIN_REQUIRED = {
  label: "Login required",
  tooltip: LOGIN_REQUIRED_TOOLTIP,
};

// Stops the page's clock so that only `fastForward` moves its timers.
async function freezeClock(page) {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
}

// An error is on the button and the pointer is not: it must last 3.2
// seconds more, then give way to the resting button.
async function assertResetsIn3200ms(page, button, error) {
  await page.clock.fastForward(3100);
  assert.deepEqual(
    await shownOn(button),
    error,
    "An error must last 3.2 seconds after the pointer leaves"
  );
  await page.clock.fastForward(200);
  assert.deepEqual(
    await shownOn(button),
    RESTING,
    "An error must reset 3.2 seconds after the pointer leaves"
  );
}

async function testErrorStaysUnderThePointer(browser, runtimeNamespace) {
  const { page, button } = await openPlayerFixture(browser, runtimeNamespace);
  await freezeClock(page);
  const loginRequired = { ok: false, code: "login_required", error: "x" };

  // The click leaves the pointer on the button.
  assert.deepEqual(
    await clickAndFail(page, button, loginRequired),
    LOGIN_REQUIRED
  );
  await page.clock.fastForward(60_000);
  assert.deepEqual(
    await shownOn(button),
    LOGIN_REQUIRED,
    "An error must stay while the pointer is over the button"
  );
  await page.mouse.move(0, 0);
  await assertResetsIn3200ms(page, button, LOGIN_REQUIRED);

  // Coming back to the button before the reset holds the error again.
  await clickAndFail(page, button, loginRequired);
  await page.mouse.move(0, 0);
  await page.clock.fastForward(3000);
  await button.hover();
  await page.clock.fastForward(60_000);
  assert.deepEqual(
    await shownOn(button),
    LOGIN_REQUIRED,
    "An error must stay when the pointer returns before the reset"
  );
  await page.mouse.move(0, 0);
  await assertResetsIn3200ms(page, button, LOGIN_REQUIRED);

  // The pointer has already left when the failure arrives. Loading lasts
  // until the answer, however long that takes.
  await clickToSend(page, button);
  await page.mouse.move(0, 0);
  await page.clock.fastForward(60_000);
  assert.equal(
    (await shownOn(button)).label,
    "Loading…",
    "Loading must last until the helper answers"
  );
  assert.deepEqual(
    await answer(page, button, loginRequired),
    LOGIN_REQUIRED
  );
  await assertResetsIn3200ms(page, button, LOGIN_REQUIRED);

  // A click on a held error starts a new attempt, and success keeps its
  // own timing: 2.2 seconds, pointer or no pointer.
  await clickAndFail(page, button, loginRequired);
  await clickToSend(page, button);
  assert.equal(
    (await answer(page, button, { ok: true, status: "copied" })).label,
    "Copied!"
  );
  await page.clock.fastForward(2100);
  assert.equal((await shownOn(button)).label, "Copied!");
  await page.clock.fastForward(200);
  assert.deepEqual(
    await shownOn(button),
    RESTING,
    "Success must reset after 2.2 seconds with the pointer still on the button"
  );

  // The button still expands under the pointer and still drags.
  const playerRect = await page.locator("shreddit-player").boundingBox();
  await button.hover();
  await page.waitForFunction(
    () =>
      document.querySelector(".vp-copy-button").getBoundingClientRect()
        .width > 90
  );
  const dragTarget = { x: playerRect.x + 70, y: playerRect.y + 85 };
  await page.mouse.down();
  await page.mouse.move(dragTarget.x, dragTarget.y, { steps: 5 });
  await page.mouse.up();
  await page.mouse.move(0, 0);
  await page.waitForFunction(
    () =>
      document.querySelector(".vp-copy-button").getBoundingClientRect()
        .width <= 32
  );
  const draggedRect = await button.boundingBox();
  assert.ok(
    Math.abs(draggedRect.x + draggedRect.width / 2 - dragTarget.x) <= 2 &&
      Math.abs(draggedRect.y + draggedRect.height / 2 - dragTarget.y) <= 2,
    "Dragging must still place the button at the pointer"
  );

  await page.close();
}

async function run(runtimeNamespace) {
  const browser = await chromium.launch({ headless: true });

  try {
    await testFailureLabels(browser, runtimeNamespace);
    await testErrorStaysUnderThePointer(browser, runtimeNamespace);
    await testNewRedditPlayer(browser, runtimeNamespace);
    await testOldRedditNativePlayer(browser, runtimeNamespace);
    await testOldRedditRESPlayer(browser, runtimeNamespace);
    await testGIFPost(browser, runtimeNamespace);
    await testNoRedditHostedVideo(browser, runtimeNamespace);
  } finally {
    await browser.close();
  }
}

run("browser")
  .then(() => run("chrome"))
  .then(() => {
    console.log("Cross-browser overlay DOM tests passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
