# Firefox release and signing

VideoPaste uses Mozilla's **unlisted** signing channel. Mozilla signs the XPI,
but VideoPaste distributes it through GitHub Releases instead of publishing a
searchable AMO listing. This fits the project's current public-beta
distribution and keeps the extension installable after Firefox restarts.

The release workflow extracts the reproducible ZIP built by
`scripts/package-firefox-extension.sh`, submits those exact contents, downloads
the signed XPI, retains both files as a GitHub Actions artifact, and attaches
them plus `SHA256SUMS` to the existing GitHub release.

Relevant Mozilla documentation:

- [Signing and distribution overview](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
- [Self-distribution](https://extensionworkshop.com/documentation/publish/self-distribution/)
- [`web-ext` signing](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/#sign-your-extension-for-self-distribution)
- [Add-on policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- [Firefox data-collection consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/)

## One-time owner setup

These actions require the repository owner's Mozilla and GitHub accounts and
cannot be completed from the repository:

1. Sign in to the [AMO Developer Hub](https://addons.mozilla.org/developers/)
   with a non-disposable Mozilla account and accept the current developer
   agreement.
2. Create AMO API credentials from the Developer Hub's
   **Tools > Manage API Keys** page.
3. In the GitHub repository, create an environment named
   `firefox-release`. Add these environment secrets:

   - `AMO_JWT_ISSUER` — the AMO JWT issuer/API key.
   - `AMO_JWT_SECRET` — the AMO JWT secret.

4. Protect the environment with a required reviewer and restrict deployments
   to tags matching `v*`. Do not also store the values as repository variables,
   workflow inputs, files, or command-line arguments.
5. Confirm that `videopaste@grantwasil` is available on the first submission.
   AMO requires a stable, unique ID for a Manifest V3 extension. If AMO reports
   a collision, update both `firefox-extension/manifest.json` and the native
   host's `allowed_extensions` entry before publishing any signed release.

`GITHUB_TOKEN` is supplied automatically by GitHub Actions and needs no owner
secret. The workflow gives the AMO credentials only to the signing step. The
separate release-upload job has write access to releases but does not receive
the AMO credentials. Mozilla's `web-ext` is version-pinned in the npm lockfile;
approve the protected environment only for a reviewed release tag.

## Manifest and policy decisions

- The extension requests only `nativeMessaging`.
- Content scripts are limited to `reddit.com`, `x.com`, `twitter.com`, and
  their subdomains.
- Clicking **Copy video** sends the chosen Reddit or X/Twitter post URL or
  embedded media URL to the local VideoPaste native host. Mozilla treats native
  messaging as transmission outside the extension, even when the receiving
  app is local. The manifest therefore declares required `browsingActivity`
  and `websiteContent`.
- Firefox 140 is the minimum version so Firefox's built-in install-time data
  consent covers those declarations. Supporting Firefox 139 or earlier would
  require an in-extension consent and control experience before native
  messaging is used.
- The extension contains readable, unbundled JavaScript and no remote code.
  The signed package is also the human-readable source package, so a separate
  source-code upload is not needed.
- `firefox-extension/amo-metadata.json` supplies repeatable private reviewer
  notes to AMO and is not included in the installable extension.
- There is no `update_url`. Self-distributed installations are upgraded
  manually from a newer GitHub Release. Adding automatic updates later requires
  a stable HTTPS update manifest and hosting that serves XPI files with
  Mozilla's required MIME type.

`web-ext` 10.5.0 emits one Android compatibility warning because Firefox for
Android did not support the consent manifest key until version 142. VideoPaste
does not declare Android support and its required native host is macOS-only, so
the desktop minimum remains Firefox 140. The package otherwise validates with
no errors or notices.

Keep `PRIVACY.md`, the manifest description, the data declarations, and the AMO
review notes synchronized whenever data handling changes.

## Version and release procedure

1. Update the version everywhere it is recorded. One tag describes one
   release, so the Firefox extension, the Chrome extension and the app share
   one version:

   - `firefox-extension/manifest.json` and `firefox-extension/package.json`
   - `chrome-extension/manifest.json` and `chrome-extension/package.json`
   - `App/Info.plist`: set `CFBundleShortVersionString` to the version and
     raise `CFBundleVersion`, the build number, by one
   - the Firefox install badge at the top of `README.md`, which links to
     `releases/download/v<version>/videopaste-firefox-<version>.xpi`

   AMO versions are immutable; every changed submission needs a new, higher
   version.
2. Refresh both lockfiles:

   ```sh
   (cd firefox-extension && npm install --package-lock-only)
   (cd chrome-extension && npm install --package-lock-only)
   ```

   `npm test` in either extension fails while any of these versions differ.
3. Run the release checks from the repository root:

   ```sh
   cd firefox-extension
   npm ci
   npm test
   npm run lint:addon
   cd ..
   ./scripts/package-firefox-extension.sh
   ```

4. Review the generated
   `dist/videopaste-firefox-<version>.zip`. It must contain only the manifest,
   background script, content script and stylesheet, and icons.
5. Run the [release checklist](#release-checklist-live-reddit-and-x-in-zen)
   below against that package and record the result on the release pull
   request. A real failure blocks the release.
6. Merge the release commit, create tag `v<version>`, and publish the matching
   GitHub release. The tag and both extension version fields must match exactly.
7. Approve the `firefox-release` environment deployment. The workflow validates
   and submits the unlisted package, then attaches:

   - `videopaste-firefox-<version>.xpi` — Mozilla-signed installable extension.
   - `videopaste-firefox-<version>.zip` — exact unsigned source submitted.
   - `SHA256SUMS` — checksums for both artifacts.

8. In AMO Developer Hub, verify the new version is approved and has no
   unresolved validation or review messages. Test the release XPI in a clean
   Firefox 140+ profile, restart Firefox, and confirm the extension remains
   installed and can reach the registered native host.

The workflow can also be rerun manually with **Run workflow** and an existing
release tag. It refuses to sign a version whose tag does not match the manifest
and package versions.

## Release checklist: live Reddit and X in Zen

CI never contacts Reddit or X. This checklist is the only check of a release
against the live sites. It runs on the release pull request's head commit,
before the merge, and a person or an agent with computer use can follow it.
Run its Chrome counterpart in
[`chrome-web-store-release.md`](chrome-web-store-release.md#release-checklist-live-reddit-and-x-in-chrome)
for the same release.

It runs on the maintainer's Mac in the everyday Zen profile, which is signed
in to Reddit and has Reddit Enhancement Suite (RES) installed. Zen is built on
Firefox, so it loads the Firefox package and uses the Firefox helper
registration. The commands need `yt-dlp`, `ffprobe` (`brew install ffmpeg`)
and `gh`.

### Rules

- **Read only.** On Reddit and X, only open pages, expand and play videos, and
  click the VideoPaste button. Do not vote, post, comment, message, follow,
  save, hide, sign in, sign out, or change any setting on either site or in
  RES. On X, use whatever session Zen already has.
- **Public pages only.** Choose posts from public subreddits and public X
  accounts, not from a home feed, because their addresses go into the pull
  request.
- **Test what ships.** Load the package built in step 4, never the
  `firefox-extension` source folder.
- **Put everything back.** Do every step under Restore, also after a failure.

### Prepare

1. Check out the release commit in its own folder, so that building there does
   not overwrite the installed helper. From the everyday VideoPaste clone:

   ```sh
   git fetch origin "pull/<pull request number>/head"
   git worktree add --detach ../VideoPaste-release-check FETCH_HEAD
   cd ../VideoPaste-release-check
   git rev-parse HEAD
   ```

   Write down the commit that the last command prints. Run every later
   command from this folder.
2. Write down what is installed now:

   - In Zen, open `about:addons` and note the VideoPaste version, or that it
     is not installed.
   - Note the path of the registered helper. If the file does not exist, no
     helper is registered; note that instead.

     ```sh
     /usr/bin/plutil -extract path raw -o - \
       "$HOME/Library/Application Support/Mozilla/NativeMessagingHosts/com.grantwasil.videopaste.json"
     ```

3. Build the new helper and register it:

   ```sh
   ./scripts/build-app.sh
   ./scripts/install-videopaste-native-host.sh
   ```

   Run the `plutil` command from step 2 again. It must now print a path
   inside `VideoPaste-release-check`.
4. Build the package:

   ```sh
   ./scripts/package-firefox-extension.sh
   ```

   It prints the path of `dist/videopaste-firefox-<version>.zip`. This is the
   XPI about to ship: the release workflow builds the same package from the
   tag and Mozilla adds only its signature.
5. Load the package in Zen. Open `about:debugging#/runtime/this-firefox`,
   choose **Load Temporary Add-on…**, and select the ZIP from step 4.
   VideoPaste appears under **Temporary Extensions** with the release version
   and takes the place of the installed VideoPaste until it is removed.
6. Reload every open Reddit, X and Twitter tab.

### Cases

Hover a playing video to find the orange **V** button, then click it. Do all
five cases.

| # | Case | Where | Passes when |
| --- | --- | --- | --- |
| 1 | New Reddit | A video post with sound in Reddit's current design on `www.reddit.com`. | The copy passes. |
| 2 | Old Reddit's own player | The comments page of a `v.redd.it` video post with sound on `old.reddit.com`. RES leaves old Reddit's own player in place there. | The copy passes, and the player has one button. |
| 3 | Old Reddit with RES | A listing on `old.reddit.com`, such as `old.reddit.com/domain/v.redd.it/`. Expand one video post with sound in the listing with its expando button. Do not open the post. | The copy passes. |
| 4 | "No video" | A video that plays on a Reddit page but is not hosted on Reddit: a promoted post's video, or an expanded post whose domain is not `v.redd.it`. A video with no button is not a case; choose another. | The button says **No video** at once. Its tooltip reads "VideoPaste copies videos hosted on Reddit. This one is an ad or is hosted somewhere else." No new file appears in `~/Downloads/VideoPaste`. |
| 5 | X | A public X post with a video that has sound. | The copy passes. |

Choose videos with sound for cases 1, 2, 3 and 5. A silent clip or GIF post
has no audio stream and cannot pass. If `www.reddit.com` opens the old design,
try `sh.reddit.com` for case 1 instead of changing a preference.

A copy passes when both of these hold:

1. The button shows **Loading…** and then **Copied!**
2. The helper's output MP4 has a video stream and an audio stream. Right
   after **Copied!**, run:

   ```sh
   newest="$(ls -t "$HOME/Downloads/VideoPaste"/*.mp4 | head -n 1)"
   ls -l "$newest"
   ffprobe -v error -show_entries stream=codec_type -of csv=p=0 "$newest" | sort -u
   ```

   The file's time must be the time of the click, and the `ffprobe` output
   must be exactly these two lines:

   ```text
   audio
   video
   ```

When a case does not pass, hover the button and note its label and tooltip,
then try the case once more on a different post. A post that was deleted or
made private is the post's failure, not the release's.

### Record the result

Post one comment on the release pull request, filled in from this template:

```markdown
## Release checklist: Zen

Commit `<commit from Prepare step 1>`, package
`videopaste-firefox-<version>.zip`, helper built from the same commit.

| # | Case | Page | Button | `ffprobe` streams | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | New Reddit | <address> | Copied! | audio, video | pass |
| 2 | Old Reddit's own player | <address> | Copied!, one button | audio, video | pass |
| 3 | Old Reddit with RES | <address> | Copied! | audio, video | pass |
| 4 | "No video" | <address> | No video, tooltip as written, no file | none | pass |
| 5 | X | <address> | Copied! | audio, video | pass |

Restored: VideoPaste <version> in `about:addons`; helper registered at
`<path>`.

Overall: pass
```

```sh
gh pr comment <pull request number> --repo GrantWasil/VideoPaste --body-file <file with the comment>
```

For a case that failed, write the label, the tooltip and both pages tried in
its row, and set the overall result to **fail**.

**A real failure blocks the release.** A failure is real when a case fails on
two different posts while the temporary add-on is loaded and the `plutil`
command prints the new helper's path. Do not merge, tag or submit until the
cause is fixed and the whole checklist passes on the new commit. Tooling that
gets stuck is not a real failure: when an agent cannot drive the browser, it
says so on the pull request and the maintainer runs the checklist by hand.

### Restore

1. In `about:debugging#/runtime/this-firefox`, choose **Remove** on the
   temporary VideoPaste. In `about:addons`, confirm VideoPaste is back at the
   version noted in Prepare step 2.
2. Register the helper noted in Prepare step 2 again. Pass the path of its
   `VideoPaste.app`, which is the noted path without
   `/Contents/MacOS/VideoPasteNativeHost`:

   ```sh
   ./scripts/install-videopaste-native-host.sh "<path of the noted VideoPaste.app>"
   ```

   Run the `plutil` command from Prepare step 2 again. It must print the
   noted path. If no helper was registered at the start, leave this step out.
3. Reload every open Reddit, X and Twitter tab.
4. After the Chrome checklist has also finished, remove the folder. From the
   everyday VideoPaste clone:

   ```sh
   git worktree remove --force ../VideoPaste-release-check
   ```

The videos copied during the run stay in `~/Downloads/VideoPaste` and can be
deleted.

When the Zen and Chrome checklists run back to back, check out the folder,
note the registered helper and build the new helper once, before either
checklist registers it. Keep the folder and the registration between the two
and restore the helper once, after the second checklist.

## Reviewer notes

If AMO asks for manual review, provide:

- The extension is a macOS companion for the open-source VideoPaste app and
  requires the native host registered by
  `scripts/install-videopaste-native-host.sh`.
- No account, paid service, or test credentials are required.
- The user explicitly clicks **Copy video** before a supported Reddit or
  X/Twitter URL is sent to the local native host. The host rejects unsupported
  browser requests and does not receive Firefox cookies.
- A direct `packaged-media.redd.it` URL can be tested without `yt-dlp`;
  ordinary Reddit and public X/Twitter post URLs use `yt-dlp`.
- Source, build steps, tests, and the privacy statement are in the linked
  GitHub tag.

Automated validation can finish quickly, but Mozilla may hold any submission
for manual review. If the workflow reaches its approval timeout, do not publish
a different package under the same version. Wait for the existing AMO version
to be reviewed. After approval, download the signed XPI from Developer Hub and
attach that exact file to the matching GitHub release, or rerun the workflow if
AMO permits the existing submission to be resumed.

If Mozilla rejects a version, address only the requested issue, increment the
version, rerun every check, and publish a new tag and release. Never reuse or
replace a version with different code.

## Credential renewal and incident response

Rotate the AMO API key when a maintainer with access leaves, when Mozilla
requires renewal, or whenever exposure is suspected. Replace both GitHub
environment secrets together, rerun the workflow only for an unreleased higher
version, and revoke the old key in AMO. Never paste credential values into an
issue, release, workflow log, or local tracked file.
