import { expect, test as base } from '@playwright/test';
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
  await expect(page.locator('.board__empty')).toHaveText('Nothing here yet. Press N for a note or P for a page.');
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
  await card(page).getByRole('button', { name: 'Delete note' }).click();
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
    await page.unrouteAll();
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
    await page.unrouteAll();
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
    await page.unrouteAll();
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

test('a note shows its delete button only while hovered or written in', async ({ page }) => {
  await openBoard(page);
  const note = await newNote(page);
  await page.keyboard.type('Hover me');
  const toolbar = note.locator('c2-notepad .controls');
  const opacity = () => toolbar.evaluate((element) => getComputedStyle(element).opacity);
  await expect.poll(opacity).toBe('1'); // focused: being written in
  await page.locator('.navbar__title').click();
  await page.mouse.move(5, 300);
  await expect.poll(opacity).toBe('0');
  await note.hover();
  await expect.poll(opacity).toBe('1');
});

test.describe('touch screen', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('the delete button shows once the note is tapped to write in it', async ({ page }) => {
    await openBoard(page);
    const note = await newNote(page);
    await page.keyboard.type('On the go');
    const opacity = () => note.locator('c2-notepad .controls').evaluate((element) => getComputedStyle(element).opacity);
    await page.locator('.navbar__title').tap();
    await expect.poll(opacity).toBe('0');
    await note.locator('c2-notepad .ProseMirror').tap();
    await expect.poll(opacity).toBe('1');
  });
});
