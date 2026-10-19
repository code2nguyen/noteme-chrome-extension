import { expect, type Page, test } from '@playwright/test';

// Chrome Web Store screenshots, 1280x800: realistic content on every screen. Written to art/store/. Home's photos come
// live from Wikimedia Commons, so this runs only when asked:
//   npm run build && STORE_SHOTS=1 npx playwright test e2e/store-visual.spec.ts --project web
test.skip(!process.env['STORE_SHOTS'], 'Store screenshots: set STORE_SHOTS=1 to take them');

const now = new Date();
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
const grid = (order: number, rows = 10) => ({
  order,
  rows,
  screenColumns: { Large: 3, Medium: 3, Small: 3, XSmall: 1 },
});

type Kind = 'note' | 'page' | 'flow' | 'todo' | 'sheet';
const extensionIds: Record<Kind, string> = {
  note: 'ntm-text-note-element',
  page: 'ntm-page',
  flow: 'ntm-flow',
  todo: 'ntm-todo-list',
  sheet: 'ntm-sheet',
};
const dataTypes: Record<Kind, string> = { note: 'markdown', page: 'page', flow: 'flow', todo: 'todo', sheet: 'sheet' };
const rowsOf: Record<Kind, number> = { note: 10, page: 0, flow: 4, todo: 0, sheet: 0 };

interface Seed {
  id: string;
  kind: Kind;
  data: string;
  title?: string;
  colorIndex?: number;
  minutes: number;
}

const seeds: Seed[] = [
  {
    id: 'groceries',
    kind: 'todo',
    title: 'Groceries',
    data: JSON.stringify([
      { id: 'g1', label: 'Oat milk', icon: 'milk' },
      { id: 'g2', label: 'Lemons', done: true },
      { id: 'g3', label: 'Coffee beans', note: 'The Đà Lạt arabica' },
      { id: 'g4', label: 'Fresh herbs for phở' },
    ]),
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
  {
    id: 'bank',
    kind: 'note',
    data: '**Call the bank** before Friday about the card.',
    colorIndex: 3,
    minutes: 60 * 20,
  },
  {
    id: 'budget',
    kind: 'sheet',
    title: 'Đà Lạt trip budget',
    data: JSON.stringify({
      columns: [{ label: 'Item', width: 150 }, { label: 'Cost', format: 'number' }, { label: 'Who' }],
      data: [
        ['Night bus', '640000', 'Linh'],
        ['Homestay, 2 nights', '1800000', 'Me'],
        ['Food & coffee', '1200000', 'Both'],
        ['Total', '=SUM(B1:B3)', ''],
      ],
      rows: 4,
      styles: { A4: { bold: true }, B4: { bold: true } },
      formulaBar: false,
      summary: false,
    }),
    minutes: 60 * 6,
  },
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
        { source: 'w2', target: 'w3', label: 'sunny' },
        { source: 'w2', target: 'w4', label: 'rain' },
        { source: 'w3', target: 'w5' },
      ],
    }),
    minutes: 60 * 24 * 2,
  },
  {
    id: 'pho',
    kind: 'page',
    title: 'Phở bò, mum’s way',
    data: 'Char the onion and ginger first. Simmer the bones for six hours, skim often.',
    minutes: 60 * 24 * 9,
  },
  {
    id: 'wifi',
    kind: 'note',
    data: 'Wifi at the café: `hoa-sua-2026`',
    colorIndex: 2,
    minutes: 60 * 24 * 13,
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
          extensionId: s.extensionId,
          colorIndex: s.colorIndex ?? 0,
          gridPosition: s.grid,
          properties: {},
          modifiedDate: s.date,
        });
        set(`ITEM_DATA__${s.id}`, {
          id: s.id,
          dataType: s.dataType,
          empty: false,
          data: s.data,
          properties: s.title ? { title: s.title } : {},
          createdDate: s.date,
          modifiedDate: s.date,
        });
      });
      localStorage.setItem('noteme-settings', JSON.stringify({ theme, features: ['plan'] }));
      const today = new Date();
      const day = (offset: number) => {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      };
      set('PLAN__ITEMS', {
        items: [
          { id: 'p1', title: 'Standup', date: day(0), start: '09:30', end: '10:00' },
          { id: 'p7', title: 'Lunch with the team', date: day(0), start: '12:00', end: '13:00' },
          { id: 'p2', title: 'Dentist', date: day(1), start: '11:00', end: '12:00' },
          { id: 'p3', title: 'Dinner with Linh', date: day(1), start: '19:00', end: '21:00' },
          { id: 'p8', title: 'Yoga', date: day(2), start: '07:00', end: '08:00' },
          { id: 'p4', title: 'Pack for Đà Lạt', date: day(2) },
          { id: 'p5', title: 'Đà Lạt', date: day(3), endDate: day(5) },
          { id: 'p6', title: 'Gym', date: day(-1), start: '07:30', end: '08:30' },
        ],
      });
    },
    {
      theme,
      seeds: seeds.map((s, index) => ({
        ...s,
        date: ago(s.minutes),
        grid: grid(index, rowsOf[s.kind]),
        extensionId: extensionIds[s.kind],
        dataType: dataTypes[s.kind],
      })),
    },
  );
}

