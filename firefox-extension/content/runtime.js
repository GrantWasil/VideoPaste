"use strict";

globalThis.videoPasteRuntime = Object.freeze({
  sendMessage(message) {
    return browser.runtime.sendMessage(message);
  },
});
