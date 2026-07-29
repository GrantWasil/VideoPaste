const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const extensionRoot = path.resolve(__dirname, "..");
const firefoxRoot = path.resolve(extensionRoot, "../firefox-extension");
const manifest = JSON.parse(
  fs.readFileSync(path.join(extensionRoot, "manifest.json"), "utf8")
);
const firefoxManifest = JSON.parse(
  fs.readFileSync(path.join(firefoxRoot, "manifest.json"), "utf8")
);

function chromeExtensionID(key) {
  const digest = crypto
    .createHash("sha256")
    .update(Buffer.from(key, "base64"))
    .digest("hex")
    .slice(0, 32);

  return Array.from(digest, (value) =>
    String.fromCharCode("a".charCodeAt(0) + Number.parseInt(value, 16))
  ).join("");
}

assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.minimum_chrome_version, "105");
assert.deepEqual(manifest.background, {
  service_worker: "background/native-bridge.js",
});
assert.deepEqual(manifest.permissions, ["nativeMessaging"]);
assert.equal("browser_specific_settings" in manifest, false);
assert.deepEqual(manifest.content_scripts, firefoxManifest.content_scripts);
for (const field of ["name", "version", "description"]) {
  assert.equal(manifest[field], firefoxManifest[field]);
}
assert.equal(
  chromeExtensionID(manifest.key),
  "okkpnnbniecihdbgfndcnknjeoajbhnf"
);

const referencedFiles = [
  manifest.background.service_worker,
  ...Object.values(manifest.icons),
  ...manifest.content_scripts.flatMap((contentScript) => [
    ...(contentScript.css ?? []),
    ...(contentScript.js ?? []),
  ]),
];

for (const relativePath of referencedFiles) {
  assert.equal(
    fs.existsSync(path.join(extensionRoot, relativePath)),
    true,
    `Manifest file is missing: ${relativePath}`
  );
}

console.log("Chrome manifest test passed.");
