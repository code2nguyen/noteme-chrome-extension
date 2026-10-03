import { expect, type Page, test } from '@playwright/test';
import { mockPhotoSources } from './helpers';

// A walk through every screen with realistic content, in both themes and at desktop and phone widths. The
// screenshots (test-results/visual/) are for looking at; the assertions only check each screen is ready to shoot.

const now = new Date();
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
const grid = (order: number, rows = 10) => ({
  order,
  rows,
  screenColumns: { Large: 3, Medium: 3, Small: 3, XSmall: 1 },
});

interface Seed {
  id: string;
  kind: 'note' | 'page' | 'flow';
  data: string;
  title?: string;
  colorIndex?: number;
  minutes: number;
  pad?: string;
}

const seeds: Seed[] = [
  {
    id: 'groceries',
    kind: 'note',
    data: '**Groceries**\n- [ ] oat milk\n- [x] lemons\n- [ ] coffee beans',
    colorIndex: 1,
    minutes: 2,
  },
  {
    id: 'laptop',
    kind: 'page',
    title: 'Setting up the new laptop',
    data: [
      'Everything I need to move from the old machine, in order.',
      '',
      '## Before',
      '',
      '- [x] Back up the old laptop',
      '- [ ] Sign out of iCloud and the bank app',
      '- [ ] Export browser passwords',
      '',
      '## Install',
      '',
      'The developer tools, in one go:',
      '',
      '```sh',
      'brew install node git pnpm',
      'git config --global user.name "Vinh"',
      '```',
      '',
      '> The charger in the drawer is the **65 W** one — use that.',
    ].join('\n'),
    minutes: 30,
  },
  { id: 'bank', kind: 'note', data: 'Call the bank before Friday about the card.', colorIndex: 3, minutes: 60 * 20 },
  {
    id: 'dalat',
    kind: 'page',
    title: 'Trip to Đà Lạt',
    data: "Linh's sister knows a homestay near the lake. Bus leaves Friday 22:00.\n\n- Warm jacket\n- Rain cover",
    minutes: 60 * 24 * 3,
  },
  {
    id: 'gift',
    kind: 'note',
    data: 'Gift for mum: the *blue scarf* from the market.',
    colorIndex: 4,
    minutes: 60 * 24 * 4,
  },
  {
    id: 'pho',
    kind: 'page',
    title: 'Phở bò, mum’s way',
    data: 'Char the onion and ginger first. Simmer the bones for six hours, skim often.',
    minutes: 60 * 24 * 9,
  },
  {
    id: 'weekend',
    kind: 'flow',
    title: 'Long weekend in Đà Lạt?',
    data: JSON.stringify({
      nodes: [
        { id: 'w1', label: 'Long weekend', position: { x: 0, y: 120 } },
        { id: 'w2', label: 'Weather ok?', position: { x: 260, y: 120 } },
        { id: 'w3', label: 'Book the night bus', position: { x: 520, y: 40 } },
        { id: 'w4', label: 'Stay home, cook phở', position: { x: 520, y: 200 } },
        { id: 'w5', label: 'Pack, ask Linh', position: { x: 780, y: 40 } },
      ],
      edges: [
        { source: 'w1', target: 'w2' },
        { source: 'w2', target: 'w3' },
        { source: 'w2', target: 'w4' },
        { source: 'w3', target: 'w5' },
      ],
    }),
    minutes: 60 * 24 * 2,
  },
  {
    id: 'wifi',
    kind: 'note',
    data: 'Wifi at the café: `hoa-sua-2026`',
    colorIndex: 2,
    minutes: 60 * 24 * 13,
    pad: 'legal',
  },
];

