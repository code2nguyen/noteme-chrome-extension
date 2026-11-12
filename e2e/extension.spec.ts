import { type BrowserContext, chromium, expect, type Page, test as base } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { archivePreview, card, mockPhotoSources, newNote, newPage, notepadSurface, openBoard, shot } from './helpers';

// The unpacked Manifest V3 build in Chromium, with the real chrome.storage.local and chrome.storage.sync.
const test = base.extend<{ context: BrowserContext; newTab: () => Promise<Page> }>({
  context: async ({}, use) => {
    const extension = join(import.meta.dirname, '..', 'dist', 'noteme-chrome-extension');
    const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'noteme-')), {
      executablePath: process.env['CHROMIUM_PATH'] || undefined,
      // Playwright's default headless shell cannot load extensions; the full Chromium build in new headless mode can.
      channel: process.env['CHROMIUM_PATH'] ? undefined : 'chromium',
      headless: true,
      viewport: { width: 1440, height: 900 },
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    await mockPhotoSources(context);
    await use(context);
    await context.close();
  },
  newTab: async ({ context }, use) => {
    const errors: string[] = [];
    await use(async () => {
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      // The extension overrides the new tab page.
      await page.goto('chrome://newtab');
      await expect(page).toHaveTitle('Noteme');
      return page;
    });
    expect(errors, 'errors in the extension pages').toEqual([]);
  },
});

/** chrome.storage holds every record as a JSON string, as 2.x wrote it. */
function seed(page: Page, area: 'local' | 'sync', records: Record<string, unknown>): Promise<void> {
  return page.evaluate(
    ([area, records]) =>
      chrome.storage[area as 'local' | 'sync'].set(
        Object.fromEntries(Object.entries(records).map(([key, value]) => [key, JSON.stringify(value)])),
      ),
    [area, records] as const,
  );
}

async function stored(page: Page, area: 'local' | 'sync', key: string) {
  const value = await page.evaluate(([area, key]) => chrome.storage[area as 'local' | 'sync'].get(key), [area, key]);
  const raw = (value as Record<string, string>)[key];
  return raw ? JSON.parse(raw) : undefined;
}

/** Sync is on unless switched off in Settings: put the switch where the test wants it. */
async function setSync(page: Page, on: boolean): Promise<void> {
  await page.goto(page.url().split('#')[0] + '#/?settings=1');
  const control = page
    .locator('ntm-settings-panel .settings__row', { hasText: 'Sync with your Chrome profile' })
    .locator('c2-switch');
  await expect(control).toBeVisible();
  if ((await control.evaluate((element) => (element as HTMLInputElement).checked)) !== on) {
    await control.click();
  }
  await expect(control).toHaveJSProperty('checked', on);
  await page.keyboard.press('Escape');
  // Closed for good: the sheet leaves the URL once it has closed, which would close one opened again meanwhile.
  await expect(page).not.toHaveURL(/settings=1/);
}

const board = (ids: string[]) => ({
  _ART_BOARD__ART_BOARD_ITEM_IDS__defaultArtBoard: ids,
  _ART_BOARD_ITEM__IDS: ids,
});

const dates = { createdDate: '2021-03-01T10:00:00.000Z', modifiedDate: '2021-03-01T10:00:00.000Z' };
const grid = (order: number, Large = 3) => ({
  order,
  rows: 10,
  screenColumns: { Large, Medium: Large, Small: Large, XSmall: 1 },
});

