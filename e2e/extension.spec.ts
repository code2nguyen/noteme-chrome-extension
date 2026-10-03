import { type BrowserContext, chromium, expect, type Page, test as base } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { card, mockPhotoSources, newNote, notepadSurface, openBoard, pageSurface, shot } from './helpers';

// The unpacked Manifest V3 build in Chromium, with the real chrome.storage.local and chrome.storage.sync.
const test = base.extend<{ context: BrowserContext; newTab: () => Promise<Page> }>({
  context: async ({}, use) => {
    const extension = join(import.meta.dirname, '..', 'dist', 'noteme-chrome-extension');
    const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'noteme-')), {
      executablePath: process.env['CHROMIUM_PATH'] || undefined,
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
  await expect(page.locator('.home__photo')).toHaveAttribute('src', /1920px-Lake_Bled/);
  // Shortcuts are an optional permission: Home offers them instead of asking Chrome on its own.
  await expect(page.locator('.home__ask c2-button', { hasText: 'Show my most visited sites' })).toBeVisible();
  // Chrome's extension-page stylesheet shrinks body text to 75%; the app sets it back.
  expect(await page.evaluate(() => getComputedStyle(document.body).fontSize)).toBe('16px');
  await shot(page, '10-extension-new-tab');
});

test('2.x notes open migrated, and are only rewritten when edited', async ({ newTab }) => {
  const page = await newTab();
  await seed(page, 'local', legacyData);
  await page.reload();
  await openBoard(page);
  await expect(page.locator('ntm-note-card')).toHaveCount(2);
  await expect(page.locator('ntm-page-card')).toHaveCount(2);
  // Board order: quill (0), the 1.x note (default order 0), code (1), vocabulary (2).

  // Quill text note → notepad markdown: heading as bold, checklist as tasks, bold kept, colour dropped.
  const quill = card(page, 0);
  await expect(quill.locator('c2-notepad')).toHaveAttribute('paper-color', 'pink'); // colour index 10 of 13 → 10 % 6
  await expect(quill.locator('c2-notepad strong')).toHaveText(['Shopping list', 'coupon']);
  await expect(notepadSurface(quill)).toContainText('Remember the coupon!');
  await expect(quill.locator('c2-notepad [data-checked="true"], c2-notepad .task.checked').first()).toBeAttached();

  // 1.x record without a note type → text note with a default grid position.
  await expect(notepadSurface(card(page, 1))).toHaveText('A note from 2019');
  // Code note → a page holding its code; removed vocabulary note → a page holding the JSON.
  const pages = page.locator('ntm-page-card');
  await expect(pages.nth(0).locator('.page-card__excerpt')).toContainText('function greet(name)');
  await expect(pages.nth(1).locator('.page-card__excerpt')).toContainText('"word": "bonjour"');
  await shot(page, '11-extension-migrated-2x-data');

  // Nothing was written back yet.
  expect((await stored(page, 'local', 'ITEM_DATA__quill')).dataType).toBe('delta');
  expect((await stored(page, 'local', 'ITEM_DATA__code')).dataType).toBe('text');

  // The code opens as a JavaScript code block, and editing the page saves it as a page.
  await pages.nth(0).click();
  await expect(pageSurface(page).locator('pre')).toContainText('return `Hello ${name}`;');
  await page.locator('ntm-page-view c2-text-field').click();
  await page.keyboard.type('Greeting helper');
  await expect.poll(async () => (await stored(page, 'local', 'ITEM_DATA__code')).dataType).toBe('page');
  const code = await stored(page, 'local', 'ITEM_DATA__code');
  expect(code.properties.title).toBe('Greeting helper');
  expect(code.data).toBe('```javascript\nfunction greet(name) {\n  return `Hello ${name}`;\n}\n```');
  await page.locator('.page-bar__back').click();

  // Editing saves the migrated value.
  await notepadSurface(quill).click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' Done.');
  await expect.poll(async () => (await stored(page, 'local', 'ITEM_DATA__quill')).dataType).toBe('markdown');
  expect((await stored(page, 'local', 'ITEM_DATA__quill')).data).toBe(
    '**Shopping list**\n- [x] eggs\n- [ ] flour\nRemember the **coupon**! Done.',
  );
});

test('edits reach chrome.storage.sync and remote notes are pulled in', async ({ newTab }) => {
  const page = await newTab();
  await openBoard(page);
  await newNote(page);
  await page.keyboard.type('Synced across devices');
  const id = await card(page).evaluate((element) => element.closest('c2-masonry-item')!.getAttribute('item-id')!);

  // Writes are queued to chrome.storage.sync one every 700ms.
  await expect
    .poll(async () => (await stored(page, 'sync', `ITEM_DATA__${id}`))?.data, { timeout: 15_000 })
    .toBe('Synced across devices');
  await expect(page.getByRole('button', { name: 'Synchronize again' })).toBeVisible({ timeout: 10_000 });

  // A note written by another device, then a manual re-sync.
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
  await page.getByRole('button', { name: 'Synchronize again' }).click();
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

test('settings are kept in chrome.storage.sync', async ({ newTab }) => {
  const page = await newTab();
  await page.goto(page.url() + '?settings=1');
  await page.locator('ntm-settings-panel c2-button', { hasText: 'Sunday' }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        chrome.storage.sync
          .get('NOTEME_SETTINGS')
          .then((r) => JSON.parse(String(r['NOTEME_SETTINGS'] ?? '{}')).weekStart),
      ),
    )
    .toBe('sunday');
});
