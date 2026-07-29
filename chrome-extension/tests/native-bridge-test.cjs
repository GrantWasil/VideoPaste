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
const runtime = {
  lastError: undefined,
  onConnect,
  connectNative(hostName) {
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

const failingClientPort = port("videopaste-download");
onConnect.emit(failingClientPort);
failingClientPort.onMessage.emit({
  type: "vp-download-and-copy",
  url: "https://www.reddit.com/r/videos/comments/example/",
});
const failingNativePort = nativeConnections[1].port;
runtime.lastError = { message: "Native host is missing." };
failingNativePort.onDisconnect.emit();
runtime.lastError = undefined;
assert.deepEqual(failingClientPort.messages, [
  {
    ok: false,
    error: "Native host is missing.",
  },
]);

const closedClientPort = port("videopaste-download");
onConnect.emit(closedClientPort);
closedClientPort.onMessage.emit({
  type: "vp-download-and-copy",
  url: "https://www.reddit.com/r/videos/comments/slow/",
});
const slowNativePort = nativeConnections[2].port;
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