// Records exactly as Noteme 2.2.5 stored them.
const legacyData = {
  ...board(['quill', 'code', 'vocab', 'v1']),
  ART_BOARD_ITEM__quill: {
    id: 'quill',
    boardId: 'defaultArtBoard',
    extensionId: 'ntm-text-note-element',
    colorIndex: 10,
    gridPosition: grid(0),
    properties: {},
    modifiedDate: dates.modifiedDate,
  },
  ITEM_DATA__quill: {
    id: 'quill',
    dataType: 'delta',
    empty: false,
    ...dates,
    data: {
      ops: [
        { insert: 'Shopping list' },
        { insert: '\n', attributes: { header: 2 } },
        { insert: 'eggs' },
        { insert: '\n', attributes: { list: 'checked' } },
        { insert: 'flour' },
        { insert: '\n', attributes: { list: 'unchecked' } },
        { insert: 'Remember the ' },
        { insert: 'coupon', attributes: { bold: true, color: '#ff0000' } },
        { insert: '!\n' },
      ],
    },
  },
  ART_BOARD_ITEM__code: {
    id: 'code',
    boardId: 'defaultArtBoard',
    extensionId: 'ntm-code-note-element',
    colorIndex: 0,
    gridPosition: grid(1, 6),
    properties: {},
    modifiedDate: dates.modifiedDate,
  },
  ITEM_DATA__code: {
    id: 'code',
    dataType: 'text',
    empty: false,
    ...dates,
    data: 'function greet(name) {\n  return `Hello ${name}`;\n}',
    properties: { language: 'javascript' },
  },
  ART_BOARD_ITEM__vocab: {
    id: 'vocab',
    boardId: 'defaultArtBoard',
    extensionId: 'vocabulary-extension',
    colorIndex: 0,
    gridPosition: grid(2, 6),
    properties: {},
    modifiedDate: dates.modifiedDate,
  },
  ITEM_DATA__vocab: {
    id: 'vocab',
    dataType: 'json',
    empty: false,
    ...dates,
    data: [{ word: 'bonjour', meaning: 'hello' }],
  },
  // A 1.x record: no extensionId, no grid position.
  ART_BOARD_ITEM__v1: {
    id: 'v1',
    boardId: 'defaultArtBoard',
    element: 'ntm-text-note-element',
    layout: { top: 161, left: 144, width: 519, height: 497 },
    properties: { color: '#1e3a5f' },
    modifiedDate: '2019-11-20T09:51:23.523Z',
  },
  ITEM_DATA__v1: {
    id: 'v1',
    dataType: 'delta',
    empty: false,
    ...dates,
    data: { ops: [{ insert: 'A note from 2019\n' }] },
  },
};

test('the extension replaces the new tab page', async ({ newTab }) => {
  const page = await newTab();
  expect(page.url()).toMatch(/^chrome-extension:\/\/[a-p]{32}\/index\.html#\/$/);
  await expect(page.locator('.home__time')).toBeVisible();
  await expect(page.locator('.home__photo')).toHaveAttribute('src', /^(blob:|assets\/bg\/)/);
  // Shortcuts are an optional permission: Home offers them instead of asking Chrome on its own.
  await expect(page.locator('.home__ask c2-button', { hasText: 'Show my most visited sites' })).toBeVisible();
  // Chrome's extension-page stylesheet shrinks body text to 75%; the app sets it back.
  expect(await page.evaluate(() => getComputedStyle(document.body).fontSize)).toBe('16px');
  await shot(page, '10-extension-new-tab');
});

test('2.x text notes open migrated, and are only rewritten when edited', async ({ newTab }) => {
  const page = await newTab();
  await seed(page, 'local', legacyData);
  await page.reload();
  await openBoard(page);
  // Code and vocabulary notes are not carried over: only the two text notes show.
  await expect(page.locator('ntm-note-card')).toHaveCount(2);
  await expect(page.locator('ntm-page-card')).toHaveCount(0);

  // Quill text note → notepad markdown: heading as bold, checklist as tasks, bold kept, colour dropped.
  const quill = card(page, 0);
  await expect(quill.locator('c2-notepad')).toHaveAttribute('paper-color', 'pink'); // colour index 10 of 13 → 10 % 6
  await expect(quill.locator('c2-notepad strong')).toHaveText(['Shopping list', 'coupon']);
  await expect(notepadSurface(quill)).toContainText('Remember the coupon!');
  await expect(quill.locator('c2-notepad [data-checked="true"], c2-notepad .task.checked').first()).toBeAttached();

  // 1.x record without a note type → text note with a default grid position.
  await expect(notepadSurface(card(page, 1))).toHaveText('A note from 2019');
  await shot(page, '11-extension-migrated-2x-data');

  // Nothing was written back yet.
  expect((await stored(page, 'local', 'ITEM_DATA__quill')).dataType).toBe('delta');

  // Editing saves the migrated value.
  await notepadSurface(quill).click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' Done.');
  await expect.poll(async () => (await stored(page, 'local', 'ITEM_DATA__quill')).dataType).toBe('markdown');
  expect((await stored(page, 'local', 'ITEM_DATA__quill')).data).toBe(
    '**Shopping list**\n- [x] eggs\n- [ ] flour\nRemember the **coupon**! Done.',
  );
});

