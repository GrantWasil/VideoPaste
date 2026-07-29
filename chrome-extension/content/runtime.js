"use strict";

(() => {
  const portName = "videopaste-download";

  function disconnect(port) {
    try {
      port.disconnect();
    } catch {
      // The service worker may already have closed the port.
    }
  }

  globalThis.videoPasteRuntime = Object.freeze({
    sendMessage(message) {
      return new Promise((resolve, reject) => {
        const port = chrome.runtime.connect({ name: portName });
        let settled = false;

        port.onMessage.addListener((response) => {
          if (settled) {
            return;
          }
          settled = true;
          resolve(response);
          disconnect(port);
        });

        port.onDisconnect.addListener(() => {
          if (settled) {
            return;
          }
          settled = true;
          const error = chrome.runtime.lastError;
          reject(
            new Error(
              error?.message ??
                "The VideoPaste extension service worker disconnected."
            )
          );
        });

        try {
          port.postMessage(message);
        } catch (error) {
          settled = true;
          reject(error);
          disconnect(port);
        }
      });
    },
  });
})();
