const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

async function openFixture(browser, url, markup) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("**/*", (route) =>
    route.fulfill({
      body: `<!doctype html><html><body>${markup}</body></html>`,
      contentType: "text/html",
    })
  );
  await page.goto(url);
  await page.evaluate(() => {
    window.__vpNativeMessages = [];
    window.__vpNativeResolvers = [];
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
  });
  await page.addStyleTag({
    path: path.resolve(__dirname, "../content/videopaste.css"),
  });
  await page.addScriptTag({
    path: path.resolve(__dirname, "../content/videopaste.js"),
  });
  return { context, page };
}

async function run() {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "../manifest.json"),
      "utf8"
    )
  );
  const matches = manifest.content_scripts.flatMap(
    (contentScript) => contentScript.matches
  );
  assert.match(manifest.description, /\bX\b/);
  for (const pattern of [
    "*://x.com/*",
    "*://*.x.com/*",
    "*://twitter.com/*",
    "*://*.twitter.com/*",
  ]) {
    assert.ok(matches.includes(pattern), `Manifest must include ${pattern}`);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const { context, page } = await openFixture(
      browser,
      "https://x.com/home",
      `
        <article data-testid="tweet">
          <a href="/alice/status/1891234567890123456?s=20">
            <time>Jul 24</time>
          </a>
          <div
            data-testid="videoPlayer"
            style="height: 225px; width: 400px;"
          >
            <video src="blob:https://x.com/example"></video>
          </div>
        </article>
      `
    );

    const button = page.locator(".vp-copy-button");
    await button.waitFor();
    assert.equal(await button.count(), 1);
    await button.click();

    const message = await page.evaluate(
      () => window.__vpNativeMessages.at(-1)
    );
    assert.deepEqual(message, {
      type: "vp-download-and-copy",
      url: "https://x.com/alice/status/1891234567890123456",
    });

    await context.close();

    const twitterFixture = await openFixture(
      browser,
      "https://www.twitter.com/explore",
      `
        <article data-testid="tweet">
          <a
            href="https://mobile.twitter.com/bob/status/1891234567890123457/video/2?ref_src=twsrc%5Etfw#video"
          >
            <time>Jul 24</time>
          </a>
          <div
            data-testid="videoPlayer"
            style="height: 225px; width: 400px;"
          >
            <video src="blob:https://twitter.com/first"></video>
            <video src="blob:https://twitter.com/second"></video>
          </div>
        </article>
      `
    );
    const twitterButton = twitterFixture.page.locator(".vp-copy-button");
    await twitterButton.waitFor();
    assert.equal(
      await twitterButton.count(),
      1,
      "One X video player should receive one control"
    );
    await twitterButton.click();
    assert.deepEqual(
      await twitterFixture.page.evaluate(
        () => window.__vpNativeMessages.at(-1)
      ),
      {
        type: "vp-download-and-copy",
        url: "https://x.com/bob/status/1891234567890123457/video/2",
      }
    );
    await twitterFixture.context.close();

    const attachmentFixture = await openFixture(
      browser,
      "https://x.com/home",
      `
        <article data-testid="tweet">
          <a href="/helen/status/1891234567890123465">
            <time>Jul 24</time>
          </a>
          <div data-testid="tweetPhoto">
            <a href="/helen/status/1891234567890123465/video/1"></a>
            <div data-testid="videoPlayer">
              <video src="blob:https://x.com/helen-first"></video>
            </div>
          </div>
          <div data-testid="tweetPhoto">
            <a href="/helen/status/1891234567890123465/video/2"></a>
            <div data-testid="videoPlayer">
              <video src="blob:https://x.com/helen-second"></video>
            </div>
          </div>
        </article>
      `
    );
    const attachmentButtons =
      attachmentFixture.page.locator(".vp-copy-button");
    await attachmentButtons.nth(1).waitFor();
    await attachmentButtons.nth(0).click();
    await attachmentButtons.nth(1).click();
    assert.deepEqual(
      await attachmentFixture.page.evaluate(
        () => window.__vpNativeMessages.map(({ url }) => url)
      ),
      [
        "https://x.com/helen/status/1891234567890123465/video/1",
        "https://x.com/helen/status/1891234567890123465/video/2",
      ],
      "Each control should keep the video link associated with its player"
    );
    await attachmentFixture.context.close();

    const dynamicFixture = await openFixture(
      browser,
      "https://mobile.x.com/home",
      "<main id=\"timeline\"></main>"
    );
    await dynamicFixture.page.evaluate(() => {
      document.querySelector("#timeline").insertAdjacentHTML(
        "beforeend",
        `
          <article data-testid="tweet">
            <a href="/carol/status/1891234567890123458?utm_source=test">
              <time>Jul 24</time>
            </a>
            <div data-testid="videoPlayer">
              <video src="blob:https://x.com/carol-first"></video>
              <video src="blob:https://x.com/carol-second"></video>
            </div>
          </article>
          <article data-testid="tweet">
            <a href="https://twitter.com/dan/status/1891234567890123459">
              <time>Jul 24</time>
            </a>
            <div data-testid="videoPlayer">
              <video src="blob:https://x.com/dan"></video>
            </div>
          </article>
        `
      );
    });

    const dynamicButtons =
      dynamicFixture.page.locator(".vp-copy-button");
    await dynamicButtons.nth(1).waitFor();
    assert.equal(
      await dynamicButtons.count(),
      2,
      "Each dynamically inserted video post should receive one control"
    );
    await dynamicButtons.nth(0).click();
    await dynamicButtons.nth(1).click();
    assert.deepEqual(
      await dynamicFixture.page.evaluate(
        () => window.__vpNativeMessages.map(({ url }) => url)
      ),
      [
        "https://x.com/carol/status/1891234567890123458",
        "https://x.com/dan/status/1891234567890123459",
      ]
    );
    await dynamicFixture.context.close();

    const mobileStatusFixture = await openFixture(
      browser,
      "https://mobile.twitter.com/i/web/status/1891234567890123460/video/3?lang=en",
      `
        <article data-testid="tweet">
          <a href="/renamed_account/status/1891234567890123460">
            <time>Jul 24</time>
          </a>
          <div data-testid="videoPlayer">
            <video src="blob:https://twitter.com/status-page"></video>
          </div>
        </article>
      `
    );
    const mobileStatusButton =
      mobileStatusFixture.page.locator(".vp-copy-button");
    await mobileStatusButton.waitFor();
    await mobileStatusButton.click();
    assert.deepEqual(
      await mobileStatusFixture.page.evaluate(
        () => window.__vpNativeMessages.at(-1)
      ),
      {
        type: "vp-download-and-copy",
        url: "https://x.com/i/web/status/1891234567890123460/video/3",
      }
    );
    await mobileStatusFixture.context.close();

    const unresolvedFixture = await openFixture(
      browser,
      "https://x.com/home",
      `
        <article data-testid="tweet">
          <a href="https://x.com.example/alice/status/1891234567890123461">
            <time>Jul 24</time>
          </a>
          <div
            data-testid="videoPlayer"
            style="height: 225px; width: 400px;"
          >
            <video src="blob:https://x.com/unresolved"></video>
          </div>
        </article>
      `
    );
    const unresolvedButton =
      unresolvedFixture.page.locator(".vp-copy-button");
    await unresolvedButton.waitFor();
    await unresolvedButton.click();
    assert.equal(
      await unresolvedFixture.page.evaluate(
        () => window.__vpNativeMessages.length
      ),
      0,
      "An unresolved X post must not send its blob URL to the native helper"
    );
    assert.match(await unresolvedButton.textContent(), /Post unavailable/);
    assert.match(
      await unresolvedButton.getAttribute("title"),
      /identify a public X post/i
    );
    await unresolvedFixture.page.waitForTimeout(200);
    const errorLabelSize = await unresolvedButton.evaluate((button) => {
      const label = button.querySelector(".vp-copy-button__label");
      return {
        clientWidth: label.clientWidth,
        scrollWidth: label.scrollWidth,
      };
    });
    assert.ok(
      errorLabelSize.clientWidth >= errorLabelSize.scrollWidth,
      `The inline X error should not be visually clipped (${JSON.stringify(errorLabelSize)})`
    );
    await unresolvedFixture.context.close();

    const privateFixture = await openFixture(
      browser,
      "https://x.com/erin/status/1891234567890123462",
      `
        <article data-testid="tweet">
          <a href="/erin/status/1891234567890123462">
            <time>Jul 24</time>
          </a>
          <div data-testid="videoPlayer"></div>
        </article>
      `
    );
    const privateButton =
      privateFixture.page.locator(".vp-copy-button");
    await privateButton.waitFor();
    await privateButton.click();
    await privateFixture.page.evaluate(() => {
      window.__vpNativeResolvers.shift()({
        ok: false,
        error: "This X post is private or protected.",
      });
    });
    await privateFixture.page.waitForFunction(
      () =>
        document.querySelector(".vp-copy-button__label").textContent ===
        "Private post"
    );
    assert.equal(
      await privateButton.getAttribute("title"),
      "This X post is private or protected."
    );
    await privateFixture.context.close();

    const noVideoFixture = await openFixture(
      browser,
      "https://x.com/fiona/status/1891234567890123463",
      `
        <article data-testid="tweet">
          <a href="/fiona/status/1891234567890123463">
            <time>Jul 24</time>
          </a>
          <div data-testid="videoPlayer"></div>
        </article>
      `
    );
    const noVideoButton =
      noVideoFixture.page.locator(".vp-copy-button");
    await noVideoButton.waitFor();
    await noVideoButton.click();
    await noVideoFixture.page.evaluate(() => {
      window.__vpNativeResolvers.shift()({
        ok: false,
        error: "This post doesn’t contain a supported video.",
      });
    });
    await noVideoFixture.page.waitForFunction(
      () =>
        document.querySelector(".vp-copy-button__label").textContent ===
        "No video",
      null,
      { timeout: 3000 }
    );
    assert.equal(
      await noVideoButton.getAttribute("title"),
      "This post doesn’t contain a supported video."
    );
    await noVideoFixture.context.close();

    const unavailableFixture = await openFixture(
      browser,
      "https://twitter.com/george/status/1891234567890123464",
      `
        <article data-testid="tweet">
          <a href="/george/status/1891234567890123464">
            <time>Jul 24</time>
          </a>
          <div data-testid="videoPlayer">
            <video src="blob:https://twitter.com/unavailable"></video>
          </div>
        </article>
      `
    );
    const unavailableButton =
      unavailableFixture.page.locator(".vp-copy-button");
    await unavailableButton.waitFor();
    await unavailableButton.click();
    await unavailableFixture.page.evaluate(() => {
      window.__vpNativeResolvers.shift()({
        ok: false,
        error: "This post is unavailable or was deleted.",
      });
    });
    await unavailableFixture.page.waitForFunction(
      () =>
        document.querySelector(".vp-copy-button__label").textContent ===
        "Unavailable"
    );
    assert.equal(
      await unavailableButton.getAttribute("title"),
      "This post is unavailable or was deleted."
    );
    await unavailableFixture.context.close();
  } finally {
    await browser.close();
  }
}

run()
  .then(() => {
    console.log("Firefox X overlay test passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