test('with sync switched off nothing reaches chrome.storage.sync; switched on again, what was written goes up', async ({
  newTab,
}) => {
  const page = await newTab();
  await setSync(page, false);
  await openBoard(page);
  await newNote(page);
  await page.keyboard.type('Kept on this computer');
  const id = await card(page).evaluate((element) => element.closest('c2-masonry-item')!.getAttribute('item-id')!);
  await expect.poll(async () => (await stored(page, 'local', `ITEM_DATA__${id}`))?.data).toBe('Kept on this computer');
  await page.waitForTimeout(1500);
  // Neither the note nor its card: only what went up before the switch was turned off (the settings) is there.
  const synced = Object.keys(await page.evaluate(() => chrome.storage.sync.get(null)));
  expect(synced.filter((key) => key.includes(id))).toEqual([]);

  await setSync(page, true);
  await expect
    .poll(async () => (await stored(page, 'sync', `ITEM_DATA__${id}`))?.data, { timeout: 15_000 })
    .toBe('Kept on this computer');
  await expect.poll(async () => (await stored(page, 'sync', 'NOTEME_SETTINGS'))?.sync).toBe(true);
});

test('a new profile syncs without being asked, and Settings says how the sync is going', async ({ newTab }) => {
  const page = await newTab();
  await openBoard(page);
  await newNote(page);
  await page.keyboard.type('Synced from the start');
  const id = await card(page).evaluate((element) => element.closest('c2-masonry-item')!.getAttribute('item-id')!);
  await expect
    .poll(async () => (await stored(page, 'sync', `ITEM_DATA__${id}`))?.data, { timeout: 15_000 })
    .toBe('Synced from the start');

  await page.goto(page.url().split('#')[0] + '#/?settings=1');
  const panel = page.locator('ntm-settings-panel');
  const status = panel.locator('.settings__sync-status');
  await expect(status).toContainText(/^Synced /);
  await expect(panel.locator('c2-banner')).toHaveCount(0);

  // "Sync now" takes in what the profile holds: a note another computer wrote.
  await seed(page, 'sync', {
    ART_BOARD_ITEM__remote: {
      id: 'remote',
      boardId: 'defaultArtBoard',
      extensionId: 'ntm-text-note-element',
      colorIndex: 3,
      gridPosition: grid(1),
      properties: {},
      modifiedDate: dates.modifiedDate,
    },
    ITEM_DATA__remote: { id: 'remote', dataType: 'markdown', empty: false, ...dates, data: 'From the other computer' },
  });
  await status.locator('c2-icon-button').click();
  await expect
    .poll(async () => (await stored(page, 'local', 'ITEM_DATA__remote'))?.data)
    .toBe('From the other computer');
  await expect(status).toContainText(/^Synced /);

  // What chrome.storage.sync refuses is said here, in words, until it goes through.
  await seed(page, 'local', {
    DEVICE__SYNC_STATUS: {
      at: Date.now(),
      error: { kind: 'full', detail: 'QUOTA_BYTES quota exceeded', at: Date.now() },
    },
  });
  await expect(panel.locator('c2-banner')).toContainText('Chrome sync is full');
  await panel.locator('.settings__sync-status').scrollIntoViewIfNeeded();
  await shot(page, 'extension-settings-sync-status');
  // Switched off, there is no status to give.
  await panel.locator('.settings__row', { hasText: 'Sync with your Chrome profile' }).locator('c2-switch').click();
  await expect(status).toHaveCount(0);
  await expect(panel.locator('c2-banner')).toHaveCount(0);
});

