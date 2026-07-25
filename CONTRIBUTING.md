# Contributing to VideoPaste

Thanks for helping make videos from Reddit and X/Twitter easier to share.

## Before opening a pull request

1. Create a focused branch from `main`.
2. Keep changes scoped to one fix or feature.
3. Add or update tests for behavior changes.
4. Run the relevant checks below.

## macOS app and native helper

```sh
swift test
swift format lint --recursive --strict Sources Tests Package.swift
./scripts/build-app.sh
```

## Firefox extension

```sh
cd firefox-extension
npm install
npm test
npm run lint:addon
```

After building the app, also run:

```sh
npm run test:native
```

Changes to the Firefox manifest or release packaging must also follow
[`docs/firefox-release.md`](docs/firefox-release.md), including synchronized
manifest/package versions and a matching release tag.

## Pull requests

Explain what changed, why it changed, and how you tested it. Screenshots or
short recordings are appreciated for visible interface changes.

## Bug reports

Please include:

- macOS and Firefox versions
- Whether the link was a direct media URL, Reddit post, or X/Twitter post
- For X/Twitter, whether the post was public and accessible without signing in
- Whether `yt-dlp` is installed
- The exact error shown by VideoPaste

Do not include private videos, private chat content, or sensitive clipboard
data.
