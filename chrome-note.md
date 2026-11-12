# Chrome Web Store listing

The text of Noteme's listing, kept here to paste into the store's dashboard. The store's API uploads and publishes the
package but does not edit the listing, so the description and the permission notes below are updated by hand. Update
this file when a release changes what Noteme does or which permissions it asks for.

The store shows the description as plain text: paste the blocks as they are, without the code fences.

## Short description

Comes from the manifest (`appDescription` in `src/_locales/<language>/messages.json`), 132 characters at most. The
upload carries it, so changing it there is enough. Today it reads "Replace new tab page with a personal note
application"; a suggested replacement:

```
A personal notepad on every new tab: notes, pages, flows, to-do lists and sheets, with a photo and a quote of the day.
```

## Detailed description

Store listing → Description. The lines marked "New" describe the release after 3.0.4: paste this once that version is
published, and drop the word "New" from them at the release after.

```
Noteme turns every new tab into your own notepad. Open a tab and your notes are there, with a clock, a photo and a quote of the day.

FIVE KINDS OF NOTES, ON ONE BOARD
• Note: a quick thought on ruled paper, with bold, italic, highlighters, inks and checklists.
• Page: a full page for longer writing, with headings, lists, to-dos, quotes, code blocks and tables with sums and formulas.
• Flow: boxes and arrows for diagrams, and fields in a box to design a data schema.
• To-do list: tasks checked off right on the card, with a progress ring.
• Sheet: rows, columns and formulas, worked on its card.
Paste or drop an image into a note or a page. Move, resize and pin cards to arrange the board your way.

FIND ANYTHING, FROM ANYWHERE
• Search finds words in every note, page, table, flow, list and in the archive.
• New: search from the address bar. Type nm, a space, then a few words, in any tab. Pick a note to open it.

PLAN YOUR WEEK
• An optional week and month calendar for what you plan to do.
• New: reminders. Get a notification before a plan starts, from the moment it starts to an hour before. Off until you switch it on.

A HOME THAT FEELS GOOD
• A new photo every day or every hour from Wikimedia Commons, by theme: nature, mountains, sea, animals, space, cities and more.
• A quote of the day, your most visited sites, and your latest notes under the clock.
• Light or dark, four text sizes, in English, French and Vietnamese.

KEEP IT TIDY
• Notes you have not touched lately move to Older notes. Archive what you are done with and restore it any time.
• New: Settings shows how much room your notes, images and photos take, and how full Chrome sync is.

FASTER AND LIGHTER
• New: a new tab opens faster, and Noteme is half the size to download.

YOUR NOTES STAY YOURS
• Everything is kept on your computer. There is no account and no Noteme server.
• Sync is optional and off by default. Switched on, quick notes, to-do lists and settings follow your Chrome profile to your other computers. Pages, flows, sheets and images stay on the computer.
• The only outside service Noteme contacts is Wikimedia Commons, for the photos.
```

## Permission justifications

Privacy practices → one field per permission. `alarms` and `notifications` are new in the release after 3.0.4, and the
review asks about them. The other four are worded here for completeness: keep the text the dashboard already has if it
was approved.

```
alarms: Schedules the reminders of the user's plans. One alarm is set for each upcoming plan, only while the user has switched Reminders on in Settings.
```

```
notifications (optional): Shows a reminder before a plan starts. Requested only when the user switches Reminders on in Settings; Noteme works without it.
```

```
storage: Keeps the user's notes, plans and settings on the device, and, when the user switches Sync on, quick notes and settings in chrome.storage.sync.
```

```
unlimitedStorage: Notes, pages and sheets can exceed the default storage quota.
```

```
topSites (optional): Shows the user's most visited sites on the new tab page. Requested only when the user chooses to show them.
```

```
favicon (optional): Shows the icons of those sites.
```

The background service worker and the `nm` address-bar keyword need no permission. If the review asks about them: the
worker only answers the address bar and shows the reminders; it reads the user's notes from the device's storage and
sends nothing anywhere.

## What changes with each release

"What's new" is not written here: the publish workflow (`.github/workflows/publish.yml`) prints it in its summary,
from the changelog.
