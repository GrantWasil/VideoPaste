(() => {
  "use strict";

  const BUTTON_CLASS = "vp-copy-button";
  const POSITION_CLASS = "vp-position-anchor";
  const SHADOW_STYLE_ID = "vp-shadow-button-styles";
  const SHADOW_BUTTON_STYLES = `
    .vp-copy-button {
      --vp-compact-width: 30px;
      --vp-expanded-width: 112px;
      align-items: center !important;
      appearance: none !important;
      backdrop-filter: blur(12px) !important;
      background: rgba(255, 69, 0, 0.94) !important;
      border: 1px solid rgba(255, 255, 255, 0.38) !important;
      border-radius: 999px !important;
      box-sizing: border-box !important;
      box-shadow:
        0 3px 12px rgba(0, 0, 0, 0.32),
        inset 0 1px 0 rgba(255, 255, 255, 0.22) !important;
      color: #fff !important;
      cursor: grab !important;
      display: inline-flex !important;
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      gap: 0 !important;
      height: 30px !important;
      letter-spacing: 0 !important;
      line-height: 1 !important;
      margin: 0 !important;
      min-height: 30px !important;
      opacity: 0.96 !important;
      overflow: hidden !important;
      padding: 4px !important;
      position: absolute !important;
      right: 10px !important;
      text-transform: none !important;
      touch-action: none !important;
      top: 10px !important;
      transform: translateZ(0) !important;
      transition:
        filter 120ms ease,
        opacity 120ms ease,
        transform 120ms ease,
        width 160ms ease !important;
      user-select: none !important;
      -webkit-user-select: none !important;
      width: var(--vp-compact-width) !important;
      z-index: 2147483646 !important;
    }

    .vp-copy-button:hover {
      filter: brightness(1.08) !important;
      gap: 6px !important;
      opacity: 1 !important;
      padding-right: 13px !important;
      transform: translateY(-1px) translateZ(0) !important;
      width: var(--vp-expanded-width) !important;
    }

    .vp-copy-button:active {
      transform: translateY(0) translateZ(0) !important;
    }

    .vp-copy-button:focus-visible {
      gap: 6px !important;
      outline: 3px solid rgba(255, 255, 255, 0.88) !important;
      outline-offset: 2px !important;
      padding-right: 13px !important;
      width: var(--vp-expanded-width) !important;
    }

    .vp-copy-button__badge {
      align-items: center !important;
      background: rgba(35, 35, 38, 0.9) !important;
      border-radius: 999px !important;
      display: inline-flex !important;
      font-size: 12px !important;
      height: 20px !important;
      justify-content: center !important;
      line-height: 1 !important;
      width: 20px !important;
    }

    .vp-copy-button__label {
      max-width: 0 !important;
      opacity: 0 !important;
      overflow: hidden !important;
      transition:
        max-width 160ms ease,
        opacity 100ms ease !important;
      white-space: nowrap !important;
    }

    .vp-copy-button:hover .vp-copy-button__label,
    .vp-copy-button:focus-visible .vp-copy-button__label,
    .vp-copy-button--loading .vp-copy-button__label,
    .vp-copy-button--sent .vp-copy-button__label,
    .vp-copy-button--error .vp-copy-button__label {
      max-width: 90px !important;
      opacity: 1 !important;
    }

    .vp-copy-button--loading {
      --vp-expanded-width: 100px;
      cursor: progress !important;
      gap: 6px !important;
      padding-right: 9px !important;
      width: var(--vp-expanded-width) !important;
    }

    .vp-copy-button--sent {
      --vp-expanded-width: 104px;
      background: rgba(29, 155, 85, 0.96) !important;
      gap: 6px !important;
      padding-right: 9px !important;
      width: var(--vp-expanded-width) !important;
    }

    .vp-copy-button--error {
      --vp-expanded-width: 146px;
      background: rgba(190, 38, 51, 0.96) !important;
      gap: 6px !important;
      padding-right: 9px !important;
      width: var(--vp-expanded-width) !important;
    }

    .vp-copy-button.vp-copy-button--error .vp-copy-button__label {
      max-width: 110px !important;
    }

    .vp-copy-button--expand-left:hover,
    .vp-copy-button--expand-left:focus-visible,
    .vp-copy-button--expand-left.vp-copy-button--loading,
    .vp-copy-button--expand-left.vp-copy-button--sent,
    .vp-copy-button--expand-left.vp-copy-button--error {
      flex-direction: row-reverse !important;
      padding-left: 13px !important;
      padding-right: 4px !important;
      transform:
        translateX(
          calc(var(--vp-compact-width) - var(--vp-expanded-width))
        )
        translateY(-1px)
        translateZ(0) !important;
    }

    @media (max-width: 520px) {
      .vp-copy-button {
        --vp-compact-width: 28px;
        height: 28px !important;
        min-height: 28px !important;
        padding: 3px !important;
        right: 7px !important;
        top: 7px !important;
        width: var(--vp-compact-width) !important;
      }

      .vp-copy-button:hover,
      .vp-copy-button:focus-visible,
      .vp-copy-button--loading,
      .vp-copy-button--sent {
        --vp-expanded-width: 110px;
        padding-right: 11px !important;
        width: var(--vp-expanded-width) !important;
      }

      .vp-copy-button--error {
        --vp-expanded-width: 144px;
        padding-right: 8px !important;
        width: var(--vp-expanded-width) !important;
      }
    }

    .vp-copy-button.vp-copy-button--dragging,
    .vp-copy-button.vp-copy-button--dragging:hover,
    .vp-copy-button.vp-copy-button--dragging:focus-visible {
      cursor: grabbing !important;
      flex-direction: row !important;
      gap: 0 !important;
      padding: 4px !important;
      transform: translateZ(0) !important;
      transition: none !important;
      width: var(--vp-compact-width) !important;
    }

    .vp-copy-button.vp-copy-button--dragging
      .vp-copy-button__label {
      max-width: 0 !important;
      opacity: 0 !important;
    }
  `;
  const PLAYER_SELECTOR = [
    "shreddit-player",
    "shreddit-player-2",
    "reddit-video-player",
    "[data-testid='video-player']",
    "[data-testid='post-media']",
    "[data-testid='videoPlayer']",
  ].join(",");
  const POST_SELECTOR = [
    "shreddit-post",
    "article",
    "[data-testid='post-container']",
  ].join(",");
  const X_MEDIA_SELECTOR = [
    "[data-testid='tweetPhoto']",
    "[data-testid='videoComponent']",
    "figure",
  ].join(",");

  const observedRoots = new WeakSet();
  const DRAG_THRESHOLD_PX = 5;
  let scanQueued = false;

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function compactButtonSize(button) {
    const styles = window.getComputedStyle(button);
    const compactWidth = Number.parseFloat(
      styles.getPropertyValue("--vp-compact-width")
    );
    const height = Number.parseFloat(styles.height);

    return {
      height: Number.isFinite(height) ? height : 30,
      width: Number.isFinite(compactWidth) ? compactWidth : 30,
    };
  }

  function setDraggedButtonPosition(button, container, left, top) {
    const containerRect = container.getBoundingClientRect();
    const size = compactButtonSize(button);
    const boundedLeft = clamp(
      left,
      0,
      Math.max(0, containerRect.width - size.width)
    );
    const boundedTop = clamp(
      top,
      0,
      Math.max(0, containerRect.height - size.height)
    );

    button.style.setProperty("left", `${boundedLeft}px`, "important");
    button.style.setProperty("right", "auto", "important");
    button.style.setProperty("top", `${boundedTop}px`, "important");
    button.classList.toggle(
      "vp-copy-button--expand-left",
      boundedLeft + size.width / 2 > containerRect.width / 2
    );
  }

  function moveButtonToPointer(button, container, event) {
    const containerRect = container.getBoundingClientRect();
    const size = compactButtonSize(button);
    setDraggedButtonPosition(
      button,
      container,
      event.clientX - containerRect.left - size.width / 2,
      event.clientY - containerRect.top - size.height / 2
    );
  }

  function enableButtonDragging(button, container) {
    let gesture = null;

    button.addEventListener("dragstart", (event) => {
      event.preventDefault();
    });

    button.addEventListener("pointerdown", (event) => {
      if (
        button.dataset.vpBusy === "true" ||
        (event.pointerType === "mouse" && event.button !== 0)
      ) {
        return;
      }

      event.stopPropagation();
      gesture = {
        dragging: false,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };

      try {
        button.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is a convenience; document-level pointer events
        // are not required while the pointer remains over the control.
      }
    });

    button.addEventListener("pointermove", (event) => {
      if (!gesture || event.pointerId !== gesture.pointerId) {
        return;
      }

      if (!gesture.dragging) {
        const distance = Math.hypot(
          event.clientX - gesture.startX,
          event.clientY - gesture.startY
        );
        if (distance < DRAG_THRESHOLD_PX) {
          return;
        }

        gesture.dragging = true;
        button.classList.add("vp-copy-button--dragging");
      }

      event.preventDefault();
      event.stopPropagation();
      moveButtonToPointer(button, container, event);
    });

    const finishGesture = (event) => {
      if (!gesture || event.pointerId !== gesture.pointerId) {
        return;
      }

      const completedGesture = gesture;
      gesture = null;

      if (completedGesture.dragging) {
        if (event.type === "pointerup") {
          moveButtonToPointer(button, container, event);
        }
        button.classList.remove("vp-copy-button--dragging");
        button.dataset.vpSuppressClick = "true";
        window.setTimeout(() => {
          delete button.dataset.vpSuppressClick;
        }, 0);
      }

      try {
        if (button.hasPointerCapture(event.pointerId)) {
          button.releasePointerCapture(event.pointerId);
        }
      } catch {
        // The browser may release capture before pointercancel.
      }
    };

    button.addEventListener("pointerup", finishGesture);
    button.addEventListener("pointercancel", finishGesture);
    button.addEventListener("lostpointercapture", finishGesture);

    if (typeof ResizeObserver === "function") {
      const resizeObserver = new ResizeObserver(() => {
        const left = Number.parseFloat(
          button.style.getPropertyValue("left")
        );
        const top = Number.parseFloat(
          button.style.getPropertyValue("top")
        );
        if (Number.isFinite(left) && Number.isFinite(top)) {
          setDraggedButtonPosition(button, container, left, top);
        }
      });
      resizeObserver.observe(container);
      button.vpResizeObserver = resizeObserver;
    }
  }

  function normalizeHTTPURL(value) {
    if (!value || value.startsWith("blob:") || value.startsWith("data:")) {
      return null;
    }

    try {
      const url = new URL(value, window.location.href);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return null;
      }
      return url.href;
    } catch {
      return null;
    }
  }

  function isXHostname(hostname) {
    const normalizedHostname = hostname.toLowerCase().replace(/\.$/, "");
    return (
      normalizedHostname === "x.com" ||
      normalizedHostname.endsWith(".x.com") ||
      normalizedHostname === "twitter.com" ||
      normalizedHostname.endsWith(".twitter.com")
    );
  }

  function canonicalXPostURL(value) {
    if (!value) {
      return null;
    }

    try {
      const url = new URL(value, window.location.href);
      if (
        (url.protocol !== "https:" && url.protocol !== "http:") ||
        !isXHostname(url.hostname)
      ) {
        return null;
      }

      const match = url.pathname.match(
        /^\/(?:([a-zA-Z0-9_]{1,15})|(i\/web))\/status\/(\d+)(?:\/video\/([1-9]\d*))?(?:\/|$)/
      );
      if (!match) {
        return null;
      }

      const accountPath = match[1] ?? match[2];
      const videoPath = match[4] ? `/video/${match[4]}` : "";
      return `https://x.com/${accountPath}/status/${match[3]}${videoPath}`;
    } catch {
      return null;
    }
  }

  function closestAcrossRoots(element, selector) {
    let current = element;

    while (current) {
      if (current instanceof Element && current.matches(selector)) {
        return current;
      }
      if (current.parentElement) {
        current = current.parentElement;
        continue;
      }

      const root = current.getRootNode?.();
      current = root instanceof ShadowRoot ? root.host : null;
    }

    return null;
  }

  function findButtonMount(element) {
    const player = closestAcrossRoots(element, PLAYER_SELECTOR);
    if (player) {
      return {
        container: player,
        mountRoot: player.shadowRoot ?? player,
      };
    }

    const root = element.getRootNode?.();
    if (root instanceof ShadowRoot) {
      return {
        container: root.host,
        mountRoot: root,
      };
    }

    const container =
      element.closest("figure, [data-click-id='media']") ??
      element.parentElement;
    return container ? { container, mountRoot: container } : null;
  }

  function ensureShadowStyles(root) {
    if (root.querySelector(`#${SHADOW_STYLE_ID}`)) {
      return;
    }

    const style = document.createElement("style");
    style.id = SHADOW_STYLE_ID;
    style.textContent = SHADOW_BUTTON_STYLES;
    root.append(style);
  }

  function existingButton(container) {
    const lightDOMButton = Array.from(container.children).find((child) =>
      child.classList.contains(BUTTON_CLASS)
    );
    return (
      container.shadowRoot?.querySelector(`.${BUTTON_CLASS}`) ??
      lightDOMButton ??
      null
    );
  }

  function deepFindVideo(root) {
    if (root instanceof HTMLVideoElement) {
      return root;
    }

    const directVideo = root.querySelector?.("video");
    if (directVideo) {
      return directVideo;
    }

    if (root.shadowRoot) {
      const shadowVideo = deepFindVideo(root.shadowRoot);
      if (shadowVideo) {
        return shadowVideo;
      }
    }

    const nestedPlayers = root.querySelectorAll?.(PLAYER_SELECTOR) ?? [];
    for (const player of nestedPlayers) {
      if (player.shadowRoot) {
        const nestedVideo = deepFindVideo(player.shadowRoot);
        if (nestedVideo) {
          return nestedVideo;
        }
      }
    }

    return null;
  }

  function findDirectMediaURL(container) {
    const video = deepFindVideo(container);
    const candidates = [];

    if (video) {
      candidates.push(video.currentSrc, video.src, video.getAttribute("src"));
      for (const source of video.querySelectorAll("source")) {
        candidates.push(source.src, source.getAttribute("src"));
      }
    }

    for (const attribute of ["src", "media-url", "video-url"]) {
      candidates.push(container.getAttribute?.(attribute));
    }

    const normalized = candidates
      .map(normalizeHTTPURL)
      .filter(Boolean);

    return (
      normalized.find((value) => {
        try {
          return new URL(value).hostname === "packaged-media.redd.it";
        } catch {
          return false;
        }
      }) ?? normalized[0] ?? null
    );
  }

  function findPostURL(container) {
    if (isXHostname(window.location.hostname)) {
      const directStatusLink = closestAcrossRoots(
        container,
        "a[href*='/status/']"
      );
      const directCandidate = canonicalXPostURL(directStatusLink?.href);
      if (
        directCandidate &&
        /\/video\/[1-9]\d*$/.test(directCandidate)
      ) {
        return directCandidate;
      }

      const mediaContainer = closestAcrossRoots(
        container,
        X_MEDIA_SELECTOR
      );
      if (mediaContainer) {
        const attachmentCandidates = Array.from(
          mediaContainer.querySelectorAll("a[href*='/status/']")
        )
          .map((link) => canonicalXPostURL(link.href))
          .filter(
            (candidate) =>
              candidate && /\/video\/[1-9]\d*$/.test(candidate)
          );
        const uniqueAttachmentCandidates = [
          ...new Set(attachmentCandidates),
        ];
        if (uniqueAttachmentCandidates.length === 1) {
          return uniqueAttachmentCandidates[0];
        }
      }
      if (directCandidate) {
        return directCandidate;
      }

      const post = closestAcrossRoots(
        container,
        "article[data-testid='tweet'], article"
      );
      if (post) {
        const statusLinks = Array.from(
          post.querySelectorAll("a[href*='/status/']")
        );
        const currentCandidate = canonicalXPostURL(
          window.location.href
        );
        if (
          currentCandidate &&
          /\/video\/[1-9]\d*$/.test(currentCandidate)
        ) {
          const currentStatusID =
            currentCandidate.match(/\/status\/(\d+)/)?.[1];
          const timestampLink = statusLinks.find((link) =>
            link.querySelector("time")
          );
          const articleCandidate = canonicalXPostURL(
            timestampLink?.href
          );
          const articleMatchesCurrentPost =
            articleCandidate?.match(/\/status\/(\d+)/)?.[1] ===
            currentStatusID;
          if (articleMatchesCurrentPost) {
            return currentCandidate;
          }
        }

        statusLinks.sort(
          (left, right) =>
            Number(Boolean(right.querySelector("time"))) -
            Number(Boolean(left.querySelector("time")))
        );

        for (const link of statusLinks) {
          const candidate = canonicalXPostURL(link.href);
          if (candidate) {
            return candidate;
          }
        }
      }

      return canonicalXPostURL(window.location.href);
    }

    const post = closestAcrossRoots(container, POST_SELECTOR);

    if (post) {
      for (const attribute of ["permalink", "data-permalink", "content-href"]) {
        const candidate = normalizeHTTPURL(post.getAttribute(attribute));
        if (candidate) {
          return candidate;
        }
      }

      const commentsLink = post.querySelector(
        "a[href*='/comments/'], a[data-testid='post-title']"
      );
      const candidate = normalizeHTTPURL(commentsLink?.href);
      if (candidate) {
        return candidate;
      }
    }

    if (window.location.pathname.includes("/comments/")) {
      return window.location.href;
    }

    return null;
  }

  function chooseSourceURL(container) {
    if (isXHostname(window.location.hostname)) {
      return findPostURL(container);
    }

    const directURL = findDirectMediaURL(container);

    if (directURL) {
      try {
        if (new URL(directURL).hostname === "packaged-media.redd.it") {
          return directURL;
        }
      } catch {
        // Fall through to the post URL.
      }
    }

    return findPostURL(container) ?? directURL;
  }

  function showFeedback(
    button,
    message,
    modifierClass,
    resetDelay = 1800
  ) {
    const label = button.querySelector(".vp-copy-button__label");
    if (!label) {
      return;
    }

    window.clearTimeout(button.vpFeedbackTimer);
    button.classList.remove(
      "vp-copy-button--loading",
      "vp-copy-button--sent",
      "vp-copy-button--error"
    );
    button.classList.add(modifierClass);
    label.textContent = message;
    button.setAttribute(
      "aria-busy",
      modifierClass === "vp-copy-button--loading" ? "true" : "false"
    );

    if (resetDelay === null) {
      return;
    }

    button.vpFeedbackTimer = window.setTimeout(() => {
      button.classList.remove(
        "vp-copy-button--loading",
        "vp-copy-button--sent",
        "vp-copy-button--error"
      );
      label.textContent = "Copy video";
      button.setAttribute("aria-busy", "false");
      button.title =
        "Click to copy the video, or drag this control to reposition it";
    }, resetDelay);
  }

  function errorFeedbackMessage(message) {
    const normalizedMessage = String(message ?? "").toLowerCase();

    if (/\b(private|protected)\b/.test(normalizedMessage)) {
      return "Private post";
    }
    if (
      /\b(no|without)\b.*\bvideo\b/.test(normalizedMessage) ||
      /\bdoes(?: not|n't|n’t) (?:contain|have)\b.*\bvideo\b/.test(
        normalizedMessage
      ) ||
      /\bunsupported\b.*\bvideo\b/.test(normalizedMessage)
    ) {
      return "No video";
    }
    if (
      /\b(unavailable|deleted)\b/.test(normalizedMessage) ||
      /\bnot found\b/.test(normalizedMessage) ||
      /\bdoes not exist\b/.test(normalizedMessage)
    ) {
      return "Unavailable";
    }

    return "Try again";
  }

  function makeButton(container) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = BUTTON_CLASS;
    button.setAttribute(
      "aria-label",
      "Click to download and copy this video, or drag to reposition"
    );
    button.title =
      "Click to copy the video, or drag this control to reposition it";

    const badge = document.createElement("span");
    badge.className = "vp-copy-button__badge";
    badge.textContent = "V";
    badge.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "vp-copy-button__label";
    label.textContent = "Copy video";

    button.append(badge, label);
    button.addEventListener("mousedown", (event) => event.stopPropagation());
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (button.dataset.vpSuppressClick === "true") {
        delete button.dataset.vpSuppressClick;
        return;
      }

      if (button.dataset.vpBusy === "true") {
        return;
      }

      const sourceURL = chooseSourceURL(container);
      if (!sourceURL) {
        if (isXHostname(window.location.hostname)) {
          button.title =
            "VideoPaste couldn't identify a public X post for this video.";
          showFeedback(
            button,
            "Post unavailable",
            "vp-copy-button--error"
          );
        } else {
          showFeedback(
            button,
            "Open post first",
            "vp-copy-button--error"
          );
        }
        return;
      }

      button.dataset.vpBusy = "true";
      button.disabled = true;
      showFeedback(
        button,
        "Loading…",
        "vp-copy-button--loading",
        null
      );

      try {
        const response = await browser.runtime.sendMessage({
          type: "vp-download-and-copy",
          url: sourceURL,
        });

        if (!response?.ok) {
          throw new Error(
            response?.error ?? "The video could not be copied."
          );
        }

        button.title = response.fileName
          ? `Copied ${response.fileName}`
          : "Copied to the clipboard";
        showFeedback(button, "Copied!", "vp-copy-button--sent", 2200);
      } catch (error) {
        button.title =
          error?.message ?? "The video could not be copied.";
        showFeedback(
          button,
          errorFeedbackMessage(error?.message),
          "vp-copy-button--error",
          3200
        );
      } finally {
        button.disabled = false;
        delete button.dataset.vpBusy;
      }
    });
    enableButtonDragging(button, container);

    return button;
  }

  function attachButton(element) {
    const mount = findButtonMount(element);
    if (!mount) {
      return;
    }

    const { container, mountRoot } = mount;
    container.dataset.vpButtonAttached = "true";
    container.classList.add(POSITION_CLASS);

    if (mountRoot instanceof ShadowRoot) {
      ensureShadowStyles(mountRoot);
    }

    const button = existingButton(container) ?? makeButton(container);
    if (button.parentNode !== mountRoot) {
      mountRoot.append(button);
    }
  }

  function scan(root) {
    root.querySelectorAll?.("video").forEach(attachButton);
    root.querySelectorAll?.(PLAYER_SELECTOR).forEach((player) => {
      attachButton(player);
      if (player.shadowRoot) {
        watchRoot(player.shadowRoot);
      }
    });
  }

  function queueScan() {
    if (scanQueued) {
      return;
    }

    scanQueued = true;
    window.requestAnimationFrame(() => {
      scanQueued = false;
      scan(document);
    });
  }

  function watchRoot(root) {
    if (observedRoots.has(root)) {
      return;
    }
    observedRoots.add(root);
    scan(root);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) {
            continue;
          }

          if (node.matches("video")) {
            attachButton(node);
          }
          if (node.matches(PLAYER_SELECTOR)) {
            attachButton(node);
            if (node.shadowRoot) {
              watchRoot(node.shadowRoot);
            }
          }

          node.querySelectorAll?.("video").forEach(attachButton);
          node.querySelectorAll?.(PLAYER_SELECTOR).forEach((player) => {
            attachButton(player);
            if (player.shadowRoot) {
              watchRoot(player.shadowRoot);
            }
          });
        }
      }
      queueScan();
    });

    observer.observe(
      root instanceof Document ? root.documentElement : root,
      {
        childList: true,
        subtree: true,
      }
    );
  }

  watchRoot(document);
})();
