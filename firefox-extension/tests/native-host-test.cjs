const assert = require("node:assert/strict");
const path = require("node:path");
const { spawn } = require("node:child_process");

async function run() {
  const defaultHostPath = path.resolve(
    __dirname,
    "../../dist/VideoPaste.app/Contents/MacOS/VideoPasteNativeHost"
  );
  const hostPath = process.argv[2] ?? defaultHostPath;
  const liveRedditURL = process.env.REDDIT_SAMPLE_URL;
  const requestPayload = Buffer.from(
    JSON.stringify({
      action: "downloadAndCopy",
      url:
        liveRedditURL ??
        "https://example.com/not-a-reddit-video.mp4",
    })
  );
  const requestHeader = Buffer.alloc(4);
  requestHeader.writeUInt32LE(requestPayload.length);

  const child = spawn(hostPath, [], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  const outputChunks = [];
  const errorChunks = [];
  child.stdout.on("data", (chunk) => outputChunks.push(chunk));
  child.stderr.on("data", (chunk) => errorChunks.push(chunk));

  child.stdin.end(Buffer.concat([requestHeader, requestPayload]));
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });

  assert.equal(
    exitCode,
    0,
    Buffer.concat(errorChunks).toString("utf8")
  );

  const output = Buffer.concat(outputChunks);
  assert.ok(output.length >= 4);
  const responseLength = output.readUInt32LE(0);
  assert.equal(responseLength, output.length - 4);

  const response = JSON.parse(output.subarray(4).toString("utf8"));
  if (liveRedditURL) {
    assert.equal(response.ok, true, response.error);
    assert.equal(response.status, "copied");
    assert.match(response.fileName, /\.mp4$/i);
  } else {
    assert.equal(response.ok, false);
    assert.equal(response.status, "error");
    assert.match(response.error, /video post links/i);
  }

  console.log(
    liveRedditURL
      ? `Native host live download test passed: ${response.fileName}`
      : "Native host protocol test passed."
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
