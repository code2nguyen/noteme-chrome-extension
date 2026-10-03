# Noteme

Noteme is a Chrome extension that replaces the new tab page with a personal notepad.

## Features

- Text notes (a ruled notepad with bold, italic, underline, strike, highlights, inks and checklists) and code notes
  (syntax highlighting for JavaScript, TypeScript, JSX/TSX, HTML, CSS and JSON)
- A board you can arrange: move and resize notes with the arrange button
- Archive, full-text search across notes and archive
- Sync between your Chrome profiles through `chrome.storage.sync`

## Stack

Angular 22 (standalone, zoneless, signals) with NgRx 22 for the store, and the [c2n web components](https://code2nguyen.github.io/web-components/)
(`@c2n/*`) for every piece of UI: `c2-masonry` for the board, `c2-notepad` and `c2-code-editor` for the notes,
`c2-tabs`, `c2-autocomplete`, `c2-button-group`, `c2-menu`, `c2-icon-button`, `c2-select`, `c2-spinner` and the Feather
icon set. The theme comes from `@c2n/theme`; `src/styles.scss` maps the Noteme palette onto its tokens.

## Develop

Requires Node.js 22.22.2+ or 24.15+.

```sh
npm install
npm start          # http://localhost:4200, notes are kept in localStorage instead of chrome.storage
npm run watch      # rebuild dist/ on change, for loading as an unpacked extension
npm run build      # production build in dist/noteme-chrome-extension
npm test           # unit tests (vitest)
npm run e2e        # build, then Playwright: the web build and the unpacked extension (real chrome.storage)
npm run lint
npm run type-check
npm run format:check
```

The Playwright suites (`e2e/`) write screenshots of every verified state to `test-results/screenshots/`. Set
`CHROMIUM_PATH` to use an installed Chromium instead of Playwright's download (`npx playwright install chromium`).

Load the extension: `chrome://extensions` → Developer mode → **Load unpacked** → `dist/noteme-chrome-extension`.

## Release

CI (`.github/workflows/ci.yml`) runs lint, format, type-check, the unit tests, the changelog check, the production
build and both Playwright suites (Chromium only) on every pull request and push to `master`, and keeps the packaged zip as the `extension` artifact.

To release, bump the version and push the tag:

```sh
npm version patch        # or minor / major: updates package.json and src/manifest.json, commits, tags v<version>
git push --follow-tags
```

The tag runs `.github/workflows/release.yml`: the same checks, then `npm run package` (`dist/noteme-<version>.zip`,
refused if package.json, the manifest and the tag disagree), an upload through the Chrome Web Store API v2, a
submission for review, and a GitHub release with the zip attached. **Run workflow** in the Actions tab starts it by
hand, with a choice of submit, staged (approved, then published from the dashboard) or upload only, and a dry run.

The first 3.x release keeps the version package.json already has: `npm version 3.0.0 --allow-same-version`.

### Changelog

`CHANGELOG.md` and the release notes are generated from the commit history (`scripts/changelog.ts`), so write commit
subjects as [Conventional Commits](https://www.conventionalcommits.org) with the area as scope, in words a user
understands: `feat(plan): drag an event to another day`. `feat`, `fix` and `perf` commits and breaking changes
(`feat!:`) are listed; `chore`, `ci`, `test`, `docs`, `refactor` and the like are not. A `Changelog: <text>` line in
the commit body words the entry differently, and `Changelog: skip` leaves the commit out.

- `npm version` files the commits since the last release under the new version and commits `CHANGELOG.md` with it;
  CI fails when the file is stale.
- The release workflow puts that version's notes in the GitHub release. For the store listing it writes, in the run's
  summary, a plain-text "What's new" of that release and the ones before it, the last 10 releases at most rather than
  the whole history, ready to paste (the store's API takes no release notes).
- Preview the next release: `npm run changelog -- --store 3.1.0` (`--releases 5` for fewer; `--notes` for markdown).

### One-time setup

The workflow signs in as a Google Cloud service account that the store lets publish.

1. In a Google Cloud project, enable the **Chrome Web Store API** and create a service account (no roles needed).
2. In the [developer dashboard](https://chrome.google.com/webstore/devconsole), **Account** → service accounts:
   add the service account's email. Note the **publisher ID** shown there and the extension's **item ID**.
3. On GitHub, **Settings → Environments → New environment** `chrome-web-store`, with:
   - variables `CWS_PUBLISHER_ID` and `CWS_ITEM_ID`;
   - either a JSON key of the service account as the secret `CWS_SERVICE_ACCOUNT_KEY`,
   - or, keyless, a Workload Identity Federation provider for this repository as the variable
     `GCP_WORKLOAD_IDENTITY_PROVIDER` (`projects/<number>/locations/global/workloadIdentityPools/<pool>/providers/<provider>`)
     and the service account's email as `CWS_SERVICE_ACCOUNT`. Grant the pool's principal for this repository
     _Service Account Token Creator_ on the service account, and enable the IAM Service Account Credentials API.
   - Optionally, required reviewers, so each release waits for a click before anything reaches the store.

Check an item by hand with the same script:
`CWS_ACCESS_TOKEN=$(gcloud auth print-access-token --scopes=https://www.googleapis.com/auth/chromewebstore) CWS_PUBLISHER_ID=… CWS_ITEM_ID=… node scripts/chrome-web-store.ts status`.

## Upgrading from 2.x

Version 3 is a Manifest V3 extension and reads the data 2.x stored, unchanged:

- Text notes were Quill documents. They open converted to the notepad's markdown: bold, italic, underline, strike
  and checklists are kept, headings become bold lines, bullet and numbered lists keep a textual marker, links keep
  their URL in parentheses; colours, fonts, sizes and images are dropped. A note is only rewritten in the new
  format when you edit it.
- Vocabulary notes are gone; existing ones open as JSON code notes.
- The 13 note colours map onto the notepad's six paper colours.
