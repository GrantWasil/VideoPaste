# Chrome Web Store release guide

Checked against first-party Google and Chrome Web Store documentation on
2026-07-28.

This guide distinguishes:

- **Required** — stated by Google as a publication or policy requirement.
- **Recommended** — not mandatory in every case, but materially reduces review
  or release risk.
- **VideoPaste release gate** — work this repository still needs before a
  credible public submission.

## Short answer

VideoPaste's Chrome Web Store submission is pending review under Item ID
`imfheadlgpfgpaiemfciehhbjkbhmjfl`. The extension ZIP, Store identity,
privacy disclosures, and listing have been submitted. The remaining critical
path is:

1. Merge and publish the updated privacy policy and Store documentation.
2. Provide a separately installable macOS companion app/native host.
3. Test a Store installation end to end with the Store Item ID.
4. Respond to any reviewer questions and publish after approval.

## Current repository readiness

| Area | Status | Notes |
| --- | --- | --- |
| Manifest | Ready | Manifest V3, a 110-character description, Chrome 105 minimum, and scoped Reddit/X/Twitter matches. |
| Permissions | Ready with justification | The only API permission is `nativeMessaging`; the site access is limited to supported sites. |
| ZIP | Ready | `scripts/package-chrome-extension.sh` creates a deterministic ZIP with `manifest.json` at its root. |
| Store icon | Ready | `icons/icon-128.png` is a 128×128 RGBA PNG. |
| Store identity | Ready | Store Item ID `imfheadlgpfgpaiemfciehhbjkbhmjfl` and development ID `okkpnnbniecihdbgfndcnknjeoajbhnf` are both authorized by the native-host installer. |
| Native companion distribution | **Release gate** | The current public instructions require cloning, building, installing `yt-dlp`, and running a registration script. The Store cannot perform those native installation steps. |
| Privacy policy | Ready after merge | `PRIVACY.md` has a stable public URL and discloses local page inspection, native messaging, and Chrome Web Store Limited Use. |
| Screenshots/promo assets | Submitted | The Dashboard accepted the listing assets; source copies are not yet versioned in this repository. |
| Dashboard declarations | Submitted | Single purpose, permission justifications, data disclosures, distribution, and listing copy are pending review. |
| Store-install test | **Release gate** | Test the final Store ID and separately installed native host with a private listing before public release. |

## 1. Set up the publisher account