async function seed(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.evaluate(
    ({ seeds, theme }) => {
      localStorage.clear();
      const set = (key: string, value: unknown) => localStorage.setItem(`noteme-dev:${key}`, JSON.stringify(value));
      const ids = seeds.map((s) => s.id);
      set('_ART_BOARD_ITEM__IDS', ids);
      set('_ART_BOARD__ART_BOARD_ITEM_IDS__defaultArtBoard', ids);
      seeds.forEach((s) => {
        set(`ART_BOARD_ITEM__${s.id}`, {
          id: s.id,
          boardId: 'defaultArtBoard',
          extensionId: { note: 'ntm-text-note-element', page: 'ntm-page', flow: 'ntm-flow' }[s.kind],
          colorIndex: s.colorIndex ?? 0,
          gridPosition: s.grid ?? null,
          properties: s.pad ? { pad: s.pad } : {},
          modifiedDate: s.date,
        });
        set(`ITEM_DATA__${s.id}`, {
          id: s.id,
          dataType: { note: 'markdown', page: 'page', flow: 'flow' }[s.kind],
          empty: false,
          data: s.data,
          properties: s.title ? { title: s.title } : {},
          createdDate: s.date,
          modifiedDate: s.date,
        });
      });
      localStorage.setItem('noteme-settings', JSON.stringify({ theme }));
    },
    {
      theme,
      seeds: seeds.map((s, index) => ({
        ...s,
        date: ago(s.minutes),
        grid: grid(index, { note: 10, page: 6, flow: 4 }[s.kind]),
      })),
    },
  );
}

const shoot = (page: Page, name: string) => page.screenshot({ path: `test-results/visual/${name}.png` });

for (const theme of ['light', 'dark'] as const) {
  for (const [device, viewport] of [
    ['desktop', { width: 1440, height: 900 }],
    ['phone', { width: 390, height: 844 }],
  ] as const) {
    test(`${theme} · ${device}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await mockPhotoSources(page);
      await page.goto('/');
      await seed(page, theme);
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const name = (screen: string) => `${theme}-${device}-${screen}`;

      // Home.
      await expect(page.locator('.home__photo')).toBeVisible();
      await page.waitForTimeout(300);
      await shoot(page, name('1-home'));

      // Settings.
      await page.locator('ntm-home c2-icon-button[aria-label="Settings"]').click();
      await expect(page.locator('ntm-settings-panel c2-sheet')).toHaveJSProperty('open', true);
      await page.waitForTimeout(400);
      await shoot(page, name('2-settings'));
      await page.keyboard.press('Escape');

      // Board.
      await page.locator('ntm-home .home__link', { hasText: 'Notes' }).click();
      await expect(page.locator('ntm-page-card')).toHaveCount(3);
      await expect(page.locator('ntm-note-card')).toHaveCount(4);
      await expect(page.locator('ntm-flow-card')).toHaveCount(1);
      await page.waitForTimeout(600);
      await shoot(page, name('3-board'));

      // New menu.
      await page.locator('.navbar__new-button').click();
      await expect(page.locator('.navbar__new c2-menu-item[value="page"]')).toBeVisible();
      await page.waitForTimeout(200);
      await shoot(page, name('4-new-menu'));
      await page.keyboard.press('Escape');

      // Search.
      const search = page.locator('c2-autocomplete input');
      await search.click();
      await search.pressSequentially('bus');
      await expect(page.locator('c2-autocomplete c2-list-item').first()).toBeVisible();
      await page.waitForTimeout(200);
      await shoot(page, name('5-search'));
      await page.keyboard.press('Escape');
      await search.fill('');

      // A page.
      await page.locator('ntm-page-card', { hasText: 'Setting up the new laptop' }).click();
      await expect(page.locator('ntm-page-view c2-page-editor pre')).toContainText('brew install');
      await page.waitForTimeout(800); // syntax colours load on demand
      await shoot(page, name('6-page'));

      // A flow.
      await page.goto('/#/flow/weekend');
      await expect(page.locator('c2-flow .node')).toHaveCount(5);
      await page.waitForTimeout(600);
      await shoot(page, name('8-flow'));
      await page.goBack();
      await expect(page.locator('ntm-page-view c2-page-editor pre')).toContainText('brew install');

      // The slash menu.
      await page.locator('ntm-page-view c2-page-editor .ProseMirror p').last().click();
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await page.keyboard.type('/');
      await page.waitForTimeout(300);
      await shoot(page, name('7-page-slash-menu'));
      await page.keyboard.press('Escape');
    });
  }
}
