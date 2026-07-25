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
- Content scripts are limited to `reddit.com` and its subdomains.
- Clicking **Copy video** sends the chosen Reddit post URL or embedded media
  URL to the local VideoPaste native host. Mozilla treats native messaging as
  transmission outside the extension, even when the receiving app is local.
  The manifest therefore declares required `browsingActivity` and
  `websiteContent`.
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

1. Update the version in both `firefox-extension/manifest.json` and
   `firefox-extension/package.json`. AMO versions are immutable; every changed
   submission needs a new, higher version.
2. Refresh the lockfile if package metadata changed:

   ```sh
   cd firefox-extension
   npm install --package-lock-only
   ```

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
5. Merge the release commit, create tag `v<version>`, and publish the matching
   GitHub release. The tag and both extension version fields must match exactly.
6. Approve the `firefox-release` environment deployment. The workflow validates
   and submits the unlisted package, then attaches:

   - `videopaste-firefox-<version>.xpi` — Mozilla-signed installable extension.
   - `videopaste-firefox-<version>.zip` — exact unsigned source submitted.
   - `SHA256SUMS` — checksums for both artifacts.

7. In AMO Developer Hub, verify the new version is approved and has no
   unresolved validation or review messages. Test the release XPI in a clean
   Firefox 140+ profile, restart Firefox, and confirm the extension remains
   installed and can reach the registered native host.

The workflow can also be rerun manually with **Run workflow** and an existing
release tag. It refuses to sign a version whose tag does not match the manifest
and package versions.

## Reviewer notes

If AMO asks for manual review, provide:

- The extension is a macOS companion for the open-source VideoPaste app and
  requires the native host registered by
  `scripts/install-videopaste-native-host.sh`.
- No account, paid service, or test credentials are required.
- The user explicitly clicks **Copy video** before a Reddit URL is sent to the
  local native host. The host rejects non-Reddit URLs.
- A direct `packaged-media.redd.it` URL can be tested without `yt-dlp`;
  ordinary Reddit post URLs use `yt-dlp`.
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
