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

## Upgrading from 2.x

Version 3 is a Manifest V3 extension and reads the data 2.x stored, unchanged:

- Text notes were Quill documents. They open converted to the notepad's markdown: bold, italic, underline, strike
  and checklists are kept, headings become bold lines, bullet and numbered lists keep a textual marker, links keep
  their URL in parentheses; colours, fonts, sizes and images are dropped. A note is only rewritten in the new
  format when you edit it.
- Vocabulary notes are gone; existing ones open as JSON code notes.
- The 13 note colours map onto the notepad's six paper colours.
