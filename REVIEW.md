# Review guide

What a review of a Noteme pull request looks for: `/code-review`, `/security-review` and human reviewers alike. Noteme is a
new-tab notepad. People keep their notes in it for years, so **losing or corrupting a note is the worst bug there is.**
Rank findings by that.

Report a finding with a concrete failure: the steps or state that lead to it, and what the user sees. Leave out style
nits that Prettier or ESLint already settle, and findings in generated or build output (`dist/`, `test-results/`,
`CHANGELOG.md`, which `scripts/changelog.ts` writes).

## 1. Notes are never lost or corrupted

- **Saves are debounced per note and merged** (`store/effects/item-data.effects.ts`, `item-data-updates.ts`). Check
  that an edit made inside the 300 ms window still reaches storage. Look for edits dropped by a filter, overwritten by
  a later partial update, or lost when the card or view is destroyed before the save runs.
- **A delete stays deleted.** A pending save, a sync from another device or a retry must not bring back a note the
  user removed.
- **Changes from elsewhere** (another tab, another Chrome profile through `chrome.storage.sync`) arrive with a
  different `sourceId` than this tab's `INSTANCE_ID`. A component that applies them must not overwrite edits the user
  is making in it. A component that ignores its own echoes must still apply everyone else's.
- **2.x data is migrated when read, never rewritten** (`services/migration.ts`). A note keeps its stored form until the
  user edits it. Flag any code that writes migrated data back without an edit, or that drops fields 2.x stored.
- **Stored formats are a contract.** The keys (`ART_BOARD_ITEM__<id>`, `ITEM_DATA__<id>`, the board's index lists,
  `PLAN__ITEMS`, `noteme-settings`) and the shape of each `DataType` are read by older and newer versions on other
  devices. A change to them needs a reader for the old shape, and a parser that falls back instead of throwing
  (`parseSheet` is the pattern): one malformed record must not break the board.
- **Empty versus archived.** An empty note is removed instead of archived. Check that a note with unsaved text is never
  treated as empty.

## 2. Sync through the Chrome profile

- Sync is **off by default** and switched on in Settings. Nothing may read or write `chrome.storage.sync` while it is
  off.
- Only quick notes and to-do lists sync (`services/sync-policy.ts`). `chrome.storage.sync` allows 8 KB per item and
  about 100 KB in all. A write it refuses is marked for retry (`SYNC__RETRY__<key>`, one marker per key) and sent again
  as the record is then. Check new record types against the quota and the policy.
- Two tabs run at once. A list stored under one key and read-modify-written by both tabs loses one tab's change; prefer
  one key per record.

## 3. Extension and security

- **Permissions:** `storage` and `unlimitedStorage`, plus optional `topSites` and `favicon`. A new permission, host
  permission or `content_security_policy` change affects every user's install prompt and the store review. Flag it,
  and check it is requested only when the feature needs it.
- **Manifest V3:** no remote code, `eval`, `new Function` or scripts loaded from a URL.
- **Network:** the only outside calls are Wikimedia Commons (`home/background*.ts`: the search API and the photos it
  returns). A new host is a privacy question as much as a code one. Commons answers are untrusted: credits are stripped
  to plain text and rendered by interpolation. Flag `innerHTML`, `bypassSecurityTrust*` or `[innerHTML]` fed with
  anything but a constant (`flow/box-menu.ts` uses a constant glyph table).
- **Note content is untrusted too.** It can come from another device or from 2.x data. Markdown, page HTML, flow
  labels and sheet cells must not run script or load remote content when rendered. A sheet formula must not reach
  outside its sheet.
- Never log note text, and never send it anywhere.

## 4. Angular (zoneless, signals) and lifetimes

- Every `subscribe`, `addEventListener`, `ResizeObserver`, `setTimeout`/`setInterval` and `requestAnimationFrame` loop
  that can outlive its component is undone in `DestroyRef.onDestroy` or an `effect` cleanup. A document-level listener
  removed only "when the pointer moves" leaks on touch and keyboard.
- Template bindings that call methods run on every change detection. Flag parsing, `JSON.parse` or loops over note data
  there; use a `computed` instead.
- An `effect` that writes signals it reads, or that subscribes without cleaning up when its inputs change.

## 5. UI

- UI is built from c2n `c2-*` elements, styled only through their documented `--c2-*` variables. `CLAUDE.md` has the
  rules. Flag native controls without a `c2n-ignore` comment, box styles (`border`, `padding`, `background`, `color`,
  size) on a `c2-*` host, and shadow-DOM reach-ins. `npx -y @c2n/mcp validate src` must pass.
- **Text size:** Settings scales text with `--ntm-text-scale`. A size computed in TypeScript in pixels (card heights,
  row counts, menu positions) must follow it, or the layout breaks at Larger.
- Light and dark themes both, and the phone width the board supports.

## 6. Text and languages

- All user-facing text goes through `t('…')`, with the same keys in English, French and Vietnamese
  (`src/app/i18n/messages`, checked by `language.spec.ts`). The store listing and manifest strings are in
  `src/_locales/{en,fr,vi}`.
- Text inside c2n components is translated through `addTranslations` in `src/app/i18n/components`, not by patching the
  component.
- Dates and numbers are formatted through `Intl` with the app's locale, never by hand.

## 7. Tests

- A behaviour change comes with a Playwright test in `e2e/web.spec.ts`, or in `e2e/extension.spec.ts` when it depends on
  real `chrome.storage` (sync, two tabs, quota). A bug fix's test fails without the fix.
- Logic without UI (migration, parsers, sync policy, search) gets a Vitest spec next to it.
- Tests wait on a state (`expect.poll`, `toBeVisible`), not on fixed timeouts, unless the wait is the behaviour itself
  (a debounce).

## 8. Commits

Subjects are Conventional Commits with the area as scope, written for a user (`fix(sheet): …`). They become the
changelog and the store's "What's new", so flag an internal or vague subject on a `feat` or `fix` commit.
