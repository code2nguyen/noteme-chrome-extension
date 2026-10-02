import { expect, test as base } from '@playwright/test';
import { card, codeSurface, newNote, notepadSurface, openBoard, shot } from './helpers';

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

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('welcome page shows the clock and opens the board', async ({ page }) => {
  await expect(page.locator('.welcome__time')).toHaveText(/\d{1,2}:\d{2}/);
  await expect(page.locator('.welcome__date')).toContainText(String(new Date().getFullYear()));
  await shot(page, '01-welcome');
  await openBoard(page);
  await expect(page).toHaveURL(/#\/main-board$/);
  await expect(page.locator('.board__empty')).toHaveText('No notes yet. Start one with Text or Code.');
  await shot(page, '02-board-empty');
});

test('a text note is focused on creation, saved and restored after a reload', async ({ page }) => {
  await openBoard(page);
  const note = await newNote(page, 'Text');
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
  const note = await newNote(page, 'Text');
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

test('a code note highlights code and remembers its language', async ({ page }) => {
  await openBoard(page);
  const note = await newNote(page, 'Code');
  await expect(codeSurface(note)).toBeVisible(); // CodeMirror mounted, not the plain textarea fallback
  await page.keyboard.type('const answer = { value: 42 };');
  await expect(codeSurface(note)).toHaveText('const answer = { value: 42 };');

  await note.locator('c2-select').click();
  await note.locator('c2-list-item[value="javascript"]').click();
  await expect(note.locator('c2-code-editor')).toHaveAttribute('language', 'javascript');
  // The keyword is a highlighted token once the JavaScript grammar applies.
  await expect(codeSurface(note).locator('span', { hasText: /^const$/ })).toBeVisible();
  await expect(note.locator('.note__toolbar')).toBeInViewport();
  await page.waitForTimeout(500);
  await shot(page, '04-code-note');

  await page.reload();
  await openBoard(page);
  await expect(card(page).locator('c2-code-editor')).toHaveAttribute('language', 'javascript');
  await expect(codeSurface(card(page))).toHaveText('const answer = { value: 42 };');
});

test('archive, restore and delete a note', async ({ page }) => {
  await openBoard(page);
  await newNote(page, 'Text');
  await page.keyboard.type('Keep me for later');
  await page.waitForTimeout(500);

  await card(page).getByRole('button', { name: 'Archive note' }).click();
  await expect(page.locator('ntm-note-card')).toHaveCount(0);

  await page.locator('c2-tab[for="archive"]').click();
  await expect(page.locator('ntm-note-card')).toHaveCount(1);
  await expect(notepadSurface(card(page))).toHaveText('Keep me for later');
  await expect(page.locator('c2-button-group')).toHaveCount(0); // no "new note" on the archive
  await shot(page, '05-archive');

  await card(page).getByRole('button', { name: 'Restore note' }).click();
  await expect(page.locator('ntm-note-card')).toHaveCount(0);
  await page.locator('c2-tab[for="notes"]').click();
  await expect(page.locator('ntm-note-card')).toHaveCount(1);

  await card(page).getByRole('button', { name: 'Delete note' }).click();
  await expect(card(page).locator('c2-menu-item[value="delete"]')).toBeVisible();
  await shot(page, '06-delete-confirm');
  await card(page).locator('c2-menu-item[value="delete"]').click();
  await expect(page.locator('ntm-note-card')).toHaveCount(0);
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes('ITEM_DATA__')));
  expect(keys).toEqual([]);
});

test('archiving an empty note deletes it', async ({ page }) => {
  await openBoard(page);
  await newNote(page, 'Text');
  await card(page).getByRole('button', { name: 'Archive note' }).click();
  await page.locator('c2-tab[for="archive"]').click();
  await expect(page.locator('.board__empty')).toHaveText('The archive is empty.');
});

test('search finds a note and highlights it', async ({ page }) => {
  await openBoard(page);
  for (const text of ['Groceries: apples, pears', 'Meeting with Linh on Friday', 'Release checklist']) {
    await newNote(page, 'Text');
    await page.keyboard.type(text);
  }
  await page.waitForTimeout(500);

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
});

test('search on the archive filters the archived notes', async ({ page }) => {
  await openBoard(page);
  for (const text of ['Recipe for lemon tart', 'Bike repair checklist']) {
    await newNote(page, 'Text');
    await page.keyboard.type(text);
    await page.waitForTimeout(400);
    await card(page).getByRole('button', { name: 'Archive note' }).click();
    await expect(page.locator('ntm-note-card')).toHaveCount(0);
  }
  await page.locator('c2-tab[for="archive"]').click();
  await expect(page.locator('ntm-note-card')).toHaveCount(2);
  await page.locator('c2-autocomplete input').pressSequentially('lemon');
  await expect(page.locator('ntm-note-card')).toHaveCount(1);
  await expect(notepadSurface(card(page))).toHaveText('Recipe for lemon tart');
});

test('changing the paper colour is saved on the note', async ({ page }) => {
  await openBoard(page);
  const note = await newNote(page, 'Text');
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

test('arrange mode shows move handles and a keyboard move is saved', async ({ page }) => {
  await openBoard(page);
  await newNote(page, 'Text');
  await page.keyboard.type('Second');
  await newNote(page, 'Text');
  await page.keyboard.type('First');
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: 'Arrange notes' }).click();
  const handles = page.locator('c2-masonry-item').getByRole('button', { name: /^Move / });
  await expect(handles).toHaveCount(2);
  await expect(page.locator('c2-masonry')).toHaveClass(/board__grid--arranging/);
  await shot(page, '09-arrange');

  // The newest note comes first.
  await expect(notepadSurface(card(page, 0))).toHaveText('First');
  const firstTile = page.locator('c2-masonry-item').nth(0);
  const secondTile = page.locator('c2-masonry-item').nth(1);
  expect((await firstTile.boundingBox())!.x).toBeLessThan((await secondTile.boundingBox())!.x);

  // Move the first tile one step right with the keyboard: Enter, ArrowRight, Enter.
  await handles.first().focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);

  await page.reload();
  await openBoard(page);
  await expect(notepadSurface(card(page, 0))).toHaveText('Second');
  await expect(notepadSurface(card(page, 1))).toHaveText('First');
});

test('phone width: one column, no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openBoard(page);
  await newNote(page, 'Text');
  await page.keyboard.type('On the go');
  await newNote(page, 'Code');
  await page.keyboard.type('npm run build');
  const tiles = page.locator('c2-masonry-item');
  const [first, second] = [await tiles.nth(0).boundingBox(), await tiles.nth(1).boundingBox()];
  expect(first!.x).toBe(second!.x); // stacked
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await shot(page, '13-phone');
});
