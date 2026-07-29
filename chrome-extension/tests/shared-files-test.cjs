const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const chromeRoot = path.resolve(__dirname, "..");
const firefoxRoot = path.resolve(chromeRoot, "../firefox-extension");
const sharedFiles = [
  "content/videopaste.css",
  "content/videopaste.js",
  "icons/icon-48.png",
];

for (const relativePath of sharedFiles) {
  assert.deepEqual(
    fs.readFileSync(path.join(chromeRoot, relativePath)),
    fs.readFileSync(path.join(firefoxRoot, relativePath)),
    `Shared extension file drifted: ${relativePath}`
  );
}

const expectedIconSizes = [16, 32, 48, 128];
for (const size of expectedIconSizes) {
  const icon = fs.readFileSync(
    path.join(chromeRoot, `icons/icon-${size}.png`)
  );
  assert.equal(icon.readUInt32BE(16), size);
  assert.equal(icon.readUInt32BE(20), size);
}

console.log("Shared extension files test passed.");
