"use strict";

const NATIVE_HOST_NAME = "com.grantwasil.videopaste";
const CLIENT_PORT_NAME = "videopaste-download";

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

function disconnect(port) {
  try {
    port.disconnect();
  } catch {
    // A browser or native port may already be closed.
  }
}

chrome.runtime.onConnect.addListener((clientPort) => {
  if (clientPort.name !== CLIENT_PORT_NAME) {
    return;
  }

  let completed = false;
  let nativePort = null;
  let requestStarted = false;

  function finish(response) {
    if (completed) {
      return;
    }
    completed = true;

    try {
      clientPort.postMessage(response);
    } catch {
      // The Reddit tab may have closed while the native helper worked.
    }

    if (nativePort) {
      disconnect(nativePort);
    }
  }

  clientPort.onMessage.addListener((message) => {
    if (requestStarted) {
      finish({
        ok: false,
        error: "This VideoPaste request is already being processed.",
      });
      return;
    }
    if (message?.type !== "vp-download-and-copy") {
      finish({
        ok: false,
        error: "The browser sent an unsupported VideoPaste request.",
      });
      return;
    }
    requestStarted = true;

    try {
      nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);
      nativePort.onMessage.addListener((response) => {
        finish(response?.ok ? response : helperFailure(response));
      });
      nativePort.onDisconnect.addListener(() => {
        const error = chrome.runtime.lastError;
        if (!completed) {
          finish(helperUnreachable(error));
        }
      });
      nativePort.postMessage({
        action: "downloadAndCopy",
        url: message.url,
      });
    } catch (error) {
      finish(helperUnreachable(error));
    }
  });
});