test('edits reach chrome.storage.sync and remote notes are pulled in', async ({ newTab }) => {
  const page = await newTab();
  await setSync(page, true);
  await openBoard(page);
  await newNote(page);
  await page.keyboard.type('Synced across devices');
  const id = await card(page).evaluate((element) => element.closest('c2-masonry-item')!.getAttribute('item-id')!);

  // Writes are queued to chrome.storage.sync one every 700ms.
  await expect
    .poll(async () => (await stored(page, 'sync', `ITEM_DATA__${id}`))?.data, { timeout: 15_000 })
    .toBe('Synced across devices');
  // Sync has no indicator: nothing to see on the board.
  await expect(page.getByRole('button', { name: 'Synchronize again' })).toHaveCount(0);

  // A note written by another device, pulled in when the tab comes back into view.
  await seed(page, 'sync', {
    ART_BOARD_ITEM__remote: {
      id: 'remote',
      boardId: 'defaultArtBoard',
      extensionId: 'ntm-text-note-element',
      colorIndex: 2,
      gridPosition: grid(-10),
      properties: {},
      modifiedDate: new Date().toISOString(),
      sourceId: 'other-device',
    },
    ITEM_DATA__remote: {
      id: 'remote',
      dataType: 'markdown',
      empty: false,
      data: 'Written on my laptop',
      ...dates,
      sourceId: 'other-device',
    },
  });
  // Only in the sync until the tab pulls it in: the board's own copy is made by the pull, not by the seeding.
  expect(await stored(page, 'local', 'ITEM_DATA__remote')).toBeUndefined();
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(async () => (await stored(page, 'local', 'ITEM_DATA__remote'))?.data).toBe('Written on my laptop');
  await expect(page.locator('ntm-note-card')).toHaveCount(2);
  await expect(page.locator('c2-notepad .ProseMirror', { hasText: 'Written on my laptop' })).toBeVisible();
  await shot(page, '12-extension-synced');
});

test('an edit in one tab shows up in another open tab', async ({ newTab }) => {
  const first = await newTab();
  await openBoard(first);
  await newNote(first);
  await first.keyboard.type('Draft');
  await first.waitForTimeout(500);

  const second = await newTab();
  await openBoard(second);
  await expect(notepadSurface(card(second))).toHaveText('Draft');

  await first.bringToFront();
  await notepadSurface(card(first)).click();
  await first.keyboard.press('End');
  await first.keyboard.type(' v2');
  await expect(notepadSurface(card(second))).toHaveText('Draft v2');

  await newNote(first);
  await expect(second.locator('ntm-note-card')).toHaveCount(2);
});

test('settings are kept in chrome.storage.sync once sync is on', async ({ newTab }) => {
  const page = await newTab();
  await setSync(page, true);
  await page.goto(page.url().split('#')[0] + '#/?settings=1');
  const synced = () =>
    page.evaluate(() =>
      chrome.storage.sync.get('NOTEME_SETTINGS').then((r) => JSON.parse(String(r['NOTEME_SETTINGS'] ?? '{}'))),
    );
  // Plan is off until chosen under Features; its week settings come with it.
  await page.locator('ntm-settings-panel c2-select.settings__features').click();
  await page.locator('c2-list-item', { hasText: 'A week and month calendar' }).click();
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await synced()).features).toEqual(['plan']);
  await page.locator('ntm-settings-panel c2-button', { hasText: 'Sunday' }).click();
  await expect.poll(async () => (await synced()).weekStart).toBe('sunday');
});

test('notes sync through the Chrome profile; pages stay on this computer', async ({ newTab }) => {
  const page = await newTab();
  await setSync(page, true);
  await openBoard(page);
  await newNote(page);
  await page.keyboard.type('Synced note');
  const noteId = await card(page).evaluate((element) => element.closest('c2-masonry-item')!.getAttribute('item-id')!);
  await newPage(page);
  await page.keyboard.type('Long page');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Pages are written locally only.');
  const pageId = page.url().match(/page\/([\w-]+)/)![1];

  await expect
    .poll(async () => (await stored(page, 'sync', `ITEM_DATA__${noteId}`))?.data, { timeout: 15_000 })
    .toBe('Synced note');
  await expect
    .poll(async () => (await stored(page, 'local', `ITEM_DATA__${pageId}`))?.properties?.title)
    .toBe('Long page');
  await expect
    .poll(async () => JSON.stringify((await stored(page, 'local', `ITEM_DATA__${pageId}`))?.data))
    .toContain('Pages are written locally only.');

  // Every page write is now in local storage, and a record that syncs joins the sync queue (first in, first out, one
  // write every 700ms) as its local write completes. Edit the note in the same document: its record joins the queue
  // behind anything the page could have put there, so once the edit reaches sync, the page's records would have too.
  await page.locator('ntm-page-view .page-bar__back').click();
  await expect(card(page)).toBeVisible();
  await notepadSurface(card(page)).click();
  await page.keyboard.press('End');
  await page.keyboard.type(' again');
  await expect
    .poll(async () => (await stored(page, 'sync', `ITEM_DATA__${noteId}`))?.data, { timeout: 15_000 })
    .toBe('Synced note again');
  expect(await stored(page, 'sync', `ITEM_DATA__${pageId}`)).toBeUndefined();
  expect(await stored(page, 'sync', `ART_BOARD_ITEM__${pageId}`)).toBeUndefined();
  expect(await stored(page, 'sync', `ART_BOARD_ITEM__${noteId}`)).toBeDefined();
});

