"use strict";

const NATIVE_HOST_NAME = "com.grantwasil.videopaste";

browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== "vp-download-and-copy") {
    return undefined;
  }

  return browser.runtime
    .sendNativeMessage(NATIVE_HOST_NAME, {
      action: "downloadAndCopy",
      url: message.url,
    })
    .then((response) => {
      if (!response?.ok) {
        return {
          ok: false,
          error:
            response?.error ??
            "The native helper could not copy the video.",
        };
      }
      return response;
    })
    .catch((error) => ({
      ok: false,
      error:
        error?.message ??
        "The browser could not reach the VideoPaste helper.",
    }));
});
