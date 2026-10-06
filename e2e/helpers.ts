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

/** A Commons search answer: four usable photos, and a portrait, a small and an SVG file that must be skipped. */
export const commonsSearch = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures', 'commons-search.json'), 'utf8'),
);
export const commonsCredits = [
  'Photo by Jane Doe · CC BY-SA 4.0',
  'Photo by Peter & Anna Smith · CC BY 3.0',
  'Wikimedia Commons · Public domain',
  'Photo by Lena Berg · CC BY-SA 4.0',
];

export interface PhotoRequests {
  searches: string[];
  images: number;
  /** The image URLs requested, in order. */
  imageUrls: string[];
}

// Commons answers both with CORS headers, which the app's fetch needs.
const cors = { 'access-control-allow-origin': '*' };

/**
 * Commons is a third-party service (and unreachable from CI sandboxes): answer its search API with a recorded answer and
 * its images with a local photo, or fail both (`offline`) to check the fallback to the bundled photos. Returns what was
 * requested.
 */
export async function mockPhotoSources(
  target: Page | BrowserContext,
  { offline = false } = {},
): Promise<PhotoRequests> {
  const requests: PhotoRequests = { searches: [], images: 0, imageUrls: [] };
  await target.route(/^https:\/\/commons\.wikimedia\.org\/w\/api\.php/, (route) => {
    requests.searches.push(new URL(route.request().url()).searchParams.get('gsrsearch') ?? '');
    return offline ? route.abort('internetdisconnected') : route.fulfill({ json: commonsSearch, headers: cors });
  });
  await target.route(/^https:\/\/upload\.wikimedia\.org\//, (route) => {
    requests.images += 1;
    requests.imageUrls.push(route.request().url());
    return offline
      ? route.abort('internetdisconnected')
      : route.fulfill({ body: photo, contentType: 'image/jpeg', headers: cors });
  });
  return requests;
}

/** The background state the app keeps: the photo on screen and the ones downloaded ahead. */
export function backgroundState(page: Page): Promise<{
  current: { id: string; theme: string; url: string; bundled?: boolean } | null;
  queue: { id: string; theme: string; url: string }[];
}> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('noteme-background') ?? '{"current":null,"queue":[]}'));
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

/** Make the photo on screen two days old, so the next tab is a new day and gets the next photo. */
export function nextDay(page: Page): Promise<void> {
  return page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('noteme-background') ?? '{}');
    localStorage.setItem('noteme-background', JSON.stringify({ ...state, shownAt: Date.now() - 2 * 86_400_000 }));
  });
}