test('Settings says how much room the notes take, and Chrome sync while it is on', async ({ newTab }) => {
  const page = await newTab();
  await page.goto(page.url().split('#')[0] + '#/?settings=1');
  const storage = page.locator('ntm-settings-panel .settings__storage');
  const device = storage.locator('c2-distribution-bar');
  await expect(device).toContainText('On this computer');
  await expect(device.locator('.settings__value')).toHaveText(/^[\d.,]+ (kB|MB)$/);
  // Each part names its size in the legend, inside the bar's shadow root.
  await expect(device.getByText(/^Notes · [\d.,]+ (kB|MB)$/)).toBeVisible();
  await expect(device.getByText(/^Images and photos · [\d.,]+ (kB|MB)$/)).toBeVisible();
  const quota = storage.locator('c2-meter');
  await expect(quota).toContainText('Chrome sync');
  await expect(quota.getByText(/of 100 kB/)).toBeVisible();
  await storage.scrollIntoViewIfNeeded();
  await shot(page, 'extension-settings-storage');
  // What stays on the computer is explained behind the heading's (i).
  await storage.locator('c2-toggletip').getByRole('button').click();
  await expect(storage.locator('c2-toggletip')).toContainText('kept on this computer only');
  await page.waitForTimeout(400);
  await shot(page, 'extension-settings-help');
  // Chrome sync is not read, and not shown, while sync is off.
  await page
    .locator('ntm-settings-panel .settings__row', { hasText: 'Sync with your Chrome profile' })
    .locator('c2-switch')
    .click();
  await expect(storage.locator('c2-meter')).toHaveCount(0);
});

/** The background service worker, started by Chrome with the extension. */
async function worker(context: BrowserContext) {
  return context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
}

