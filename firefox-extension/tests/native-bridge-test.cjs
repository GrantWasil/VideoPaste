const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

async function run() {
  const nativeCalls = [];
  let messageListener;
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
          return Promise.resolve({
            ok: true,
            status: "copied",
            fileName: "reddit-video.mp4",
          });
        },
      },
    },
  };

  const script = fs.readFileSync(
    path.resolve(__dirname, "../background/native-bridge.js"),
    "utf8"
  );
  vm.runInNewContext(script, context);

  const response = await messageListener({
    type: "vp-download-and-copy",
    url: "https://packaged-media.redd.it/example/video.mp4",
  });

  assert.equal(nativeCalls.length, 1);
  assert.equal(nativeCalls[0].hostName, "com.grantwasil.videopaste");
  assert.deepEqual(
    JSON.parse(JSON.stringify(nativeCalls[0].message)),
    {
      action: "downloadAndCopy",
      url: "https://packaged-media.redd.it/example/video.mp4",
    }
  );
  assert.equal(response.ok, true);
  assert.equal(response.status, "copied");

  console.log("Firefox native bridge test passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
