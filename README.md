# Noteme

Noteme is a Chrome extension that replaces the new tab page with a personal notepad.

## Features

### Home

The new tab opens on Home: a clock (which opens your notes), the date, a quote of the day, your most visited sites and
a photo behind it all.

- Photos from Wikimedia Commons, one a day by default or changed automatically, by theme, and downloaded ahead so the
  tab opens at once; "Change now" moves to the next one.
- Quotes from bundled, public-domain lists in English, French and Vietnamese (proverbs, folk verse and classical
  lines), mostly in the browser's language, ordered so no two days in a row share a theme or an author.
- Your notes in a carousel under the clock.

### Notes on a board

The board (`main-board`) holds every kind of note as a card, laid out by `c2-masonry`. **New** (or a key on the board:
<kbd>N</kbd> a note, <kbd>P</kbd> a page, <kbd>F</kbd> a flow, <kbd>T</kbd> a to-do list) adds one:

- **Note**: a quick thought on ruled paper (`c2-notepad`): bold, italic, underline, strike, inks, highlighters and
  checklists; pads, rulings and paper colours from its Paper button.
  Paste or drop an image (a screenshot, a copied picture) into a note or a page; click it to resize it from its
  handle, or with Alt+← and Alt+→.
- **Page**: a full page (`c2-page-editor`), opened on its own: headings, lists, to-dos, quotes, code blocks, dividers
  and tables with sums, formulas and cell styles; Markdown shortcuts and a `/` menu.
- **Flow**: boxes and arrows (`c2-flow`): shapes, papers, inks and icons from a box's right-click menu, labelled
  arrows, and add, tidy up and fit from a toolbar. A box can hold **fields** (a name, a type, a primary or foreign key)
  to design a data schema: arrows run between two fields, and each end shows its cardinality (one, zero or one,
  many…) from the arrow's right-click menu.
- **To-do list**: tasks checked off right on the card (`c2-todo-list`): drag to reorder, swipe to archive, a progress
  ring, renamed in its heading.
- **Sheet**: rows, columns and formulas worked on its card (`c2-spreadsheet`), with the totals of the selection;
  copied cells paste into a page as a table.

- Arrange the board: move cards by their handle, resize them by their edges, pin one so it stays in place.
- Notes you have not edited lately move to **Older notes**, filtered by kind; pin one to bring it back to the board.
- **Archive** clears notes off the board and keeps them, as a list with a preview of each; select several to restore or
  delete them together from the action bar.
- **Search** (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> <kbd>K</kbd>) finds words anywhere: in notes, pages and their tables,
  flows, lists and the archive.

### Plan

An optional week and month calendar (`c2-week-planner`, `c2-month-planner`), switched on under Settings → Features:
plans for a whole day or with a start and end time.

### Settings

- Theme light, dark or following the system; text size from Small to Larger.
- Language: English, French or Vietnamese, the c2n components included.
- What Home shows: clock, date, quote, site shortcuts, photos and their themes.
- **Sync** with your Chrome profile (`chrome.storage.sync`), off by default. Quick notes and to-do lists sync; pages,
  flows and sheets stay on the device, as does a note too long for Chrome sync (8 KB an item, about 100 KB in all).
  Notes refused by a full sync storage are sent again once room is freed.

Everything else is kept on the device in `chrome.storage.local`. Images pasted or dropped into a note or a page are
kept on the device too, in IndexedDB (`noteme-images`), and never sync: a note holds only `noteme-image:<id>`, so a
synced note shows a placeholder for its images on another computer. An image pasted from a web page is copied there
too, so it is not fetched from its site again; one whose site does not let other pages read it (no CORS) keeps its
web address and loads from that site. Images no note refers to any more are deleted after a week.

## Stack

