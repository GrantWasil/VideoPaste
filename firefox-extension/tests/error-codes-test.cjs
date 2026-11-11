// The helper names each kind of failure with a code, and the content script
// gives each code its label. The two lists are in different languages, so
// this test is what ties them: a code the helper can send must have a row in
// the content script, or the button would say "Try again" for it without
// anyone having decided that.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

// Each case of the helper's `NativeErrorCode`, as the string it is sent as.
function helperCodes() {
  const enumBody = read("Sources/VideoPasteCore/NativeMessaging.swift").match(
    /\benum NativeErrorCode\b[^{]*\{([\s\S]*?)\n\}/
  )?.[1];
  assert.ok(enumBody, "NativeErrorCode was not found in the helper's source");

  return [...enumBody.matchAll(/^\s*case\s+(.+)$/gm)].flatMap(([, cases]) =>
    cases.split(",").map((declaration) => {
      const [name, rawValue] = declaration.split("=").map((part) => part.trim());
      return rawValue ? rawValue.replaceAll('"', "") : name;
    })
  );
}

// Each code the content script's failure table has a row for.
function contentScriptCodes() {
  const table = read("firefox-extension/content/videopaste.js").match(
    /\bconst FAILURES = new Map\(\[([\s\S]*?)\n  \]\);/
  )?.[1];
  assert.ok(table, "The failure table was not found in the content script");

  return [...table.matchAll(/\[\s*"([^"]+)"\s*,/g)].map(([, code]) => code);
}

const sentByHelper = helperCodes();
const labelled = contentScriptCodes();

// Guards against a parse that finds nothing and so proves nothing.
assert.ok(sentByHelper.includes("failed"), "The helper's codes were misread");
assert.ok(labelled.includes("failed"), "The content script's codes were misread");

assert.deepEqual(
  sentByHelper.filter((code) => !labelled.includes(code)),
  [],
  "Every code the helper can send needs a row in the content script's failure table"
);

console.log("Error code vocabulary test passed.");
