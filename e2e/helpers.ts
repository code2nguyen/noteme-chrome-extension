import { expect, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Screenshots land next to the test results, named after the step they verify. */
export async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `test-results/screenshots/${name}.png` });
}

export function card(page: Page, index = 0): Locator {
  return page.locator('ntm-note-card').nth(index);
}

/** The ProseMirror surface inside a c2-notepad (Playwright CSS pierces open shadow roots). */
export function notepadSurface(note: Locator): Locator {
  return note.locator('c2-notepad .ProseMirror');
}

/** The ProseMirror surface of the page being edited. */
export function pageSurface(page: Page): Locator {
  return page.locator('ntm-page-view c2-page-editor .ProseMirror');
}

/** The cards on the board (notes and pages), in board order. */
export function tiles(page: Page): Locator {
  return page.locator('c2-masonry-item');
}

/** Go from Home to the board (a reload of the board stays on the board). */
export async function openBoard(page: Page): Promise<void> {
  const notes = page.locator('ntm-home .home__link', { hasText: 'Notes' });
  const board = page.locator('ntm-board');
  await expect(notes.or(board)).toBeVisible();
  if (await notes.isVisible()) {
    await notes.click();
  }
  await expect(board).toBeVisible();
}

const photo = readFileSync(join(import.meta.dirname, '..', 'src', 'assets', 'bg', 'bg-3-small.jpg'));

// Trimmed from a real api.wikimedia.org featured-feed answer.
export const wikimediaFeed = {
  image: {
    title: 'File:Lake Bled.jpg',
    thumbnail: {
      source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Lake_Bled.jpg/640px-Lake_Bled.jpg',
      width: 640,
      height: 427,
    },
    image: { source: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Lake_Bled.jpg', width: 6000, height: 4000 },
    file_page: 'https://commons.wikimedia.org/wiki/File:Lake_Bled.jpg',
    artist: { text: 'Jane Doe' },
  },
};

/**
 * The photo sources are third-party services (and unreachable from CI sandboxes): answer them with a recorded feed and
 * a local image, or fail them (`offline`) to check the fallback to the bundled photos.
 */
export async function mockPhotoSources(target: Page | BrowserContext, { offline = false } = {}): Promise<void> {
  await target.route(/^https:\/\/(api\.wikimedia\.org|api\.nasa\.gov)\//, (route) =>
    offline ? route.abort('internetdisconnected') : route.fulfill({ json: wikimediaFeed }),
  );
  await target.route(/^https:\/\/upload\.wikimedia\.org\//, (route) =>
    route.fulfill({ body: photo, contentType: 'image/jpeg' }),
  );
}

/** The tag of the element holding focus, through shadow roots' hosts. */
export function focusedTag(page: Page): Promise<string | undefined> {
  return page.evaluate(() => document.activeElement?.localName);
}

async function chooseNew(page: Page, value: 'note' | 'page'): Promise<void> {
  await page.locator('.navbar__new-button').click();
  await page.locator(`.navbar__new c2-menu-item[value="${value}"]`).click();
}

export async function newNote(page: Page): Promise<Locator> {
  const before = await page.locator('ntm-note-card').count();
  await chooseNew(page, 'note');
  await expect(page.locator('ntm-note-card')).toHaveCount(before + 1);
  // New notes go first, and take focus so the user can type right away.
  const note = card(page, 0);
  await expect.poll(() => focusedTag(page)).toBe('c2-notepad');
  return note;
}

/** New → Page: the page opens full screen with its title focused. */
export async function newPage(page: Page): Promise<void> {
  await chooseNew(page, 'page');
  await expect(page).toHaveURL(/#\/page\/[\w-]+\?new=1$/);
  await expect.poll(() => focusedTag(page)).toBe('c2-text-field');
}