Angular 22 (standalone, zoneless, signals) with NgRx 22 for the store, and the [c2n web components](https://code2nguyen.github.io/web-components/)
1.0.17 (`@c2n/components`, `@c2n/core`, `@c2n/feather-icons`, `@c2n/phosphor-icons`, `@c2n/symbols`) for every piece
of UI: `c2-masonry` for the board; `c2-notepad`, `c2-page-editor`, `c2-flow`, `c2-todo-list` and `c2-spreadsheet` for
the notes; `c2-week-planner` and `c2-month-planner` for Plan; `c2-split-panel` and `c2-action-bar` for the archive;
`c2-carousel` on Home; `c2-skip-link`, `c2-modal`, `c2-sheet`, `c2-menu`, `c2-search-field`, `c2-select`,
`c2-toast-region` and the rest of the controls. The theme comes from `@c2n/components/theme.css`; `src/styles.scss`
maps the Noteme palette onto its `--c2-theme--*` tokens.

Translations are Noteme's own (`src/app/i18n`): typed message keys in English, French and Vietnamese, and the c2n
components' French and Vietnamese registered with `addTranslations` (`src/app/i18n/components`).

`AGENTS.md` and `CLAUDE.md` hold the rules for coding agents (use a `c2-*` element for every control, check its API
with the c2n MCP server, validate the markup); `npx c2n-skill install` refreshes the c2n skill and MCP configuration.

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

### Local c2n components

To try changes to the c2n components before they are published, link a checkout of the web-components repo next to
this one (`C2N_REPO` points elsewhere). package.json and the lockfile keep the published versions.

```sh
# in ../web-components: npm install first (the umbrella package is generated from the installed components), then after each change
npm run build -w packages/umbrella && npm run build -w packages/icons/feather-icons && npm run build -w packages/tools/theme

# back in this repository
npm run c2n:link     # node_modules/@c2n/components, core, feather-icons and theme -> ../web-components
npm run c2n:unlink   # back to the published packages
```

`npm install` also puts the published packages back; run `npm run c2n:link` again after it.

## Release

Two branches: `develop`, the default, takes the pull requests; `main` holds the released versions only, and only the
release workflow moves it: the "main: releases only" ruleset rejects every other push to `main`, and the workflow
pushes with a deploy key (write access, its private key in the `RELEASE_DEPLOY_KEY` secret) that the ruleset lets
through.

CI (`.github/workflows/ci.yml`) runs lint, format, type-check, the unit tests, the changelog check, the production
build and both Playwright suites (Chromium only) on every pull request and push to `develop` or `main`, and keeps the packaged zip as the `extension` artifact.

Releasing takes two runs from the Actions tab (**Run workflow**), so a version can wait on GitHub before it goes to
the store:

1. **Release a new version** (`.github/workflows/release.yml`), on `develop`, with a choice of patch, minor or major.
   It runs the same checks, then `npm version <bump>`: package.json and `src/manifest.json` get the new version and
   `CHANGELOG.md` the commits since the last release, committed as `<version>` and tagged `v<version>`. It pushes both
   to `develop`, fast-forwards `main` to it, then creates a GitHub release with `noteme-<version>.zip` and that version's notes. Nothing to edit by
   hand, the changelog included; `git pull` afterwards.
2. **Publish to the Chrome Web Store** (`.github/workflows/publish.yml`) sends a release's zip, the one built and
   tested in step 1, to the store: the latest release, or the tag you type (`v3.0.1`). Then submit for review, staged
   (approved, then published from the dashboard) or upload only. Its summary has the store's "What's new" text.

The store refuses a version it already has, so each upload needs a new version from step 1.

`npm run package` zips with the system's `zip` command, which Linux, macOS and the workflow's Ubuntu runners have; on
Windows, run it from WSL or install a `zip` on the PATH.

### Changelog

`CHANGELOG.md` and the release notes are generated from the commit history (`scripts/changelog.ts`), so write commit
subjects as [Conventional Commits](https://www.conventionalcommits.org) with the area as scope, in words a user
understands: `feat(plan): drag an event to another day`. `feat`, `fix` and `perf` commits and breaking changes
(`feat!:`) are listed; `chore`, `ci`, `test`, `docs`, `refactor` and the like are not. A `Changelog: <text>` line in
the commit body words the entry differently, and `Changelog: skip` leaves the commit out.

- `npm version` files the commits since the last release under the new version and commits `CHANGELOG.md` with it;
  CI fails when the file is stale.
- **Release a new version** puts that version's notes in the GitHub release. **Publish to the Chrome Web Store** writes, in its
  summary, a plain-text "What's new" of that release and the ones before it, the last 10 releases at most rather than
  the whole history, ready to paste (the store's API takes no release notes).
- Preview a release's notes, by version: `npm run changelog -- --notes 3.1.0` (markdown, as in the GitHub release)
  or `npm run changelog -- --store 3.1.0` (the store text; `--releases 5` for fewer). An unreleased version gets the
  commits since the last release.

### One-time setup

The publish workflow signs in as a Google Cloud service account that the store lets publish.

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
