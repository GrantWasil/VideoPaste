const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

async function run(runtimeNamespace) {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setContent(`
      <article id="direct-post">
        <div
          data-testid="video-player"
          style="height: 225px; width: 400px;"
        >
          <video src="https://packaged-media.redd.it/example/video.mp4?x=1&y=2"></video>
        </div>
      </article>
    `);
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
      .locator("[data-testid='video-player']")
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
      "https://packaged-media.redd.it/example/video.mp4?x=1&y=2"
    );
    await page.evaluate(() => {
      window.__vpNativeResolvers.shift()({
        ok: true,
        status: "copied",
        fileName: "reddit-video.mp4",
      });
    });
    await page.waitForFunction(
      () =>
        document.querySelector(".vp-copy-button__label").textContent ===
        "Copied!"
    );

    await page.evaluate(() => {
      const post = document.createElement("shreddit-post");
      post.setAttribute(
        "permalink",
        "https://www.reddit.com/r/videos/comments/example/post/"
      );
      post.innerHTML = `
        <reddit-video-player>
          <video src="blob:https://www.reddit.com/example"></video>
        </reddit-video-player>
      `;
      document.body.append(post);
    });

    const buttons = page.locator(".vp-copy-button");
    await buttons.nth(1).waitFor();
    assert.equal(await buttons.count(), 2);

    await buttons.nth(1).click();
    const postMessage = await page.evaluate(
      () => window.__vpNativeMessages.at(-1)
    );
    assert.equal(
      postMessage.url,
      "https://www.reddit.com/r/videos/comments/example/post/"
    );
    await page.evaluate(() => {
      window.__vpNativeResolvers.shift()({
        ok: true,
        status: "copied",
        fileName: "reddit-post.mp4",
      });
    });

    await page.evaluate(() => {
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
      player.style.cssText =
        "display: block; height: 225px; position: relative; width: 400px;";
      document.body.append(player);
    });

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
    await page.close();
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
