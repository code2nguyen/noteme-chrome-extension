import { expect, type Page, test as base } from '@playwright/test';
import {
  backgroundState,
  nextDay,
  card,
  commonsCredits,
  focusedTag,
  mockPhotoSources,
  newNote,
  newPage,
  notepadSurface,
  openBoard,
  pageSurface,
  shot,
  tiles,
} from './helpers';

// The production build served as a web page: storage is localStorage (DevStorageApi). Every test fails on an
// uncaught error or a console error.
const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await use(errors);
      expect(errors, 'errors in the page').toEqual([]);
    },
    { auto: true },
  ],
});

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Add to a page's or flow's title and choose an item of its menu, as typing and then a quick click would, but in one
 * go in the page: the menu then always acts while that edit still waits for its save (300ms), however slow the
 * machine. A zero timeout in between lets Angular render the edit first, as it would between a key and a click; it
 * is due long before the save's timer, so it runs first.
 */
const editTitleAndChoose = (page: Page, title: string, menu: string, text: string, value: string) =>
  page.evaluate(
    async ([title, menu, text, value]) => {
      const field = document.querySelector(title) as HTMLElement & { value: string };
      field.value += text;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve));
      document.querySelector(menu)!.dispatchEvent(new CustomEvent('menu-select', { detail: { value } }));
    },
    [title, menu, text, value],
  );
const PAGE_TITLE = 'ntm-page-view c2-text-field.page__title';
const PAGE_MENU = 'ntm-page-view c2-menu';

/** Wait for a page or flow title to be stored (saves are debounced), rather than for a fixed time. */
const saved = (page: Page, title: string) =>
  expect
    .poll(() =>
      page.evaluate(() =>
        Object.entries(localStorage)
          .filter(([key]) => key.startsWith('noteme-dev:ITEM_DATA__'))
          .map(([, value]) => JSON.parse(value).properties?.title),
      ),
    )
    .toContain(title);

test.beforeEach(async ({ page }) => {
  await mockPhotoSources(page);
  await page.goto('/');
});

test('home shows the clock, a photo and the quote, and opens the board', async ({ page }) => {
  await expect(page.locator('.home__time')).toHaveText(/^\d{2}:\d{2}$/);
  await expect(page.locator('.home__date')).toContainText(String(new Date().getFullYear()));
  // A bundled photo stands in on the very first tab, then the first downloaded one takes over.
  await expect(page.locator('.home__credit a')).toHaveText(new RegExp(commonsCredits.map(escape).join('|')));
  await expect(page.locator('.home__photo')).toHaveAttribute('src', /^blob:/);
  await expect(page.locator('.home__quote blockquote')).not.toBeEmpty();
  // Site shortcuts need chrome.topSites: nothing to show in a plain web page.
  await expect(page.locator('.home__sites, .home__ask')).toHaveCount(0);
  await shot(page, '01-home');
  await openBoard(page);
  await expect(page).toHaveURL(/#\/main-board$/);
  await expect(page.locator('.board__empty')).toHaveText(
    'Nothing here yet. Press N for a note, P for a page or F for a flow.',
  );
  await shot(page, '02-board-empty');
});

test('a note is focused on creation, saved and restored after a reload', async ({ page }) => {
  await openBoard(page);
  const note = await newNote(page);
  // Typing right away must land in the new note (spaces included), not on the button that created it.
  await page.keyboard.type('Buy milk and bread');
  await expect(notepadSurface(note)).toHaveText('Buy milk and bread');
  await expect(page.locator('ntm-note-card')).toHaveCount(1);
  await page.waitForTimeout(500); // edits are saved after a 300ms debounce
  await shot(page, '03-text-note');

  await page.reload();
  await openBoard(page);
  await expect(notepadSurface(card(page))).toHaveText('Buy milk and bread');
});

test('notepad formatting is stored as markdown', async ({ page }) => {
  await openBoard(page);
  const note = await newNote(page);
  await page.keyboard.type('plain ');
  await page.keyboard.press('Control+b');
  await page.keyboard.type('bold');
  await page.waitForTimeout(500);
  const stored = await page.evaluate(() =>
    Object.entries(localStorage)
      .filter(([key]) => key.startsWith('noteme-dev:ITEM_DATA__'))
      .map(([, value]) => JSON.parse(value)),
  );
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({ dataType: 'markdown', data: 'plain **bold**' });
  await expect(note.locator('c2-notepad strong')).toHaveText('bold');
});

test('a page is written full screen, with markdown and code, and shows as a card', async ({ page }) => {
  await openBoard(page);
  await newPage(page);
  await page.keyboard.type('Setting up the new laptop');
  await page.keyboard.press('Enter'); // from the title to the page
  await expect.poll(() => focusedTag(page)).toBe('c2-page-editor');
  await page.keyboard.type('## Install');
  await page.keyboard.press('Enter');
  await page.keyboard.type('[] Back up the old laptop');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('```sh');
  await page.keyboard.press('Enter');
  await page.keyboard.type('brew install node git');
  const surface = pageSurface(page);
  await expect(surface.locator('h2')).toHaveText('Install');
  await expect(surface.locator('pre')).toContainText('brew install node git');
  await expect(page.locator('.page-bar__status')).toHaveText(/^Saved/);
  await shot(page, '04-page');

  const stored = await page.evaluate(() =>
    Object.entries(localStorage)
      .filter(([key]) => key.startsWith('noteme-dev:ITEM_DATA__'))
      .map(([, value]) => JSON.parse(value)),
  );
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({ dataType: 'page', properties: { title: 'Setting up the new laptop' } });
  expect(stored[0].data).toContain('## Install');
  expect(stored[0].data).toContain('- [ ] Back up the old laptop');
  expect(stored[0].data).toContain('```sh\nbrew install node git\n```');

  // Reloading the page keeps it; back on the board it is a card that opens it again.
  await page.reload();
  await expect(page.locator('ntm-page-view c2-text-field')).toHaveJSProperty('value', 'Setting up the new laptop');
  await expect(pageSurface(page).locator('h2')).toHaveText('Install');
  await page.locator('.page-bar__back').click();
  const pageCard = page.locator('ntm-page-card');
  await expect(pageCard.locator('.page-card__title')).toHaveText('Setting up the new laptop');
  await expect(pageCard.locator('.page-card__excerpt')).toContainText('Install · Back up the old laptop');
  await shot(page, '05-board-with-page');
  await pageCard.click();
  await expect(pageSurface(page)).toContainText('Back up the old laptop');
});

test('a page left empty is not kept, and a page can be deleted', async ({ page }) => {
  await openBoard(page);
  await newPage(page);
  await page.locator('.page-bar__back').click();
  await expect(page.locator('.board__empty')).toBeVisible();
  await expect(tiles(page)).toHaveCount(0);

  await newPage(page);
  await page.keyboard.type('Short-lived');
  await page.locator('ntm-page-view c2-icon-button[aria-label="Page actions"]').click();
  await page.locator('ntm-page-view c2-menu-item[value="delete"]').click();
  await expect(page).toHaveURL(/#\/main-board$/);
  await expect(tiles(page)).toHaveCount(0);
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes('ITEM_DATA__')));
  expect(keys).toEqual([]);
});