- **Required:** Register in the [Chrome Web Store Developer
  Dashboard](https://chrome.google.com/webstore/devconsole), accept the
  developer agreement and policies, and pay Google's one-time registration
  fee. Google's current public documentation does not promise a fixed amount,
  so the amount shown by the live checkout is authoritative.
  [Registration documentation](https://developer.chrome.com/docs/webstore/register/)
- **Required:** Set a publisher name and verify the contact email address. Use
  an inbox that will be monitored for review, warning, and takedown messages.
  [Account setup](https://developer.chrome.com/docs/webstore/set-up-account)
- **Required:** Enable Google Account 2-Step Verification before publishing a
  new extension or updating an existing one.
  [2-Step Verification policy](https://developer.chrome.com/docs/webstore/program-policies/two-step-verification)
- **Required:** Declare whether the publisher is a Trader or Non-Trader. A
  Trader must complete verification with legal name, contact phone number, and
  address; Google says this information is shown publicly on the listing.
  [Trader verification FAQ](https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq)
- **Recommended:** Use a publisher identity that can outlive one person's
  availability and add a second trusted admin after registration.
  [Publisher ownership and roles](https://developer.chrome.com/docs/webstore/share-ownership)

## 2. Keep Store and development identities authorized

Chrome native messaging authorizes exact extension origins. Wildcards are not
allowed in a native host's `allowed_origins`.
[Native messaging host manifest](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)

VideoPaste uses:

- Store Item ID: `imfheadlgpfgpaiemfciehhbjkbhmjfl`
- Unpacked development ID: `okkpnnbniecihdbgfndcnknjeoajbhnf`

The native-host installer writes both exact origins by default:

```json
{
  "allowed_origins": [
    "chrome-extension://imfheadlgpfgpaiemfciehhbjkbhmjfl/",
    "chrome-extension://okkpnnbniecihdbgfndcnknjeoajbhnf/"
  ]
}
```

The checked-in manifest retains a development-only `key` so unpacked builds
keep their stable ID. `scripts/package-chrome-extension.sh` removes that field
from every Store ZIP so the development identity cannot conflict with the
Store-assigned Item ID.

Google also documents an optional consistent-ID workflow in which the Store
public key is used for unpacked development. VideoPaste keeps separate exact
IDs instead and authorizes both locally.
[Google's consistent-ID procedure](https://developer.chrome.com/docs/extensions/reference/manifest/key)

## 3. Package and technical requirements

### Required

- Use Manifest V3. The Extensions platform currently lists `3` as the only
  supported `manifest_version`.
  [Manifest format](https://developer.chrome.com/docs/extensions/reference/manifest)
- Include `name`, `version`, `description`, and icons. The description must not
  exceed 132 characters.
  [Prepare the extension](https://developer.chrome.com/docs/webstore/prepare)
- Keep the development key only in the unpacked source manifest. Verify that
  the upload ZIP's manifest does not contain `key`.
- Upload a ZIP containing all extension files, with `manifest.json` at the ZIP
  root. The maximum Store package size is 2 GB.
  [Prepare](https://developer.chrome.com/docs/webstore/prepare),
  [upload limits](https://developer.chrome.com/docs/webstore/publish)
- Keep executable logic inside the extension package. Manifest V3 prohibits
  remotely hosted executable code, including remote scripts and fetched code
  evaluated with `eval`.
  [Manifest V3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
- Request only the narrowest permissions necessary for the current feature
  set.
  [Use of permissions policy](https://developer.chrome.com/docs/webstore/program-policies/policies)

### VideoPaste assessment

- The extension's Manifest V3 structure is compliant.
- Its current 110-character description fits the Store limit.
- `nativeMessaging` is functionally necessary, and Chrome will show users the
  warning **“Communicate with cooperating native applications.”**
  [Permissions reference](https://developer.chrome.com/docs/extensions/reference/permissions-list)
- The background-service-worker bridge is the correct architecture:
  `connectNative()` and `sendNativeMessage()` are not available directly in a
  content script.
  [Native messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)
- The Reddit/X/Twitter match patterns are materially narrower than
  `<all_urls>`, which supports the minimum-permission justification and may
  reduce review time.
- The extension ZIP must contain only the browser extension. The native app and
  helper are separate artifacts.

Before every upload:

```sh
npm test
./scripts/package-chrome-extension.sh
unzip -l dist/videopaste-chrome.zip
```

Test the exact ZIP by extracting it to a fresh directory and loading that
directory in Chrome, not only the source directory. The
[release checklist](#release-checklist-live-reddit-and-x-in-chrome) does this
against live Reddit and X.

## 4. Privacy Practices and policy declarations

Chrome defines page content, URLs, and browsing activity as user data.
Processing data only on the user's device still needs to be disclosed.
[User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)

### Required Dashboard entries

Use the **Privacy Practices** tab to provide:

- A narrow single-purpose statement.
- A justification for every permission and site access request.
- A remote-code declaration.
- Accurate data-type disclosures.
- Limited Use certifications.
- A public privacy-policy URL.

[Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)

Suggested single-purpose statement:

> VideoPaste lets a macOS user select a public video on Reddit or X/Twitter,
> download it through the local VideoPaste companion app, and place the
> resulting MP4 file on the macOS clipboard.

Suggested `nativeMessaging` justification:

> Native messaging sends the user-selected Reddit or X/Twitter post/media URL
> and an explicit download command to the locally installed VideoPaste helper.
> The helper downloads the requested media and places the local MP4 on the
> macOS clipboard. No project-operated server receives the URL or media.

Suggested site-access justification:

> Access is limited to Reddit, X, and Twitter pages so VideoPaste can identify
> supported video players, show its user-facing Copy video control, and derive
> the URL selected by the user. It does not run on unrelated sites.

Suggested remote-code answer:

> No. All JavaScript executed by the Chrome extension is included in the
> submitted extension package.

### Data disclosures

**Recommended conservative declaration:** disclose both **website content**
and **web browsing activity/URLs** (using the closest labels in the live
Dashboard). The extension inspects supported pages locally to locate video
players, and after a click it sends the selected page/media URL to the local
helper. Do not mark “no data” merely because the project has no cloud server;
Google explicitly includes local processing in its disclosure rule.

The disclosures, listing, extension behavior, and privacy policy must agree.
At minimum, the public policy should say:

- The extension locally inspects supported Reddit/X/Twitter page content to
  find videos and add the Copy video control.
- It sends a selected post/media URL and command to the local native helper
  only after the user clicks the control.
- The helper contacts Reddit, X/Twitter, their media/CDN hosts, and hosts
  contacted by `yt-dlp` only to resolve and retrieve the selected public media.
- Downloaded files and the five recent local paths remain on the Mac.
- The project has no accounts, analytics, telemetry, advertising, tracking, or
  project-operated server.
- The helper disables external `yt-dlp` configuration and cookie inputs so
  local settings cannot add browser authentication.
- Data is not sold or used for advertising.
- Retention and deletion behavior are explained.
- The Limited Use certification is stated.

Google requires an accurate, current privacy policy whenever an extension
handles user data and requires its URL in the Dashboard.
[Privacy policy requirements](https://developer.chrome.com/docs/webstore/program-policies/privacy)

Google exempts transport between a Chrome extension and a native program on
the same computer from its encryption-in-transit requirement. That exemption
does not remove the disclosure obligation, and remote media requests should
still use secure transport.
[Local native transport FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)

## 5. Media-download policy risk

Video downloaders are not categorically banned, but Google says they are not
eligible to be featured in the Chrome Web Store. More importantly, Store
policy prohibits facilitating unauthorized access to content or unauthorized
downloading/streaming of copyrighted media.
[Chrome Web Store policies](https://developer.chrome.com/docs/webstore/program-policies/policies)

### Required behavior

- Do not bypass paywalls, authentication, login restrictions, private posts,
  or technical access controls.
- Do not market the extension as a way to download content without
  authorization.
- Do not imply affiliation with or endorsement by Reddit, X, or Google.

### Recommended listing language

Include a visible limitation such as:

> VideoPaste works with supported public Reddit and X/Twitter video posts. It
> does not use browser cookies, access private or login-restricted posts, or
> bypass access controls. Download only media you own or are authorized to
> download.

Keep the existing independent-project disclaimer. Do not use Reddit or X
branding in a way that suggests endorsement.

## 6. Store listing content and assets

### Product details

Prepare:

- Title: `VideoPaste`
- Summary: the manifest description, at most 132 characters.
- Detailed description.
- Primary language.
- Primary category selected in the live Dashboard.
- Homepage URL.
- Support URL.
- Privacy-policy URL.

[Listing fields](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)

The first paragraph should state all material dependencies:

> VideoPaste for Chrome adds a Copy video control to supported public Reddit
> and X/Twitter videos. It requires macOS 13 or newer and the separately
> installed VideoPaste companion app/native helper.

Also disclose that X/Twitter and ordinary Reddit post URLs require `yt-dlp`,
unless the release companion app bundles that dependency.

### Graphic assets

The dedicated image guide identifies this mandatory minimum:

| Asset | Requirement |
| --- | --- |
| Store icon | 128×128 PNG inside the ZIP |
| Small promo tile | 440×280 PNG or JPEG |
| Screenshots | At least 1, at most 5; 1280×800 or 640×400, square corners/full bleed |
| Marquee tile | Optional; 1400×560 PNG or JPEG |

[Chrome Web Store image requirements](https://developer.chrome.com/docs/webstore/images)

Use 1280×800 screenshots for a sharper listing. Recommended set:

1. The Copy video control on a Reddit video.
2. The Copy video control on a public X post.
3. The `Copied!` state and an MP4 being pasted into a messaging app.
4. Companion-app installation or menu-bar mode.

Google’s two first-party pages currently conflict about promotional video: the
dedicated image guide says only the icon, small tile, and screenshot are
mandatory, while the listing guide includes a YouTube video in its required
asset list. **Recommended:** prepare a short YouTube demonstration, or confirm
that the live Dashboard marks the video field optional before scheduling the
release.

### README badge

While review is pending, use only an accurate pending-review status badge.
Google permits its official **Available in the Chrome Web Store** badge only
while the extension is publicly available, and the badge must link to the
Store item. After approval, replace the pending badge with Google's unchanged
small bordered badge linked to:

`https://chromewebstore.google.com/detail/imfheadlgpfgpaiemfciehhbjkbhmjfl`

[Chrome Web Store branding guidelines](https://developer.chrome.com/docs/webstore/branding)

## 7. Native companion distribution and reviewer access

Native messaging is supported, but the native application must register its
own host manifest on the user's machine. On macOS, the host path must be
absolute and the exact Store extension origin must appear in
`allowed_origins`.
[Native host registration](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)

The Web Store ZIP installs and updates the browser extension; it does not
install or register VideoPaste's native executable. This is an operational
inference from Google's separate extension-package and native-host
registration procedures.

### VideoPaste release gate

Before public launch, provide a stable, direct companion-app download and an
installation flow that:

1. Installs the VideoPaste app/native helper.
2. Registers `com.grantwasil.videopaste`.
3. Writes the final Store Item ID to `allowed_origins`.
4. Installs or clearly resolves the `yt-dlp` dependency.
5. Makes a missing companion app actionable instead of leaving the user with
   only **Try again**.

The current source-build workflow is appropriate for developers but is a poor
public Store onboarding path and makes reviewer verification fragile.

Google marks Test Instructions as optional, but they are strongly recommended
here because reviewers otherwise cannot exercise the extension.
[Test instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions)

Suggested reviewer instructions:

1. State that the extension is macOS-only and list the supported macOS/Chrome
   versions.
2. Provide a direct companion-app download and checksum.
3. Give exact installation/registration steps.
4. Explain the `nativeMessaging` warning.
5. Give one known-working public Reddit post and one public X post.
6. Ask the reviewer to click the orange **V**, wait for **Copied!**, then paste
   the MP4 into Finder or a text-capable messaging app.
7. Explain expected errors for private, deleted, login-restricted, or
   non-video posts.
8. Link to source code and the public privacy policy.

## 8. Distribution, testing, and submission

Google offers three visibility modes:

- **Public:** searchable and installable by everyone.
- **Unlisted:** not searchable, but anyone with the Store URL can install it.
- **Private:** limited to trusted testers, groups, or an eligible Workspace
  domain.

All three modes have the same policy requirements and review process.
[Distribution options](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)

### Recommended rollout

1. Submit as **Private** to trusted testers.
2. Install it from the Store on a clean Chrome profile.
3. Install the public companion artifact, not a development build.
4. Verify Reddit and X end to end with the Store Item ID.
5. Verify the failure message when the companion is absent.
6. Verify every listing/support/privacy link.
7. Change visibility to **Public** or **Unlisted** and republish.

If maintaining a separate beta item alongside production, Google requires
`BETA` or `DEVELOPMENT BUILD` in its name and the phrase `THIS EXTENSION IS FOR
BETA TESTING` in its description to avoid repetitive-content enforcement.
[Testing distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)

### Submission flow

1. Upload the final ZIP.
2. Complete **Store Listing**, **Privacy Practices**, **Distribution**, and
   recommended **Test Instructions**.
3. Choose **Submit for Review**.
4. Select automatic publication or deferred publication.

With deferred publication, an approved submission must be published within 30
days or it returns to draft.
[Publishing flow](https://developer.chrome.com/docs/webstore/publish)

Google currently warns of extended review times due to an April 2026 surge.
Most reviews normally complete within a few days, but some take weeks; Google
says to contact developer support after three weeks. New publishers/items,
powerful permissions, broad site access, large changes, and difficult-to-review
code may take longer.
[Review process](https://developer.chrome.com/docs/webstore/review-process)

## 9. Updates after launch

For every extension update:

1. Increase `manifest.json`'s version; it must be greater than every prior
   upload. The Chrome extension shares its version with the Firefox extension
   and the app, so follow step 1 of the
   [Firefox version and release procedure](firefox-release.md#version-and-release-procedure).
2. Run the full tests.
3. Build a complete new ZIP containing changed and unchanged runtime files.
4. Run the [release checklist](#release-checklist-live-reddit-and-x-in-chrome)
   against that ZIP and record the result on the release pull request. A real
   failure blocks the release.
5. Update listing, distribution, and privacy metadata if behavior changed.
6. Upload and submit the update for review.

Existing users remain on the published version while an update is reviewed.
Adding warning-producing permissions requires users to approve them and may
disable the extension until they do. Percentage rollout becomes available only
for items with more than 10,000 seven-day active users.
[Updating a Store item](https://developer.chrome.com/docs/webstore/update)

## Release checklist: live Reddit and X in Chrome

CI never contacts Reddit or X. This checklist is the only check of a release
against the live sites. It runs on the release pull request's head commit,
before the merge, and a person or an agent with computer use can follow it.
Run its Zen counterpart in
[`firefox-release.md`](firefox-release.md#release-checklist-live-reddit-and-x-in-zen)
for the same release.

It runs on the maintainer's Mac in the everyday Chrome profile. The commands
need `yt-dlp`, `ffprobe` (`brew install ffmpeg`) and `gh`.

### Rules

- **Read only.** On Reddit and X, only open pages, expand and play videos, and
  click the VideoPaste button. Do not vote, post, comment, message, follow,
  save, hide, sign in, sign out, or change any setting on either site. On
  both sites, use whatever session Chrome already has.
- **Public pages only.** Choose posts from public subreddits and public X
  accounts, not from a home feed, because their addresses go into the pull
  request.
- **Test what ships.** Load the ZIP built in step 4, never the
  `chrome-extension` source folder.
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

   - In Chrome, open `chrome://extensions`. Note each VideoPaste listed there,
     its version and whether it is turned on, and note whether **Developer
     mode** is on.
   - Note the path of the registered helper. If the file does not exist, no
     helper is registered; note that instead.

     ```sh
     /usr/bin/plutil -extract path raw -o - \
       "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.grantwasil.videopaste.json"
     ```

3. Build the new helper:

   ```sh
   ./scripts/build-app.sh
   ```

4. Build the ZIP and extract it to a fresh folder:

   ```sh
   ./scripts/package-chrome-extension.sh
   rm -rf dist/chrome-release-check
   unzip -q dist/videopaste-chrome.zip -d dist/chrome-release-check
   ```

   `dist/videopaste-chrome.zip` is the ZIP about to be uploaded to the Store.
5. Load it in Chrome. In `chrome://extensions`, turn off every VideoPaste
   noted in step 2, turn on **Developer mode**, choose **Load unpacked**, and
   select `dist/chrome-release-check`. Note the 32-letter **ID** Chrome shows
   for it. The Store ZIP carries no key, so this ID belongs to the folder and
   is neither the Store ID nor the development ID.
6. Register the new helper for that ID. The helper answers only the IDs it
   was registered with, so name the two permanent IDs and the one from step 5:

   ```sh
   ./scripts/install-videopaste-native-host.sh dist/VideoPaste.app \
     imfheadlgpfgpaiemfciehhbjkbhmjfl \
     okkpnnbniecihdbgfndcnknjeoajbhnf \
     <ID from step 5>
   ```

   Run the `plutil` command from step 2 again. It must now print a path
   inside `VideoPaste-release-check`.
7. Reload every open Reddit, X and Twitter tab.

### Cases

Hover a playing video to find the orange **V** button, then click it. Do all
four cases. There is no RES case, because RES is not installed in Chrome.

| # | Case | Where | Passes when |
| --- | --- | --- | --- |
| 1 | New Reddit | A video post with sound in Reddit's current design on `www.reddit.com`. | The copy passes. |
| 2 | Old Reddit's own player | A `v.redd.it` video post with sound on `old.reddit.com`, such as one listed at `old.reddit.com/domain/v.redd.it/`, played in old Reddit's own player. | The copy passes, and the player has one button. |
| 3 | "No video" | A video that plays on a Reddit page but is not hosted on Reddit: a promoted post's video, or an expanded post whose domain is not `v.redd.it`. A video with no button is not a case; choose another. | The button says **No video** at once. Its tooltip reads "VideoPaste copies videos hosted on Reddit. This one is an ad or is hosted somewhere else." No new file appears in `~/Downloads/VideoPaste`. |
| 4 | X | A public X post with a video that has sound. | The copy passes. |

Choose videos with sound for cases 1, 2 and 4. A silent clip or GIF post has
no audio stream and cannot pass. If `www.reddit.com` opens the old design, try
`sh.reddit.com` for case 1 instead of changing a preference.

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
made private is the post's failure, not the release's. When every case fails,
first compare the ID from Prepare step 5 with `allowed_origins` in the file
the `plutil` command reads.

### Record the result

Post one comment on the release pull request, filled in from this template:

```markdown
## Release checklist: Chrome

Commit `<commit from Prepare step 1>`, package `videopaste-chrome.zip`, helper
built from the same commit.

| # | Case | Page | Button | `ffprobe` streams | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | New Reddit | <address> | Copied! | audio, video | pass |
| 2 | Old Reddit's own player | <address> | Copied!, one button | audio, video | pass |
| 3 | "No video" | <address> | No video, tooltip as written, no file | none | pass |
| 4 | X | <address> | Copied! | audio, video | pass |

Restored: VideoPaste <version> turned on in `chrome://extensions`; helper
registered at `<path>`.

Overall: pass
```

```sh
gh pr comment <pull request number> --repo GrantWasil/VideoPaste --body-file <file with the comment>
```

For a case that failed, write the label, the tooltip and both pages tried in
its row, and set the overall result to **fail**.

**A real failure blocks the release.** A failure is real when a case fails on
two different posts while the extracted ZIP is the only VideoPaste turned on
and the `plutil` command prints the new helper's path. Do not merge, tag or
submit until the cause is fixed and the whole checklist passes on the new
commit. Tooling that gets stuck is not a real failure: when an agent cannot
drive the browser, it says so on the pull request and the maintainer runs the
checklist by hand.

### Restore

1. In `chrome://extensions`, choose **Remove** on the VideoPaste loaded from
   `dist/chrome-release-check`. Turn on each VideoPaste that was on in Prepare
   step 2, and set **Developer mode** back to what it was.
2. Register the helper noted in Prepare step 2 again, for the two permanent
   IDs only. Pass the path of its `VideoPaste.app`, which is the noted path
   without `/Contents/MacOS/VideoPasteNativeHost`:

   ```sh
   ./scripts/install-videopaste-native-host.sh "<path of the noted VideoPaste.app>"
   ```

   Run the `plutil` command from Prepare step 2 again. It must print the
   noted path. If no helper was registered at the start, leave this step out.
3. Reload every open Reddit, X and Twitter tab.
4. After the Zen checklist has also finished, remove the folder. From the
   everyday VideoPaste clone:

   ```sh
   git worktree remove --force ../VideoPaste-release-check
   ```

The videos copied during the run stay in `~/Downloads/VideoPaste` and can be
deleted.

When the Zen and Chrome checklists run back to back, check out the folder,
note the registered helper and build the new helper once, before either
checklist registers it. Keep the folder and the registration between the two;
the registration in step 6 also serves Zen. Restore the helper once, after the
second checklist.

## Final release checklist

### Publisher

- [ ] Register and pay the one-time fee.
- [ ] Verify publisher email and set publisher name.
- [ ] Enable 2-Step Verification.
- [ ] Declare Trader or Non-Trader and complete any required verification.
- [ ] Add a backup publisher admin.

### Identity and native host

- [x] Upload a draft and record Store Item ID
      `imfheadlgpfgpaiemfciehhbjkbhmjfl`.
- [x] Keep the stable unpacked development ID documented.
- [x] Verify the packaged Store manifest omits `key`.
- [x] Add both exact IDs to native-host `allowed_origins`.
- [ ] Rebuild and test the native companion from its public artifact.

### Product and policy

- [x] Preserve Manifest V3 and the current narrow permission/site scope.
- [x] Publish a stable privacy-policy URL.
- [x] Disclose local page inspection, selected URLs, native messaging, remote
      media hosts, retention, and no analytics/advertising.
- [x] Complete every Privacy Practices declaration accurately.
- [x] State the single purpose and justify `nativeMessaging`.
- [x] Declare no remotely hosted extension code.
- [x] State public-post/access-control and authorized-download limitations.

### Listing

- [x] Detailed description, language, and category.
- [x] Homepage, support, and privacy URLs.
- [x] Clear macOS companion-app and `yt-dlp` requirements.
- [x] 128×128 store icon.
- [x] 440×280 small promo tile.
- [x] One to five 1280×800 screenshots.
- [ ] Optional 1400×560 marquee.
- [x] Live Dashboard accepted the listing without additional required assets.
- [x] Native-companion reviewer requirements documented.

### Release

- [x] Run tests and build the exact submitted ZIP.
- [x] Verify ZIP contents, keyless packaged manifest, and manifest version.
- [ ] The [release checklist](#release-checklist-live-reddit-and-x-in-chrome)
      passes for the ZIP being submitted.
- [ ] Private Store install passes on a clean Chrome profile.
- [ ] Reddit and X downloads work through the final Store ID.
- [ ] Missing-helper and unsupported-post errors are actionable.
- [x] Submit for review.
- [ ] Monitor the publisher inbox and Dashboard.
- [ ] Publish within 30 days if deferred publication is selected.

## Primary sources

- [Register a developer account](https://developer.chrome.com/docs/webstore/register/)
- [Set up the developer account](https://developer.chrome.com/docs/webstore/set-up-account)
- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [Prepare an extension](https://developer.chrome.com/docs/webstore/prepare)
- [Publish an extension](https://developer.chrome.com/docs/webstore/publish)
- [Complete a Store listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Supply Store images](https://developer.chrome.com/docs/webstore/images)
- [Fill out Privacy Practices](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Configure distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)
- [Chrome Web Store review process](https://developer.chrome.com/docs/webstore/review-process)
- [Update a Store item](https://developer.chrome.com/docs/webstore/update)
- [Native messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)
- [Keep a consistent extension ID](https://developer.chrome.com/docs/extensions/reference/manifest/key)
