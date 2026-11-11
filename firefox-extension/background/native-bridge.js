"use strict";

const NATIVE_HOST_NAME = "com.grantwasil.videopaste";

// A failure the helper reported. Its error code is the helper's to choose:
// it is relayed as sent, and an older helper that sends none gets none.
function helperFailure(response) {
  const failure = {
    ok: false,
    error:
      response?.error ?? "The native helper could not copy the video.",
  };
  if (typeof response?.code === "string") {
    failure.code = response.code;
  }
  return failure;
}

// The one failure raised here rather than by the helper, so the one code
// this script sets itself.
function helperUnreachable(error) {
  return {
    ok: false,
    error:
      error?.message ??
      "The browser could not reach the VideoPaste helper.",
    code: "helper_unreachable",
  };
}

browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== "vp-download-and-copy") {
    return undefined;
  }

  return browser.runtime
    .sendNativeMessage(NATIVE_HOST_NAME, {
      action: "downloadAndCopy",
      url: message.url,
    })
    .then(
      (response) => (response?.ok ? response : helperFailure(response)),
      helperUnreachable
    );
});
