"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const extensionDirectory = path.resolve(__dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(extensionDirectory, "manifest.json"), "utf8")
);
const amoMetadata = JSON.parse(
  fs.readFileSync(path.join(extensionDirectory, "amo-metadata.json"), "utf8")
);

assert.equal(manifest.manifest_version, 3);
assert.equal(
  manifest.homepage_url,
  "https://github.com/GrantWasil/VideoPaste"
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
  "Native messaging must disclose the post links and media URLs sent to the local helper"
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
const approvalNotes = amoMetadata.version?.approval_notes;
assert.match(approvalNotes, /native host/i);
assert.match(approvalNotes, /PRIVACY\.md/);
assert.ok(
  approvalNotes.includes(
    "the video's media URL on Reddit, or the post link on X/Twitter"
  ),
  "The approval notes must say what is sent to the native host for each site"
);
assert.ok(
  approvalNotes.includes(
    "yt-dlp is required for all Reddit and X/Twitter copying"
  ),
  "The approval notes must state the yt-dlp requirement without exceptions"
);
assert.doesNotMatch(
  approvalNotes,
  /packaged-media|without yt-dlp/i,
  "No Reddit copy works without yt-dlp, so the approval notes must not offer one"
);

const contentScripts = manifest.content_scripts;
assert.equal(contentScripts.length, 1);
assert.deepEqual(contentScripts[0].matches, [
  "*://reddit.com/*",
  "*://*.reddit.com/*",
  "*://x.com/*",
  "*://*.x.com/*",
  "*://twitter.com/*",
  "*://*.twitter.com/*",
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
