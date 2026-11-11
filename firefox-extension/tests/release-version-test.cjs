"use strict";

// One tag describes one release: the Firefox extension, the Chrome extension
// and the macOS app carry the same version, and the README installs that
// release. The Firefox manifest is the reference because the release workflow
// compares it with the tag.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "../..");

function readText(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function readJSON(relativePath) {
  return JSON.parse(readText(relativePath));
}

function plistString(plist, key) {
  const match = plist.match(
    new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`)
  );
  return match?.[1];
}

const releaseVersion = readJSON("firefox-extension/manifest.json").version;
assert.match(
  releaseVersion,
  /^\d+\.\d+\.\d+$/,
  "firefox-extension/manifest.json must record a three-part version"
);

const recorded = {};
for (const extension of ["firefox-extension", "chrome-extension"]) {
  const lock = readJSON(`${extension}/package-lock.json`);
  recorded[`${extension}/manifest.json`] = readJSON(
    `${extension}/manifest.json`
  ).version;
  recorded[`${extension}/package.json`] = readJSON(
    `${extension}/package.json`
  ).version;
  recorded[`${extension}/package-lock.json`] = lock.version;
  recorded[`${extension}/package-lock.json (root package)`] =
    lock.packages[""].version;
}

const infoPlist = readText("App/Info.plist");
recorded["App/Info.plist CFBundleShortVersionString"] = plistString(
  infoPlist,
  "CFBundleShortVersionString"
);

const badge = readText("README.md").match(
  /releases\/download\/v([^/]+)\/videopaste-firefox-([^"/]+)\.xpi/
);
assert.ok(badge, "README.md must link its Firefox install badge to a release XPI");
recorded["README.md Firefox badge tag"] = badge[1];
recorded["README.md Firefox badge XPI"] = badge[2];

const mismatches = Object.entries(recorded)
  .filter(([, version]) => version !== releaseVersion)
  .map(([place, version]) => `  ${place}: ${version}`);
assert.deepEqual(
  mismatches,
  [],
  `Every recorded version must be ${releaseVersion}, but these differ:\n${mismatches.join("\n")}`
);

assert.match(
  plistString(infoPlist, "CFBundleVersion") ?? "",
  /^[1-9]\d*$/,
  "App/Info.plist CFBundleVersion must be a whole build number"
);

console.log(`Release version test passed (${releaseVersion}).`);
