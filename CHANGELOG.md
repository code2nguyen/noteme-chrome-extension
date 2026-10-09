# Changelog

Generated from the commit history by `npm run changelog`; do not edit by hand.

## 3.0.1

### New

- Migrate to Angular 22, Manifest V3 and c2n web components
- Home: new home page with photo of the day, quote, site shortcuts and settings
- Pages: full-page notes with c2-page-editor; code notes become pages
- Sync: sync only notes through the Chrome profile; pages stay on the device
- Home: photo themes, automatic change and photos downloaded ahead
- Home: one background photo a day by default
- Board: delete button in the notepad's actions slot; @c2n 0.0.22
- Flow: flow notes, boxes and arrows drawn with c2-flow
- Plan: week and month planning with c2-week-planner and c2-month-planner
- Flow: label the arrows of a flow, and see which way they point; add a box, tidy up and fit from a toolbar
- Board: Archive notes, pages and flows to clear the board, and restore them from the Archive
- Board: Move and resize the cards on the board again with Arrange
- Flow: a box's shape, paper, ink and icon from its right-click menu; the board card draws the flow itself
- Archive as a list with a preview, Plan as an optional feature, a quieter pin, and smaller titles and toolbars
- Settings: sync with the Chrome profile only once switched on in Settings
- Board: To-do lists: a new kind of note whose tasks are checked off right on the board
- Sync: To-do lists follow you to your other computers when Sync is on
- Board: A to-do list's title is renamed right in its heading
- Home: 158 daily quotes instead of 43, still bundled and public domain
- Home: quotes by theme and tags, ordered so no two days in a row share a theme, author or tag
- Home: a random quote per new tab, kept for ten minutes, from English lists (French and Vietnamese pending)
- Home: 319 Vietnamese proverbs, folk verse and classical lines
- Home: 340 French quotes, and the lists read once per page
- Home: 70% of new quotes in the browser's language, 30% in the others
- Settings: the theme follows the system until one is picked
- Home: the photo shows through, favicons stay readable, the quote keeps to one line
- Board: a pinned card stays in place, and its pin unpins it; a to-do list fills its tile
- Theme: a teal accent beside the brick red, and a flat pin
- Board, flow: cards keep a readable size, and arrows keep the sides they were drawn between

### Fixes

- Search: find words anywhere in a page; polish the board, Home and settings on every screen
- Home: put the Notes link on glass like the rest of the bar
- Pages: a page deleted right after typing no longer leaves its text behind
- Home: Background photos no longer repeat or stall after changing the photo themes
- Home: "Change now" moves on to a downloaded photo once one is ready, and turning photos or shortcuts off always sticks
- Home: The search hint on the new tab reads ⌘ K on a Mac
- Home: The quote of the day now draws only on public-domain writers
- Plan: Times typed with a plan are checked properly, and a plan saved with only a start time lasts an hour instead of becoming all day
- Plan: Add times to an all-day plan, or clear them, in the plan dialog
- Plan: A plan added right after opening the page is no longer lost
- Page: A page no longer loses what you type while it is still loading
- Flow: A flow no longer loses a box added while it is still loading
- Board: Holding N, P or F creates a single note
- Board: Page and flow cards no longer flash "edited just now" while loading
- Store: Edits typed just before a note is deleted on another device no longer bring it back
- Sync: A note too long for Chrome sync stays on the device instead of failing to sync
- Page: Page previews no longer show a stray ")" after links whose address contains parentheses
- Settings: A settings change made while Chrome sync was unavailable is no longer undone by the next tab
- Theme: Links and hint text in the light theme are easier to read
- Sync: Notes refused by a full Chrome sync storage are sent again once room is freed
- Review fixes for the board, Archive, Plan and search
- Search: answer from the notes that loaded when reading them all fails, and read them again next time
- Search: an index built after a failed read completes instead of following note changes
- Board: lighter note papers in the dark theme, with a whiter ink to keep them readable

### Faster

- Load each screen's components with it; delete button only on hover or while writing
- Home: the quote never holds up the new tab

## 2.2.3

### Fixes

- Sync issue
