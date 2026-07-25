"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const extensionDirectory = path.resolve(__dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(extensionDirectory, "manifest.json"), "utf8")
);
const packageMetadata = JSON.parse(
  fs.readFileSync(path.join(extensionDirectory, "package.json"), "utf8")
);
const amoMetadata = JSON.parse(
  fs.readFileSync(path.join(extensionDirectory, "amo-metadata.json"), "utf8")
);

assert.equal(manifest.manifest_version, 3);
assert.equal(
  manifest.homepage_url,
  "https://github.com/GrantWasil/VideoPaste"
);
assert.equal(
  manifest.version,
  packageMetadata.version,
  "manifest.json and package.json versions must stay in sync"
);

const geckoSettings = manifest.browser_specific_settings?.gecko;
assert.ok(geckoSettings, "Firefox-specific manifest settings are required");
assert.match(
  geckoSettings.id,
  /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/,
  "Manifest V3 signing requires a stable Gecko extension ID"
);
assert.ok(
  Number.parseFloat(geckoSettings.strict_min_version) >= 140,
  "Firefox 140+ is required for built-in data-transmission consent"
);
assert.deepEqual(
  geckoSettings.data_collection_permissions,
  {
    required: ["browsingActivity", "websiteContent"],
  },
  "Native messaging must disclose the Reddit URL and media metadata sent to the local helper"
);

assert.deepEqual(
  manifest.permissions,
  ["nativeMessaging"],
  "The extension should request only its required nativeMessaging permission"
);

const nativeHostInstaller = fs.readFileSync(
  path.resolve(extensionDirectory, "../scripts/install-videopaste-native-host.sh"),
  "utf8"
);
assert.match(
  nativeHostInstaller,
  new RegExp(
    `"${geckoSettings.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`
  ),
  "The native host allowed_extensions entry must match the Gecko extension ID"
);
assert.match(amoMetadata.version?.approval_notes, /native host/i);
assert.match(amoMetadata.version?.approval_notes, /PRIVACY\.md/);

const contentScripts = manifest.content_scripts;
assert.equal(contentScripts.length, 1);
assert.deepEqual(contentScripts[0].matches, [
  "*://reddit.com/*",
  "*://*.reddit.com/*",
]);

for (const relativePath of [
  ...Object.values(manifest.icons),
  ...manifest.background.scripts,
  ...contentScripts[0].css,
  ...contentScripts[0].js,
]) {
  assert.ok(
    fs.existsSync(path.join(extensionDirectory, relativePath)),
    `Manifest entry does not exist: ${relativePath}`
  );
}

console.log("Firefox manifest policy test passed.");
