const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const script = fs.readFileSync(
  path.resolve(__dirname, "../background/native-bridge.js"),
  "utf8"
);
const requestMessage = {
  type: "vp-download-and-copy",
  url: "https://packaged-media.redd.it/example/video.mp4",
};

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

async function run() {
  const nativeCalls = [];
  let messageListener;
  let nativeError = null;
  let nativeResponse = {
    ok: true,
    status: "copied",
    fileName: "reddit-video.mp4",
  };
  const context = {
    browser: {
      runtime: {
        onMessage: {
          addListener(listener) {
            messageListener = listener;
          },
        },
        sendNativeMessage(hostName, message) {
          nativeCalls.push({ hostName, message });
          return nativeError
            ? Promise.reject(nativeError)
            : Promise.resolve(nativeResponse);
        },
      },
    },
  };

  vm.runInNewContext(script, context);

  assert.equal(
    messageListener({ type: "unrelated-message" }),
    undefined
  );
  assert.equal(nativeCalls.length, 0);

  const response = await messageListener(requestMessage);
  assert.equal(nativeCalls.length, 1);
  assert.equal(nativeCalls[0].hostName, "com.grantwasil.videopaste");
  assert.deepEqual(plain(nativeCalls[0].message), {
    action: "downloadAndCopy",
    url: requestMessage.url,
  });
  assert.equal(response.ok, true);
  assert.equal(response.status, "copied");

  nativeResponse = {
    ok: false,
    status: "error",
    error: "The helper rejected the URL.",
  };
  assert.deepEqual(
    plain(await messageListener(requestMessage)),
    {
      ok: false,
      error: "The helper rejected the URL.",
    }
  );

  nativeError = new Error("Native host is missing.");
  assert.deepEqual(
    plain(await messageListener(requestMessage)),
    {
      ok: false,
      error: "Native host is missing.",
    }
  );

  console.log("Firefox native bridge test passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
