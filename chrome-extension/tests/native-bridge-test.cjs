const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function event() {
  const listeners = [];
  return {
    addListener(listener) {
      listeners.push(listener);
    },
    emit(...args) {
      for (const listener of listeners) {
        listener(...args);
      }
    },
  };
}

function port(name = "") {
  return {
    disconnected: false,
    messages: [],
    name,
    onDisconnect: event(),
    onMessage: event(),
    disconnect() {
      if (this.disconnected) {
        return;
      }
      this.disconnected = true;
      this.onDisconnect.emit();
    },
    postMessage(message) {
      if (this.disconnected) {
        throw new Error("Port is disconnected.");
      }
      this.messages.push(JSON.parse(JSON.stringify(message)));
    },
  };
}

const script = fs.readFileSync(
  path.resolve(__dirname, "../background/native-bridge.js"),
  "utf8"
);
const onConnect = event();
const nativeConnections = [];
let connectNativeError = null;
const runtime = {
  lastError: undefined,
  onConnect,
  connectNative(hostName) {
    if (connectNativeError) {
      throw connectNativeError;
    }
    const nativePort = port();
    nativeConnections.push({ hostName, port: nativePort });
    return nativePort;
  },
};

vm.runInNewContext(script, { chrome: { runtime } });

const ignoredPort = port("unrelated-port");
onConnect.emit(ignoredPort);
ignoredPort.onMessage.emit({ type: "vp-download-and-copy" });
assert.equal(nativeConnections.length, 0);

const clientPort = port("videopaste-download");
onConnect.emit(clientPort);
clientPort.onMessage.emit({
  type: "vp-download-and-copy",
  url: "https://packaged-media.redd.it/example/video.mp4",
});
assert.equal(nativeConnections.length, 1);
assert.equal(
  nativeConnections[0].hostName,
  "com.grantwasil.videopaste"
);
assert.deepEqual(nativeConnections[0].port.messages, [
  {
    action: "downloadAndCopy",
    url: "https://packaged-media.redd.it/example/video.mp4",
  },
]);

nativeConnections[0].port.onMessage.emit({
  ok: true,
  status: "copied",
  fileName: "reddit-video.mp4",
});
assert.deepEqual(clientPort.messages, [
  {
    ok: true,
    status: "copied",
    fileName: "reddit-video.mp4",
  },
]);
assert.equal(nativeConnections[0].port.disconnected, true);

const invalidClientPort = port("videopaste-download");
onConnect.emit(invalidClientPort);
invalidClientPort.onMessage.emit({ type: "unsupported" });
assert.deepEqual(invalidClientPort.messages, [
  {
    ok: false,
    error: "The browser sent an unsupported VideoPaste request.",
  },
]);
assert.equal(nativeConnections.length, 1);

// Starts a request and returns the tab's port and the helper's port.
function startRequest() {
  const tabPort = port("videopaste-download");
  onConnect.emit(tabPort);
  tabPort.onMessage.emit({
    type: "vp-download-and-copy",
    url: "https://www.reddit.com/r/videos/comments/example/",
  });
  return {
    tabPort,
    helperPort: nativeConnections[nativeConnections.length - 1].port,
  };
}

// A helper failure keeps the helper's code and prose.
const codedFailure = startRequest();
codedFailure.helperPort.onMessage.emit({
  ok: false,
  status: "error",
  error: "This post is private. VideoPaste can only download public posts.",
  code: "private_post",
});
assert.deepEqual(codedFailure.tabPort.messages, [
  {
    ok: false,
    error:
      "This post is private. VideoPaste can only download public posts.",
    code: "private_post",
  },
]);

// A code this extension has never heard of is still the helper's to send.
const futureFailure = startRequest();
futureFailure.helperPort.onMessage.emit({
  ok: false,
  status: "error",
  error: "Something new went wrong.",
  code: "some_future_code",
});
assert.deepEqual(futureFailure.tabPort.messages, [
  {
    ok: false,
    error: "Something new went wrong.",
    code: "some_future_code",
  },
]);

// An older helper sends no code, and the bridge must not invent one.
const olderHelperFailure = startRequest();
olderHelperFailure.helperPort.onMessage.emit({
  ok: false,
  status: "error",
  error: "The helper rejected the URL.",
});
assert.deepEqual(olderHelperFailure.tabPort.messages, [
  {
    ok: false,
    error: "The helper rejected the URL.",
  },
]);

// The helper's port closes before any response: the helper is unreachable.
const unreachable = startRequest();
runtime.lastError = { message: "Native host is missing." };
unreachable.helperPort.onDisconnect.emit();
runtime.lastError = undefined;
assert.deepEqual(unreachable.tabPort.messages, [
  {
    ok: false,
    error: "Native host is missing.",
    code: "helper_unreachable",
  },
]);

// The browser refuses to open a port to the helper at all.
const connectionsBeforeRefusal = nativeConnections.length;
connectNativeError = new Error("Access to the native host is forbidden.");
const refusedTabPort = port("videopaste-download");
onConnect.emit(refusedTabPort);
refusedTabPort.onMessage.emit({
  type: "vp-download-and-copy",
  url: "https://www.reddit.com/r/videos/comments/example/",
});
connectNativeError = null;
assert.equal(nativeConnections.length, connectionsBeforeRefusal);
assert.deepEqual(refusedTabPort.messages, [
  {
    ok: false,
    error: "Access to the native host is forbidden.",
    code: "helper_unreachable",
  },
]);

const closedClientPort = port("videopaste-download");
onConnect.emit(closedClientPort);
closedClientPort.onMessage.emit({
  type: "vp-download-and-copy",
  url: "https://www.reddit.com/r/videos/comments/slow/",
});
const slowNativePort =
  nativeConnections[nativeConnections.length - 1].port;
closedClientPort.disconnect();
assert.equal(
  slowNativePort.disconnected,
  false,
  "Closing the Reddit tab must not cancel an in-flight native download."
);
slowNativePort.onMessage.emit({
  ok: true,
  status: "copied",
  fileName: "slow-video.mp4",
});
assert.equal(slowNativePort.disconnected, true);

console.log("Chrome native port bridge test passed.");
