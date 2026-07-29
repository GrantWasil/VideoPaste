const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "videopaste-native-manifests-")
);
const chromeProductDirectories = [
  "Google/Chrome",
  "Google/Chrome Beta",
  "Google/Chrome Dev",
  "Google/Chrome Canary",
  "Google/Chrome for Testing",
  "Google/ChromeForTesting",
];

try {
  const appPath = path.join(temporaryRoot, "VideoPaste.app");
  const hostPath = path.join(
    appPath,
    "Contents/MacOS/VideoPasteNativeHost"
  );
  const applicationSupportPath = path.join(
    temporaryRoot,
    "Application Support"
  );
  fs.mkdirSync(path.dirname(hostPath), { recursive: true });
  fs.writeFileSync(hostPath, "", { mode: 0o755 });

  const installerPath = path.resolve(
    __dirname,
    "../../scripts/install-videopaste-native-host.sh"
  );
  const result = spawnSync("zsh", [installerPath, appPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      VIDEOPASTE_APPLICATION_SUPPORT_DIR: applicationSupportPath,
    },
  });
  assert.equal(result.status, 0, result.stderr);

  const firefoxManifest = JSON.parse(
    fs.readFileSync(
      path.join(
        applicationSupportPath,
        "Mozilla/NativeMessagingHosts/com.grantwasil.videopaste.json"
      ),
      "utf8"
    )
  );
  const chromeManifests = chromeProductDirectories.map(
    (productDirectory) =>
      JSON.parse(
        fs.readFileSync(
          path.join(
            applicationSupportPath,
            productDirectory,
            "NativeMessagingHosts/com.grantwasil.videopaste.json"
          ),
          "utf8"
        )
      )
  );

  for (const manifest of [firefoxManifest, ...chromeManifests]) {
    assert.equal(manifest.name, "com.grantwasil.videopaste");
    assert.equal(manifest.type, "stdio");
    assert.equal(path.isAbsolute(manifest.path), true);
    assert.equal(
      fs.realpathSync(manifest.path),
      fs.realpathSync(hostPath)
    );
  }
  assert.deepEqual(firefoxManifest.allowed_extensions, [
    "videopaste@grantwasil",
  ]);
  assert.equal("allowed_origins" in firefoxManifest, false);
  for (const chromeManifest of chromeManifests) {
    assert.deepEqual(chromeManifest.allowed_origins, [
      "chrome-extension://imfheadlgpfgpaiemfciehhbjkbhmjfl/",
      "chrome-extension://okkpnnbniecihdbgfndcnknjeoajbhnf/",
    ]);
    assert.equal("allowed_extensions" in chromeManifest, false);
  }

  const overrideApplicationSupportPath = path.join(
    temporaryRoot,
    "Override Application Support"
  );
  const overrideExtensionID = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const overrideResult = spawnSync(
    "zsh",
    [installerPath, appPath, overrideExtensionID],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        VIDEOPASTE_APPLICATION_SUPPORT_DIR:
          overrideApplicationSupportPath,
      },
    }
  );
  assert.equal(overrideResult.status, 0, overrideResult.stderr);
  const overrideChromeManifest = JSON.parse(
    fs.readFileSync(
      path.join(
        overrideApplicationSupportPath,
        "Google/Chrome/NativeMessagingHosts/com.grantwasil.videopaste.json"
      ),
      "utf8"
    )
  );
  assert.deepEqual(overrideChromeManifest.allowed_origins, [
    `chrome-extension://${overrideExtensionID}/`,
  ]);

  const relativeApplicationSupportPath = path.join(
    temporaryRoot,
    "Relative Application Support"
  );
  const relativeResult = spawnSync(
    "zsh",
    [installerPath, path.basename(appPath)],
    {
      cwd: temporaryRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        VIDEOPASTE_APPLICATION_SUPPORT_DIR:
          relativeApplicationSupportPath,
      },
    }
  );
  assert.equal(relativeResult.status, 0, relativeResult.stderr);
  const relativeChromeDevManifest = JSON.parse(
    fs.readFileSync(
      path.join(
        relativeApplicationSupportPath,
        "Google/Chrome Dev/NativeMessagingHosts/com.grantwasil.videopaste.json"
      ),
      "utf8"
    )
  );
  assert.equal(path.isAbsolute(relativeChromeDevManifest.path), true);
  assert.equal(
    fs.realpathSync(relativeChromeDevManifest.path),
    fs.realpathSync(hostPath)
  );
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log("Native-host browser manifests test passed.");