test('a page shows its editor only once its stored data is read', async ({ page }) => {
  await openBoard(page);
  await newPage(page);
  await page.keyboard.type('Alpha');
  await saved(page, 'Alpha');
  await page.reload();
  await expect(page.locator('ntm-page-view c2-text-field')).toHaveJSProperty('value', 'Alpha');
  await expect(page.locator('ntm-page-view c2-page-editor')).toHaveCount(1);
  await expect(page.locator('ntm-page-view main[aria-busy]')).toHaveCount(0);
  await expect(page.locator('.page-bar__status')).not.toHaveText('Loading…');

  await page.goto(`/#/page/${crypto.randomUUID()}`);
  await expect(page.locator('ntm-page-view .page--missing')).toBeVisible();
  await expect(page.locator('ntm-page-view c2-page-editor')).toHaveCount(0);
});

test('a page or flow view reused for another one shows that one', async ({ page }) => {
  const idOf = () => new URL(page.url()).hash.match(/^#\/(?:page|flow)\/([\w-]+)/)![1];
  await openBoard(page);
  const pages: Record<string, string> = {};
  for (const title of ['Alpha', 'Beta']) {
    await newPage(page);
    await page.keyboard.type(title);
    pages[title] = idOf();
    await saved(page, title);
    await page.locator('.page-bar__back').click();
  }
  const pageTitle = page.locator('ntm-page-view c2-text-field');
  for (const title of ['Alpha', 'Beta', 'Alpha']) {
    await page.evaluate((id) => (location.hash = `#/page/${id}`), pages[title]);
    await expect(pageTitle).toHaveJSProperty('value', title);
  }

  await page.locator('.page-bar__back').click();
  const flows: Record<string, string> = {};
  for (const title of ['Gamma', 'Delta']) {
    await page.keyboard.press('f');
    await expect(page).toHaveURL(/#\/flow\/[\w-]+\?new=1$/);
    await expect.poll(() => focusedTag(page)).toBe('c2-text-field');
    await page.keyboard.type(title);
    flows[title] = idOf();
    await saved(page, title);
    await page.locator('.flow-bar__back').click();
    await expect(page.locator('ntm-board')).toBeVisible();
  }
  const flowTitle = page.locator('ntm-flow-view c2-text-field.flow__title');
  for (const title of ['Gamma', 'Delta', 'Gamma']) {
    await page.evaluate((id) => (location.hash = `#/flow/${id}`), flows[title]);
    await expect(flowTitle).toHaveJSProperty('value', title);
  }
});

test('a new page or flow left immediately is not kept', async ({ page }) => {
  const itemDataKeys = () =>
    page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes('ITEM_DATA__')));
  await openBoard(page);
  for (const [key, route] of [
    ['p', 'page'],
    ['f', 'flow'],
  ]) {
    await page.keyboard.press(key);
    await expect(page).toHaveURL(new RegExp(`#/${route}/[\\w-]+\\?new=1$`));
    await page.goBack();
    await expect(page).toHaveURL(/#\/main-board$/);
    await expect(page.locator('ntm-board')).toBeVisible();
    await expect(tiles(page)).toHaveCount(0);
    await expect.poll(itemDataKeys).toEqual([]);
  }
});

test('holding P creates a single page', async ({ page }) => {
  await openBoard(page);
  // A held key repeats: the second and third keydown carry `repeat`.
  for (let i = 0; i < 3; i++) {
    await page.keyboard.down('p');
  }
  await page.keyboard.up('p');
  await expect(page).toHaveURL(/#\/page\/[\w-]+\?new=1$/);
  await expect.poll(() => focusedTag(page)).toBe('c2-text-field');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('Held');
  await saved(page, 'Held');
  await page.locator('.page-bar__back').click();
  await expect(page.locator('ntm-page-card')).toHaveCount(1);
  await expect(tiles(page)).toHaveCount(1);
  const boardIds = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('noteme-dev:_ART_BOARD__ART_BOARD_ITEM_IDS__defaultArtBoard') ?? '[]'),
  );
  expect(boardIds).toHaveLength(1);
});

test('N and P start a note or a page from the keyboard', async ({ page }) => {
  await openBoard(page);
  await page.keyboard.press('n');
  await expect(page.locator('ntm-note-card')).toHaveCount(1);
  await expect.poll(() => focusedTag(page)).toBe('c2-notepad');
  // Typing in a note never starts another one.
  await page.keyboard.type('no new pages');
  await expect(page.locator('ntm-note-card')).toHaveCount(1);
  await page.locator('c2-masonry').click({ position: { x: 5, y: 5 }, force: true });
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('p');
  await expect(page).toHaveURL(/#\/page\//);
});

test('delete a note', async ({ page }) => {
  await openBoard(page);
  await newNote(page);
  await page.keyboard.type('Delete me');
  await page.waitForTimeout(500);
  await card(page).getByRole('button', { name: 'Note actions' }).click();
  await expect(card(page).locator('c2-menu-item[value="delete"]')).toBeVisible();
  await shot(page, '06-delete-confirm');
  await card(page).locator('c2-menu-item[value="delete"]').click();
  await expect(page.locator('ntm-note-card')).toHaveCount(0);
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes('ITEM_DATA__')));
  expect(keys).toEqual([]);
});

