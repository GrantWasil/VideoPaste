"use strict";

const NATIVE_HOST_NAME = "com.grantwasil.videopaste";
const CLIENT_PORT_NAME = "videopaste-download";

function normalizeResponse(response) {
  if (!response?.ok) {
    return {
      ok: false,
      error:
        response?.error ?? "The native helper could not copy the video.",
    };
  }
  return response;
}

function connectionError(error) {
  return {
    ok: false,
    error:
      error?.message ??
      "The browser could not reach the VideoPaste helper.",
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
        finish(normalizeResponse(response));
      });
      nativePort.onDisconnect.addListener(() => {
        const error = chrome.runtime.lastError;
        if (!completed) {
          finish(connectionError(error));
        }
      });
      nativePort.postMessage({
        action: "downloadAndCopy",
        url: message.url,
      });
    } catch (error) {
      finish(connectionError(error));
    }
  });
});