test('a plan has a reminder alarm while reminders are on', async ({ context, newTab }) => {
  const page = await newTab();
  const background = await worker(context);
  const alarms = () =>
    background.evaluate(async () =>
      (await chrome.alarms.getAll()).map((alarm) => ({ name: alarm.name, when: alarm.scheduledTime })),
    );
  // Plan on, as Settings › Features switches it.
  await page.goto(page.url().split('#')[0] + '#/?settings=1');
  await page.locator('ntm-settings-panel .settings__features').click();
  await page.locator('ntm-settings-panel .settings__features c2-list-item', { hasText: 'Plan' }).click();
  await page.keyboard.press('Escape');
  await expect(
    page.locator('ntm-settings-panel .settings__row', { hasText: 'Reminders' }).locator('c2-switch'),
  ).toBeVisible();
  await shot(page, 'extension-settings-reminders');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = [tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
  const device = { language: 'auto', clock: '24h', plan: true, reminderLead: 15 };
  await seed(page, 'local', {
    PLAN__ITEMS: {
      items: [
        { id: 'dentist', title: 'Dentist', date: day, start: '10:00', end: '11:00' },
        { id: 'trip', title: 'Trip', date: day },
        { id: 'past', title: 'Done', date: '2020-01-01', start: '10:00', end: '11:00' },
      ],
    },
    DEVICE__SETTINGS: { ...device, reminders: true },
  });
  const at = (hours: number, minutes: number) => new Date(tomorrow).setHours(hours, minutes, 0, 0);
  // A quarter of an hour before the dentist, and at 9:00 for the trip; nothing for what is over.
  await expect.poll(alarms).toEqual([
    { name: 'plan:trip', when: at(9, 0) },
    { name: 'plan:dentist', when: at(9, 45) },
  ]);

  // The plan moved to the afternoon: its alarm follows.
  await seed(page, 'local', {
    PLAN__ITEMS: { items: [{ id: 'dentist', title: 'Dentist', date: day, start: '15:00', end: '16:00' }] },
  });
  await expect.poll(alarms).toEqual([{ name: 'plan:dentist', when: at(14, 45) }]);

  await seed(page, 'local', { DEVICE__SETTINGS: { ...device, reminders: false } });
  await expect.poll(alarms).toEqual([]);
  // The record is this device's: it never goes to chrome.storage.sync.
  expect(await stored(page, 'sync', 'DEVICE__SETTINGS')).toBeUndefined();
});

test('"nm" in the address bar searches the notes', async ({ context, newTab }) => {
  const page = await newTab();
  const base = page.url().split('#')[0];
  await seed(page, 'local', {
    ...board(['shopping']),
    ART_BOARD_ITEM__shopping: {
      id: 'shopping',
      boardId: 'defaultArtBoard',
      extensionId: 'ntm-text-note-element',
      colorIndex: 1,
      gridPosition: grid(0),
      properties: {},
      modifiedDate: dates.modifiedDate,
    },
    ITEM_DATA__shopping: { id: 'shopping', dataType: 'markdown', empty: false, ...dates, data: 'Oat milk <b>\neggs' },
    // Archived: not on the board.
    ART_BOARD_ITEM__recipe: {
      id: 'recipe',
      extensionId: 'ntm-text-note-element',
      colorIndex: 2,
      gridPosition: grid(2),
      properties: {},
      modifiedDate: dates.modifiedDate,
    },
    ITEM_DATA__recipe: { id: 'recipe', dataType: 'markdown', empty: false, ...dates, data: 'Rice milk pudding' },
    ART_BOARD_ITEM__trip: {
      id: 'trip',
      extensionId: 'ntm-page',
      colorIndex: 0,
      gridPosition: grid(1),
      properties: {},
      modifiedDate: dates.modifiedDate,
    },
    ITEM_DATA__trip: {
      id: 'trip',
      dataType: 'page',
      empty: false,
      ...dates,
      data: 'Lisbon, then Porto. Buy milk.',
      properties: { title: 'Trip' },
    },
  });

  // What Chrome asks the worker as words are typed after "nm ", and what it answers.
  const background = await worker(context);
  const suggestions = await background.evaluate(
    () =>
      new Promise((resolve) => {
        const event = chrome.omnibox.onInputChanged as unknown as {
          dispatch(text: string, suggest: (rows: unknown) => void): void;
        };
        event.dispatch('milk', resolve);
      }),
  );
  // In the search's order of best match; here, by what each row says.
  const rows = (suggestions as { content: string; description: string }[]).sort((a, b) =>
    a.description.localeCompare(b.description),
  );
  expect(rows).toEqual([
    { content: `${base}#/main-board?show=shopping`, description: 'Oat milk &lt;b&gt; <dim>Note</dim>' },
    // An archived note has a row, and an address, of its own.
    {
      content: `${base}#/main-board?view=archive&note=recipe`,
      description: 'Rice milk pudding <dim>Note · Archive</dim>',
    },
    { content: `${base}#/page/trip?from=archive`, description: 'Trip <dim>Paper · Archive</dim>' },
  ]);

  // A row picked opens its note: the board, with the note lit up.
  await page.goto(`${base}#/main-board?show=shopping`);
  await expect(card(page)).toContainText('Oat milk');
  // An archived note opens the Archive on it.
  await page.goto(`${base}#/main-board?view=archive&note=recipe`);
  await expect(archivePreview(page)).toContainText('Rice milk pudding');
  // Words entered as they are: the board's search, on them.
  await page.goto(`${base}#/main-board?search=1&q=porto`);
  const search = page.locator('ntm-board .navbar__search-field');
  await expect(search).toHaveJSProperty('value', 'porto');
  await expect(search).toHaveJSProperty('open', true);
  await expect(search.locator('c2-list-item', { hasText: 'Trip' })).toBeVisible();
  await expect(page).toHaveURL(/#\/main-board$/);
  await shot(page, 'extension-omnibox-search');
});