const shoot = (page: Page, name: string) => page.screenshot({ path: `art/store/noteme-store-${name}-1280x800.png` });

for (const theme of ['light', 'dark'] as const) {
  test(`store · ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await seed(page, theme);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    // Board.
    await page.locator('ntm-home .home__link', { hasText: 'Notes' }).click();
    await expect(page.locator('ntm-sheet-card')).toHaveCount(1);
    await page.waitForTimeout(1500);
    await shoot(page, `board-${theme}`);

    // Search.
    const search = page.locator('c2-autocomplete input');
    await search.click();
    await search.pressSequentially('Đà Lạt');
    await expect(page.locator('c2-autocomplete c2-list-item').first()).toBeVisible();
    await page.waitForTimeout(400);
    await shoot(page, `search-${theme}`);
    await page.keyboard.press('Escape');
    await search.fill('');
    await page.keyboard.press('Escape');

    // A page.
    await page.locator('ntm-page-card', { hasText: 'Setting up the new laptop' }).click();
    await expect(page.locator('ntm-page-view c2-page-editor pre')).toContainText('brew install');
    await page.waitForTimeout(1000);
    await shoot(page, `page-${theme}`);

    // The slash menu.
    await page.locator('ntm-page-view c2-page-editor .ProseMirror > *').last().click();
    await page.keyboard.press('ControlOrMeta+ArrowDown');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/');
    await page.waitForTimeout(400);
    await shoot(page, `page-slash-menu-${theme}`);
    await page.keyboard.press('Escape');

    // A flow.
    await page.goto('/#/flow/weekend');
    await expect(page.locator('c2-flow .node')).toHaveCount(5);
    await page.waitForTimeout(800);
    await shoot(page, `flow-${theme}`);

    // Plan.
    await page.goto('/#/plan');
    await expect(page.locator('c2-week-planner')).toBeVisible();
    await page.waitForTimeout(600);
    await shoot(page, `plan-week-${theme}`);
    await page.goto('/#/plan?view=month');
    await expect(page.locator('c2-month-planner')).toBeVisible();
    await page.waitForTimeout(600);
    await shoot(page, `plan-month-${theme}`);

    // Settings, over Home.
    await page.goto('/');
    await expect(page.locator('.home__photo')).toBeVisible();
    await page.waitForTimeout(1500);
    await shoot(page, `home-${theme}`);
    await page.locator('ntm-home c2-icon-button[aria-label="Settings"]').click();
    await expect(page.locator('ntm-settings-panel c2-sheet')).toHaveJSProperty('open', true);
    await page.waitForTimeout(600);
    await shoot(page, `settings-${theme}`);
  });
}
