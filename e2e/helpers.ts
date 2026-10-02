import { expect, type Locator, type Page } from '@playwright/test';

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

export function codeSurface(note: Locator): Locator {
  return note.locator('c2-code-editor .cm-content');
}

/** Leave the welcome clock for the board (a reload of the board stays on the board). */
export async function openBoard(page: Page): Promise<void> {
  const welcome = page.locator('ntm-welcome button');
  const board = page.locator('ntm-board');
  await expect(welcome.or(board)).toBeVisible();
  if (await welcome.isVisible()) {
    await welcome.click();
  }
  await expect(board).toBeVisible();
}

/** The tag of the element holding focus, through shadow roots' hosts. */
export function focusedTag(page: Page): Promise<string | undefined> {
  return page.evaluate(() => document.activeElement?.localName);
}

export async function newNote(page: Page, kind: 'Text' | 'Code'): Promise<Locator> {
  const before = await page.locator('ntm-note-card').count();
  await page.locator('c2-button-group c2-button', { hasText: kind }).click();
  await expect(page.locator('ntm-note-card')).toHaveCount(before + 1);
  // New notes go first, and take focus so the user can type right away.
  const note = card(page, 0);
  await expect.poll(() => focusedTag(page)).toBe(kind === 'Text' ? 'c2-notepad' : 'c2-code-editor');
  return note;
}