test('search finds a note and highlights it, and opens a page', async ({ page }) => {
  await openBoard(page);
  for (const text of ['Groceries: apples, pears', 'Meeting with Linh on Friday', 'Release checklist']) {
    await newNote(page);
    await page.keyboard.type(text);
  }
  await newPage(page);
  await page.keyboard.type('Trip to Da Lat');
  await page.keyboard.press('Enter');
  await page.keyboard.type('The bus leaves Friday at 22:00');
  await page.waitForTimeout(500);
  await page.locator('.page-bar__back').click();

  const search = page.locator('c2-autocomplete input');
  await search.click();
  await search.pressSequentially('meeting');
  const suggestion = page.locator('c2-autocomplete c2-list-item', { hasText: 'Meeting with Linh on Friday' });
  await expect(suggestion).toBeVisible();
  await expect(page.locator('c2-autocomplete c2-list-item')).toHaveCount(1);
  await shot(page, '07-search');

  await suggestion.click();
  await expect(search).toHaveValue('');
  await expect(page.locator('ntm-note-card.note--blink')).toHaveCount(1);
  await expect(notepadSurface(page.locator('ntm-note-card.note--blink'))).toHaveText('Meeting with Linh on Friday');

  // Words inside a page find it too, and choosing it opens it.
  await search.click();
  await search.pressSequentially('bus leaves');
  const pageResult = page.locator('c2-autocomplete c2-list-item', { hasText: 'Trip to Da Lat' });
  await expect(pageResult).toContainText('Page ·');
  await pageResult.click();
  await expect(page).toHaveURL(/#\/page\/[\w-]+$/);
  await expect(pageSurface(page)).toHaveText('The bus leaves Friday at 22:00');
});

test('a note archived by an older version is found by the search and comes back', async ({ page }) => {
  await page.evaluate(() => {
    const set = (key: string, value: unknown) => localStorage.setItem(`noteme-dev:${key}`, JSON.stringify(value));
    const dates = { createdDate: '2024-03-01T10:00:00.000Z', modifiedDate: '2024-03-01T10:00:00.000Z' };
    set('_ART_BOARD_ITEM__IDS', ['old']);
    set('ART_BOARD_ITEM__old', {
      id: 'old',
      extensionId: 'ntm-text-note-element',
      colorIndex: 1,
      gridPosition: { order: 0, rows: 10, screenColumns: { Large: 3, Medium: 3, Small: 3, XSmall: 1 } },
      properties: {},
      modifiedDate: dates.modifiedDate,
    });
    set('ITEM_DATA__old', { id: 'old', dataType: 'markdown', empty: false, data: 'Recipe for lemon tart', ...dates });
  });
  await page.reload();
  await openBoard(page);
  await expect(page.locator('ntm-note-card')).toHaveCount(0);
  await page.locator('c2-autocomplete input').pressSequentially('lemon');
  await page.locator('c2-autocomplete c2-list-item', { hasText: 'Recipe for lemon tart' }).click();
  await expect(page.locator('ntm-note-card')).toHaveCount(1);
  await expect(notepadSurface(card(page))).toHaveText('Recipe for lemon tart');
});

test('changing the paper colour is saved on the note', async ({ page }) => {
  await openBoard(page);
  const note = await newNote(page);
  await page.keyboard.type('Colourful');
  const notepad = note.locator('c2-notepad');
  await notepad.getByRole('button', { name: /paper/i }).first().click();
  await notepad.getByRole('radio', { name: /pink/i }).click();
  await expect(notepad).toHaveAttribute('paper-color', 'pink');
  await notepad.getByRole('radio', { name: /legal pad/i }).click();
  await expect(notepad).toHaveAttribute('pad', 'legal');
  await page.waitForTimeout(400);
  await shot(page, '08-paper-colour');
  await page.reload();
  await openBoard(page);
  await expect(card(page).locator('c2-notepad')).toHaveAttribute('paper-color', 'pink');
  await expect(card(page).locator('c2-notepad')).toHaveAttribute('pad', 'legal');
});

test('archive a note, find it in the Archive and restore it to the board', async ({ page }) => {
  await openBoard(page);
  await newNote(page);
  await page.keyboard.type('Keep me for later');
  await page.waitForTimeout(500); // an empty note is deleted rather than archived: let the text be saved
  await card(page).getByRole('button', { name: 'Note actions' }).click();
  await card(page).locator('c2-menu-item[value="archive"]').click();
  await expect(page.locator('ntm-note-card')).toHaveCount(0);

  await page.locator('.navbar__views c2-button[value="archive"]').click();
  await expect(page).toHaveURL(/#\/main-board\?view=archive$/);
  await expect(page.locator('.navbar__title')).toHaveText('Archive');
  await expect(page.locator('ntm-note-card')).toHaveCount(1);
  await expect(notepadSurface(card(page))).toHaveText('Keep me for later');
  // Arranging is for the board only.
  await expect(page.getByRole('button', { name: 'Arrange' })).toHaveCount(0);
  await shot(page, '09-archive');

  await card(page).getByRole('button', { name: 'Note actions' }).click();
  await expect(card(page).locator('c2-menu-item[value="archive"]')).toHaveCount(0);
  await card(page).locator('c2-menu-item[value="restore"]').click();
  await expect(page.locator('ntm-note-card')).toHaveCount(0);
  await expect(page.locator('.board__empty')).toHaveText('The archive is empty.');

  await page.locator('.navbar__views c2-button[value="notes"]').click();
  await expect(page).toHaveURL(/#\/main-board$/);
  await expect(page.locator('ntm-note-card')).toHaveCount(1);
  await expect(notepadSurface(card(page))).toHaveText('Keep me for later');
  await page.reload();
  await openBoard(page);
  await expect(notepadSurface(card(page))).toHaveText('Keep me for later');
});

test('the Archive view filters by the search, and N brings back the board with a new note', async ({ page }) => {
  await openBoard(page);
  for (const text of ['Recipe for lemon tart', 'Bike repair checklist']) {
    await newNote(page);
    await page.keyboard.type(text);
    await page.waitForTimeout(500);
    await card(page).getByRole('button', { name: 'Note actions' }).click();
    await card(page).locator('c2-menu-item[value="archive"]').click();
    await expect(page.locator('ntm-note-card')).toHaveCount(0);
  }
  await page.locator('.navbar__views c2-button[value="archive"]').click();
  await expect(page.locator('ntm-note-card')).toHaveCount(2);
  // Oldest edit first.
  await expect(notepadSurface(card(page, 0))).toHaveText('Recipe for lemon tart');
  const search = page.locator('c2-autocomplete input');
  await search.pressSequentially('lemon');
  await expect(page.locator('ntm-note-card')).toHaveCount(1);
  await expect(notepadSurface(card(page))).toHaveText('Recipe for lemon tart');
  await search.fill('');
  await search.pressSequentially('nothing like it');
  await expect(page.locator('.board__empty')).toHaveText('Nothing archived matches.');

  await page.locator('main.board').click({ position: { x: 4, y: 4 } });
  await page.keyboard.press('n');
  await expect(page).toHaveURL(/#\/main-board$/);
  await expect(page.locator('ntm-note-card')).toHaveCount(1);
  await expect.poll(() => focusedTag(page)).toBe('c2-notepad');
});

test('archive a page from its view; it opens from the Archive and is restored from there', async ({ page }) => {
  await openBoard(page);
  await newPage(page);
  await expect(page.locator('ntm-page-view c2-menu-item[value="restore"]')).toHaveCount(0);
  // Archived before its first edit is saved: the page is archived with it, not removed as empty.
  await editTitleAndChoose(page, PAGE_TITLE, PAGE_MENU, 'Old recipes', 'archive');
  await expect(page).toHaveURL(/#\/main-board$/);
  await expect(tiles(page)).toHaveCount(0);

  await page.locator('.navbar__views c2-button[value="archive"]').click();
  const pageCard = page.locator('ntm-page-card');
  await expect(pageCard.locator('.page-card__title')).toHaveText('Old recipes');
  await pageCard.click();
  // The card says where it was opened from, so the way back leads to the Archive before the page is even read.
  await expect(page).toHaveURL(/#\/page\/[\w-]+\?from=archive$/);
  await expect(page.locator('ntm-page-view c2-text-field')).toHaveJSProperty('value', 'Old recipes');
  await expect(page.locator('.page-bar__back')).toHaveText('Archive');
  await page.locator('.page-bar__back').click();
  await expect(page).toHaveURL(/#\/main-board\?view=archive$/);
  await pageCard.click();

  // Restored right after an edit, in a tab that did not write the stored page: the edit stays on screen and is saved.
  await page.reload();
  const title = page.locator('ntm-page-view c2-text-field');
  await expect(title).toHaveJSProperty('value', 'Old recipes');
  await expect(page.locator('ntm-page-view c2-menu-item[value="archive"]')).toHaveCount(0);
  await editTitleAndChoose(page, PAGE_TITLE, PAGE_MENU, ' and new', 'restore');
  await expect(page.locator('.page-bar__back')).toHaveText('Notes');
  await saved(page, 'Old recipes and new');
  await expect(title).toHaveJSProperty('value', 'Old recipes and new');
  await page.locator('.page-bar__back').click();
  await expect(page).toHaveURL(/#\/main-board$/);
  await expect(pageCard.locator('.page-card__title')).toHaveText('Old recipes and new');
});

test('arrange: move a card with the keyboard, and the order is kept after a reload', async ({ page }) => {
  await openBoard(page);
  await newNote(page);
  await page.keyboard.type('Second');
  await newNote(page);
  await page.keyboard.type('First');
  await page.waitForTimeout(500);

  const arrange = page.getByRole('button', { name: 'Arrange' });
  const handles = tiles(page).getByRole('button', { name: /^Move / });
  await expect(handles).toHaveCount(0);
  await arrange.click();
  await expect(handles).toHaveCount(2);
  await expect(page.locator('c2-masonry')).toHaveClass(/board__grid--arranging/);
  await shot(page, '10-arrange');

  // The newest note comes first; move it one step on: Enter, ArrowRight, Enter.
  await expect(notepadSurface(card(page, 0))).toHaveText('First');
  await handles.first().focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.entries(localStorage)
          .filter(([key]) => key.startsWith('noteme-dev:ART_BOARD_ITEM__'))
          .map(([, value]) => JSON.parse(value).gridPosition.order)
          .sort(),
      ),
    )
    .toEqual([0, 1]);

  // Leaving the Notes view stops arranging.
  await page.locator('.navbar__views c2-button[value="archive"]').click();
  await page.locator('.navbar__views c2-button[value="notes"]').click();
  await expect(page.locator('ntm-note-card')).toHaveCount(2);
  await expect(handles).toHaveCount(0);

  await page.reload();
  await openBoard(page);
  await expect(notepadSurface(card(page, 0))).toHaveText('Second');
  await expect(notepadSurface(card(page, 1))).toHaveText('First');
  const [first, second] = [await tiles(page).nth(0).boundingBox(), await tiles(page).nth(1).boundingBox()];
  expect(first!.x).toBeLessThan(second!.x);
});

test('phone width: one column, no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openBoard(page);
  await newNote(page);
  await page.keyboard.type('On the go');
  await newNote(page);
  await page.keyboard.type('Second thought');
  const [first, second] = [await tiles(page).nth(0).boundingBox(), await tiles(page).nth(1).boundingBox()];
  expect(first!.x).toBe(second!.x); // stacked
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await shot(page, '13-phone');
});

test.describe('home', () => {
  test('falls back to a bundled photo when Commons is unreachable', async ({ page, errors }) => {
    // Layered over the online mocks (the latest route wins): removing those first would let a download the first
    // page started reach the real network.
    await mockPhotoSources(page, { offline: true });
    await page.evaluate(() => localStorage.removeItem('noteme-background'));
    await page.reload();
    await expect(page.locator('.home__photo')).toHaveAttribute('src', /^assets\/bg\/bg-\d+-small\.jpg$/);
    await expect(page.locator('.home__credit')).toHaveText('Photo from Noteme');
    // Chrome logs the failed requests itself; those are expected.
    await expect.poll(() => errors.some((error) => /ERR_INTERNET_DISCONNECTED/.test(error))).toBe(true);
    errors.splice(0, errors.length, ...errors.filter((error) => !/ERR_INTERNET_DISCONNECTED/.test(error)));
  });

  test('photos are downloaded ahead, so a new tab shows one without the network', async ({ page, errors }) => {
    // The first tab fills the queue in the background.
    await expect.poll(async () => (await backgroundState(page)).queue.length, { timeout: 15_000 }).toBe(3);

    // A new tab, offline: the photo still comes from the cache.
    const requests = await mockPhotoSources(page, { offline: true });
    await nextDay(page);
    const queued = (await backgroundState(page)).queue[0].id;
    await page.reload();
    await expect(page.locator('.home__photo')).toHaveAttribute('src', /^blob:/);
    await expect(page.locator('.home__photo')).toHaveClass(/home__photo--shown/);
    await expect(page.locator('.home__credit a')).toHaveText(new RegExp(commonsCredits.map(escape).join('|')));
    expect((await backgroundState(page)).current?.id).toBe(queued);
    expect(requests.images).toBe(0); // shown from the cache, before any download was even tried
    await page.waitForTimeout(1500); // the refill runs (and fails, offline) after the page is up
    errors.splice(0, errors.length, ...errors.filter((error) => !/ERR_INTERNET_DISCONNECTED/.test(error)));
  });

  test('the photo stays the same all day, and the next day brings another; "Change now" too', async ({ page }) => {
    await expect.poll(async () => (await backgroundState(page)).queue.length, { timeout: 15_000 }).toBe(3);
    const today = (await backgroundState(page)).current!.id;
    for (let i = 0; i < 2; i++) {
      await page.reload();
      await expect(page.locator('.home__photo')).toHaveClass(/home__photo--shown/);
      expect((await backgroundState(page)).current!.id).toBe(today);
    }
    await nextDay(page);
    await page.reload();
    await expect(page.locator('.home__photo')).toHaveAttribute('src', /^blob:/);
    expect((await backgroundState(page)).current!.id).not.toBe(today);

    await page.goto('/#/?settings=1');
    const before = await page.locator('.home__credit').textContent();
    const shownBefore = (await backgroundState(page)).current!.id;
    await page.locator('ntm-settings-panel c2-button', { hasText: 'Change now' }).click();
    await expect.poll(async () => (await backgroundState(page)).current!.id).not.toBe(shownBefore);
    expect(before).toBeTruthy();
  });

  test('the photo themes chosen in settings are what is searched', async ({ page }) => {
    // A fresh count, layered over the first mocks (the latest route wins).
    const requests = await mockPhotoSources(page);
    await page.goto('/#/?settings=1');
    const themes = page.locator('ntm-settings-panel c2-select[aria-labelledby="settings-themes"]');
    await themes.click();
    // Keep only "Night sky and space": tick it, then untick the defaults (one theme always stays chosen).
    await page.locator('c2-list-item', { hasText: 'Night sky and space' }).click();
    for (const label of ['Nature', 'Mountains', 'Sea and coast']) {
      await page.locator('c2-list-item', { hasText: label }).first().click();
    }
    await page.keyboard.press('Escape');
    await expect
      .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('noteme-settings') ?? '{}').photoThemes))
      .toEqual(['space']);
    await expect
      .poll(() => requests.searches.some((search) => search.includes('astronomy')), { timeout: 15_000 })
      .toBe(true);
    // The queue is filled again for the new theme only.
    await expect
      .poll(async () => (await backgroundState(page)).queue.map((photo) => photo.theme), { timeout: 15_000 })
      .toEqual(['space', 'space', 'space']);
  });

  test('settings change the clock, the theme and the quote, and survive a reload', async ({ page }) => {
    await page.locator('ntm-home c2-icon-button[aria-label="Settings"]').click();
    await expect(page).toHaveURL(/settings=1/);
    const sheet = page.locator('ntm-settings-panel c2-sheet');
    await expect(sheet).toHaveJSProperty('open', true);
    await shot(page, '03-settings');

    await sheet.locator('c2-button', { hasText: '12 h' }).click();
    await expect(page.locator('.home__time')).toHaveText(/^\d{1,2}:\d{2}\s?(AM|PM)$/i);

    await sheet.locator('c2-button', { hasText: 'Dark' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await sheet.locator('c2-switch', { hasText: 'Quote of the day' }).click();
    await expect(page.locator('.home__quote')).toHaveCount(0);
    await shot(page, '04-settings-dark');

    await page.keyboard.press('Escape');
    await expect(page).not.toHaveURL(/settings=1/);
    await shot(page, '05-home-dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('.home__time')).toHaveText(/(AM|PM)$/i);
    await expect(page.locator('.home__quote')).toHaveCount(0);
  });

  test('light theme follows the setting', async ({ page }) => {
    await page.goto('/#/?settings=1');
    await page.locator('ntm-settings-panel c2-button', { hasText: 'Light' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.keyboard.press('Escape');
    await shot(page, '06-home-light');
  });

  test('"+ Note" opens the board with a new note ready for typing', async ({ page }) => {
    await page.locator('.home__glass-button', { hasText: 'Note' }).click();
    await expect(page.locator('ntm-note-card')).toHaveCount(1);
    await expect(page).toHaveURL(/#\/main-board$/);
    await expect.poll(() => page.evaluate(() => document.activeElement?.localName)).toBe('c2-notepad');
    await page.keyboard.type('From home');
    await expect(page.locator('ntm-note-card c2-notepad .ProseMirror')).toHaveText('From home');
  });

  test('Ctrl K and the search pill open the board with the search focused', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page).toHaveURL(/#\/main-board$/);
    await expect.poll(() => page.evaluate(() => document.activeElement?.localName)).toBe('c2-autocomplete');
    await page.locator('ntm-board c2-icon-button[aria-label="Home"]').click();
    await page.locator('.home__search').click();
    await expect.poll(() => page.evaluate(() => document.activeElement?.localName)).toBe('c2-autocomplete');
  });
});

test('search finds a word far down a long page', async ({ page }) => {
  await openBoard(page);
  await newPage(page);
  await page.keyboard.type('Reading list');
  await page.keyboard.press('Enter');
  await page.keyboard.type(
    'Books people recommended over the summer, with a line on why each one is worth the time it takes to read. ' +
      'Near the end of the list sits the one about lighthouses.',
  );
  await page.waitForTimeout(500);
  await page.locator('.page-bar__back').click();
  await page.locator('c2-autocomplete input').pressSequentially('lighthouses');
  await expect(page.locator('c2-autocomplete c2-list-item', { hasText: 'Reading list' })).toBeVisible();
});

test('Home loads only its own components; the board, settings and pages load theirs', async ({ page }) => {
  const defined = (tag: string) => page.evaluate((name) => !!customElements.get(name), tag);
  await expect(page.locator('.home__time')).toBeVisible();
  expect(await defined('c2-icon-button')).toBe(true);
  for (const tag of ['c2-notepad', 'c2-masonry', 'c2-autocomplete', 'c2-sheet', 'c2-page-editor']) {
    expect(await defined(tag), `${tag} on Home`).toBe(false);
  }
  await page.locator('ntm-home c2-icon-button[aria-label="Settings"]').click();
  await expect.poll(() => defined('c2-sheet')).toBe(true);
  await page.keyboard.press('Escape');
  await openBoard(page);
  expect(await defined('c2-notepad')).toBe(true);
  expect(await defined('c2-page-editor')).toBe(false);
});

test('a note shows its actions button only while hovered or written in', async ({ page }) => {
  await openBoard(page);
  const note = await newNote(page);
  await page.keyboard.type('Hover me');
  const toolbar = note.locator('c2-notepad .controls');
  const opacity = () => toolbar.evaluate((element) => getComputedStyle(element).opacity);
  await expect.poll(opacity).toBe('1'); // focused: being written in
  await page.locator('main.board').click({ position: { x: 4, y: 4 } });
  await page.mouse.move(5, 300);
  await expect.poll(opacity).toBe('0');
  await note.hover();
  await expect.poll(opacity).toBe('1');
});

test.describe('touch screen', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('the actions button shows once the note is tapped to write in it', async ({ page }) => {
    await openBoard(page);
    const note = await newNote(page);
    await page.keyboard.type('On the go');
    const opacity = () => note.locator('c2-notepad .controls').evaluate((element) => getComputedStyle(element).opacity);
    await page.locator('main.board').tap({ position: { x: 4, y: 4 } });
    await expect.poll(opacity).toBe('0');
    await note.locator('c2-notepad .ProseMirror').tap();
    await expect.poll(opacity).toBe('1');
  });
});

test.describe('flow', () => {
  // By accessible name: a box's text also holds the names of the boxes it connects to (its hidden description).
  const box = (page: Page, label: string) => page.locator(`c2-flow .node[aria-label^="${label},"]`);
  const editor = (page: Page) => page.locator('c2-flow .label-editor');
  const storedFlow = (page: Page) =>
    page.evaluate(() =>
      Object.entries(localStorage)
        .filter(([key]) => key.startsWith('noteme-dev:ITEM_DATA__'))
        .map(([, value]) => JSON.parse(value))
        .find((data) => data.dataType === 'flow'),
    );
  /** The boxes saved so far: none until the first save lands. */
  const storedBoxes = async (page: Page): Promise<{ label: string; position?: unknown }[]> =>
    JSON.parse((await storedFlow(page))?.data ?? '{"nodes":[]}').nodes;

  /** Double-click an empty spot of the canvas: low on the stage, at a given fraction across. */
  async function addBoxAt(page: Page, across: number, label: string): Promise<void> {
    const stage = (await page.locator('c2-flow .stage').boundingBox())!;
    await page.mouse.dblclick(stage.x + stage.width * across, stage.y + stage.height - 80);
    await expect(editor(page)).toBeVisible();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type(label);
    await page.keyboard.press('Enter');
    await expect(box(page, label)).toBeVisible();
  }

  test('a flow archived right after its title is typed lands in the Archive with it', async ({ page }) => {
    await openBoard(page);
    await page.keyboard.press('f');
    await expect.poll(() => focusedTag(page)).toBe('c2-text-field');
    // Before its first edit is saved: the flow is archived with its title, not removed as empty.
    await editTitleAndChoose(
      page,
      'ntm-flow-view c2-text-field.flow__title',
      'ntm-flow-view c2-menu',
      'Moving house',
      'archive',
    );
    await expect(page).toHaveURL(/#\/main-board$/);
    await expect(tiles(page)).toHaveCount(0);
    await page.locator('.navbar__views c2-button[value="archive"]').click();
    const flowCard = page.locator('ntm-flow-card');
    await expect(flowCard.locator('.flow-card__title')).toHaveText('Moving house');
    await flowCard.click();
    await expect(page).toHaveURL(/#\/flow\/[\w-]+\?from=archive$/);
    await expect(page.locator('.flow-bar__back')).toHaveText('Archive');

    // Found by the search on the Notes view, it opens as from the Archive too.
    await page.locator('.flow-bar__back').click();
    await page.locator('.navbar__views c2-button[value="notes"]').click();
    await page.locator('c2-autocomplete input').pressSequentially('Moving');
    await page.locator('c2-autocomplete c2-list-item', { hasText: 'Moving house' }).click();
    await expect(page).toHaveURL(/#\/flow\/[\w-]+\?from=archive$/);
    await expect(page.locator('.flow-bar__back')).toHaveText('Archive');
  });

  test('a flow is drawn with boxes and arrows, saved, and shown on the board', async ({ page }) => {
    await openBoard(page);
    await page.keyboard.press('f');
    await expect(page).toHaveURL(/#\/flow\/[\w-]+\?new=1$/);
    await expect.poll(() => focusedTag(page)).toBe('c2-text-field');
    await page.keyboard.type('Long weekend in Da Lat?');
    await page.keyboard.press('Enter');
    await expect(page.locator('.flow__hint')).toContainText('Double-click anywhere to add a box');

    await addBoxAt(page, 0.25, 'Weather ok?');
    await addBoxAt(page, 0.6, 'Book the night bus');

    // Connect the two by dragging from the first box's handle onto the second.
    const first = box(page, 'Weather ok?');
    await first.hover();
    const handle = first.locator('.connector');
    await expect(handle).toHaveCSS('opacity', '1');
    const from = (await handle.boundingBox())!;
    const to = (await box(page, 'Book the night bus').boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect
      .poll(async () => (await storedFlow(page))?.data && JSON.parse((await storedFlow(page)).data).edges.length)
      .toBe(1);
    // The arrow ends in an arrowhead; a box is its label only, without the pipeline status marker.
    await expect(page.locator('c2-flow .arrow')).toHaveCount(1);
    await expect(page.locator('c2-flow .arrow')).toBeVisible();
    await expect(first.locator('.status')).toBeHidden();

    // Name the arrow: double-click it, type, Enter.
    await page.locator('c2-flow .edge-hit').dblclick();
    await expect(page.locator('c2-flow .label-editor--edge')).toBeVisible();
    await page.keyboard.type('if it is sunny');
    await page.keyboard.press('Enter');
    await expect(page.locator('c2-flow .edge-label')).toHaveText('if it is sunny');
    await expect
      .poll(async () => JSON.parse((await storedFlow(page)).data).edges.map((edge: { label?: string }) => edge.label))
      .toEqual(['if it is sunny']);
    await expect(page.locator('.flow-bar__status')).toHaveText(/^Saved/);
    await shot(page, '14-flow');

    const stored = await storedFlow(page);
    expect(stored.properties.title).toBe('Long weekend in Da Lat?');
    const doc = JSON.parse(stored.data);
    expect(doc.nodes.map((node: { label: string }) => node.label)).toEqual(['Weather ok?', 'Book the night bus']);
    expect(doc.nodes.every((node: { position?: unknown }) => node.position)).toBe(true);

    // After a reload the boxes come back where they were on the canvas (the view itself re-fits), with their arrow.
    const saved = Object.fromEntries(
      doc.nodes.map((node: { id: string; position: { x: number; y: number } }) => [node.id, node.position]),
    );
    await page.reload();
    await expect(box(page, 'Book the night bus')).toBeVisible();
    await expect(page.locator('c2-flow .edge')).toHaveCount(1);
    await expect(page.locator('c2-flow .edge-label')).toHaveText('if it is sunny');
    expect(
      await page.locator('c2-flow').evaluate((flow) => (flow as unknown as { getLayout(): unknown }).getLayout()),
    ).toEqual(saved);

    // On the board: a card with the title and the boxes; search finds an arrow's label and opens the flow.
    await page.locator('.flow-bar__back').click();
    const card = page.locator('ntm-flow-card');
    await expect(card.locator('.flow-card__title')).toHaveText('Long weekend in Da Lat?');
    await expect(card.locator('.flow-card__box')).toHaveText(['Weather ok?', 'Book the night bus']);
    await shot(page, '15-board-with-flow');
    await page.locator('c2-autocomplete input').pressSequentially('sunny');
    await page.locator('c2-autocomplete c2-list-item', { hasText: 'Long weekend' }).click();
    await expect(page).toHaveURL(/#\/flow\//);
  });

  test('renaming and deleting boxes are saved; an empty flow is not kept', async ({ page }) => {
    await openBoard(page);
    await page.keyboard.press('f');
    await page.keyboard.press('Enter');
    await addBoxAt(page, 0.3, 'Pack');
    // The toolbar over the canvas adds a box too, named straight away.
    await page.locator('c2-flow c2-icon-button[aria-label="Add a box"]').click();
    await expect(editor(page)).toBeVisible();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Ask Linh');
    await page.keyboard.press('Enter');
    await expect(box(page, 'Ask Linh')).toBeVisible();
    // Tidy up forgets where the boxes were dropped: the automatic layout places them again.
    await expect
      .poll(async () => (await storedBoxes(page)).filter((n) => n.position).map((n) => n.label))
      .toEqual(['Pack', 'Ask Linh']);
    await page.locator('c2-flow c2-icon-button[aria-label="Tidy up"]').click();
    await expect.poll(async () => (await storedBoxes(page)).filter((n) => n.position).length).toBe(0);
    await box(page, 'Pack').dblclick();
    await expect(editor(page)).toBeVisible();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Pack the bags');
    await page.keyboard.press('Enter');
    await box(page, 'Ask Linh').click();
    await page.keyboard.press('Delete');
    await expect(box(page, 'Ask Linh')).toHaveCount(0);
    await expect
      .poll(async () =>
        JSON.parse((await storedFlow(page))?.data ?? '{"nodes":[]}').nodes.map((n: { label: string }) => n.label),
      )
      .toEqual(['Pack the bags']);

    // A flow with no title and no box disappears when you leave it.
    await box(page, 'Pack the bags').click();
    await page.keyboard.press('Delete');
    await expect(box(page, 'Pack the bags')).toHaveCount(0);
    await page.waitForTimeout(500);
    await page.locator('.flow-bar__back').click();
    await expect(page.locator('ntm-flow-card')).toHaveCount(0);
  });
});

test.describe('plan', () => {
  const stored = (page: Page) =>
    page.evaluate(() => JSON.parse(localStorage.getItem('noteme-dev:PLAN__ITEMS') ?? '{"items":[]}').items);
  const dialog = (page: Page) => page.locator('c2-modal.plan__dialog');

  test('week: click an empty hour, type, Enter; the plan is kept, edited and deleted', async ({ page }) => {
    await page.goto('/#/plan?view=week&date=2026-10-15');
    const planner = page.locator('c2-week-planner');
    await expect(planner.locator('.day')).toHaveCount(7);
    // Thursday is the fourth column of a week starting on Monday; aim at about 10:00.
    const thursday = (await planner.locator('.day').nth(3).boundingBox())!;
    const firstHour = (await planner.locator('.hour-label').first().boundingBox())!;
    const hourHeight = 48;
    await page.mouse.click(thursday.x + thursday.width / 2, firstHour.y + (10 - 7) * hourHeight + 10);
    await expect(dialog(page)).toHaveJSProperty('open', true);
    await expect(dialog(page).locator('.plan__dialog-when')).toContainText('15');
    await page.keyboard.type('Dentist');
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toHaveJSProperty('open', false);
    await expect(planner.getByRole('button', { name: /^Dentist/ })).toBeVisible();
    await page.waitForTimeout(400); // the dialog's closing fade
    expect(await stored(page)).toEqual([
      expect.objectContaining({ title: 'Dentist', date: '2026-10-15', start: '10:00', end: '11:00' }),
    ]);
    await shot(page, '16-plan-week');

    await page.reload();
    await planner.getByRole('button', { name: /^Dentist/ }).click();
    await expect(dialog(page)).toHaveJSProperty('open', true);
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Dentist, bring the card');
    await page.keyboard.press('Enter');
    await expect(planner.getByRole('button', { name: /^Dentist, bring the card/ })).toBeVisible();
    await planner.getByRole('button', { name: /^Dentist/ }).click();
    await dialog(page).locator('.plan__dialog-delete').click();
    await expect(planner.getByRole('button', { name: /^Dentist/ })).toHaveCount(0);
    expect(await stored(page)).toEqual([]);
  });

  test('month: click a day to add, with or without a time; drag across days for a longer plan', async ({ page }) => {
    await page.goto('/#/plan?view=month&date=2026-10-01');
    const planner = page.locator('c2-month-planner');
    await planner.locator('.day[data-date="2026-10-15"]').click();
    const sheet = page.locator('c2-sheet.plan__day');
    await expect(sheet).toHaveJSProperty('open', true);
    await expect(sheet).toContainText('Nothing planned yet.');
    await expect.poll(() => focusedTag(page)).toBe('c2-text-field');
    await page.keyboard.type('Dinner with Linh 19:00');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Pack');
    await page.keyboard.press('Enter');
    await expect(sheet.locator('.plan__day-item')).toHaveText([/all day\s*Pack/, /19:00 – 20:00\s*Dinner with Linh/]);
    await shot(page, '17-plan-day');
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveJSProperty('open', false);
    await expect(planner.locator('.event', { hasText: '19:00 Dinner with Linh' })).toBeVisible();

    // Drag from the 20th to the 22nd: one plan over three days.
    const from = (await planner.locator('.day[data-date="2026-10-20"]').boundingBox())!;
    const to = (await planner.locator('.day[data-date="2026-10-22"]').boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height - 8);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height - 8, { steps: 8 });
    await page.mouse.up();
    await expect(dialog(page)).toHaveJSProperty('open', true);
    await expect(dialog(page).locator('.plan__dialog-when')).toContainText('20');
    await expect(dialog(page).locator('.plan__dialog-when')).toContainText('22');
    await page.keyboard.type('Đà Lạt');
    await page.keyboard.press('Enter');
    await expect(planner.locator('.event', { hasText: 'Đà Lạt' }).first()).toBeVisible();
    await page.mouse.move(5, 5);
    await page.waitForTimeout(400); // the dialog's closing fade
    await shot(page, '18-plan-month');
    expect(await stored(page)).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Đà Lạt', date: '2026-10-20', endDate: '2026-10-22' })]),
    );

    // The week of the 15th shows the timed plan in its grid and the all-day one above it.
    await page.locator('.plan-bar__views c2-button', { hasText: 'Week' }).click();
    await page.goto('/#/plan?view=week&date=2026-10-15');
    await expect(page.locator('c2-week-planner').getByRole('button', { name: /^Dinner with Linh/ })).toBeVisible();
    await expect(page.locator('.plan__all-day .plan__chip')).toHaveText([/Pack/]);
  });

  test('the dialog: From makes an all-day plan timed, clearing it makes it all day again', async ({ page }) => {
    await page.evaluate(() =>
      localStorage.setItem(
        'noteme-dev:PLAN__ITEMS',
        JSON.stringify({ items: [{ id: 'pack', title: 'Pack', date: '2026-10-15' }] }),
      ),
    );
    await page.goto('/#/plan?view=week&date=2026-10-15');
    const planner = page.locator('c2-week-planner');
    const time = (label: string) => dialog(page).locator(`c2-time-input[aria-label="${label}"] input`);
    const save = async () => {
      await dialog(page).locator('.plan__dialog-save').click();
      await expect(dialog(page)).toHaveJSProperty('open', false);
    };

    await page.locator('.plan__all-day .plan__chip', { hasText: 'Pack' }).click();
    await expect(dialog(page)).toHaveJSProperty('open', true);
    await time('From').fill('09:00');
    await save();
    await expect(planner.getByRole('button', { name: /^Pack/ })).toBeVisible();
    await expect(page.locator('.plan__all-day')).toHaveCount(0);
    expect(await stored(page)).toEqual([expect.objectContaining({ title: 'Pack', start: '09:00', end: '10:00' })]);

    await planner.getByRole('button', { name: /^Pack/ }).click();
    await expect(dialog(page)).toHaveJSProperty('open', true);
    await time('From').fill('');
    await save();
    await expect(page.locator('.plan__all-day .plan__chip')).toHaveText([/Pack/]);
    await expect(planner.getByRole('button', { name: /^Pack/ })).toHaveCount(0);
    const [allDay] = await stored(page);
    expect(allDay.start).toBeUndefined();
    expect(allDay.end).toBeUndefined();

    // An end before the start: the plan lasts an hour from its start.
    await page.locator('.plan__all-day .plan__chip', { hasText: 'Pack' }).click();
    await time('From').fill('10:00');
    await time('To').fill('09:00');
    await save();
    expect(await stored(page)).toEqual([expect.objectContaining({ title: 'Pack', start: '10:00', end: '11:00' })]);
  });

  test('an invalid date in the link shows the current month', async ({ page }) => {
    await page.goto('/#/plan?view=month&date=2026-02-31');
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    await expect(page.locator('c2-month-planner')).toHaveJSProperty('month', month);
  });

  test('Plan is one click from Home and from the notes', async ({ page }) => {
    await page.locator('ntm-home .home__link', { hasText: 'Plan' }).click();
    await expect(page.locator('c2-week-planner')).toBeVisible();
    await page.locator('.plan-bar__back').click();
    await page.locator('ntm-board .navbar__link', { hasText: 'Plan' }).click();
    await expect(page).toHaveURL(/#\/plan/);
  });
});
