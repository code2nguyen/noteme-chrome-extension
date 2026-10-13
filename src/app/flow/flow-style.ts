/**
 * How a flow box can look: its shape, its paper, its ink and an icon. A box stores the names; the colours are looked up
 * here, so a box keeps its look when the palette is tuned. Their names in the menu are messages:
 * `flow.shape.<name>`, `flow.paper.<name>`, `flow.ink.<name>`, `flow.icon.<icon>`.
 */

export const BOX_SHAPES = [
  { name: 'rect' },
  { name: 'pill' },
  { name: 'diamond' },
  { name: 'circle' },
  { name: 'note' },
  { name: 'slanted' },
] as const;
export type BoxShape = (typeof BOX_SHAPES)[number]['name'];

/** The board's papers, a shade deeper so a box stands out on the canvas; `night` is dark. */
export const BOX_PAPERS = [
  { name: 'cream', color: '#f3ead0' },
  { name: 'yellow', color: '#f5e08a' },
  { name: 'green', color: '#cfe3c4' },
  { name: 'blue', color: '#b8ceee' },
  { name: 'pink', color: '#f4b8c3' },
  { name: 'lilac', color: '#e3c9f0' },
  { name: 'night', color: '#232a33' },
] as const;
export type BoxPaper = (typeof BOX_PAPERS)[number]['name'];

export const BOX_INKS = [
  { name: 'dark', color: '#2b2a28' },
  { name: 'blue', color: '#1f3f73' },
  { name: 'green', color: '#2f6b3c' },
  { name: 'red', color: '#a3392b' },
  { name: 'purple', color: '#7a3f9a' },
  { name: 'light', color: '#f0ebe0' },
] as const;
export type BoxInk = (typeof BOX_INKS)[number]['name'];

/** Phosphor icons a box can wear before its label, in the order of the picker (rows of six). */
export const BOX_ICONS = [
  'check-circle',
  'warning',
  'question',
  'star',
  'heart',
  'flag',
  'lightbulb',
  'clock',
  'calendar',
  'user',
  'chat-circle',
  'envelope',
  'phone',
  'house',
  'map-pin',
  'airplane',
  'bus',
  'shopping-cart',
  'currency-dollar',
  'book-open',
  'gear',
  'sun',
  'cloud',
  'umbrella',
] as const;
export type BoxIcon = (typeof BOX_ICONS)[number];

export const isBoxShape = (value: unknown): value is BoxShape => BOX_SHAPES.some((shape) => shape.name === value);
export const isBoxPaper = (value: unknown): value is BoxPaper => BOX_PAPERS.some((paper) => paper.name === value);
export const isBoxInk = (value: unknown): value is BoxInk => BOX_INKS.some((ink) => ink.name === value);
export const isBoxIcon = (value: unknown): value is BoxIcon => BOX_ICONS.includes(value as BoxIcon);

export function paperColor(paper: BoxPaper | undefined): string | undefined {
  return BOX_PAPERS.find((entry) => entry.name === paper)?.color;
}

/**
 * The colour of a box's words: its ink, or (Auto) one that reads on its paper, dark on every paper but night. A box
 * with neither keeps the theme's colours.
 */
export function inkColor(ink: BoxInk | undefined, paper: BoxPaper | undefined): string | undefined {
  if (ink) {
    return BOX_INKS.find((entry) => entry.name === ink)?.color;
  }
  if (!paper) {
    return undefined;
  }
  return paper === 'night' ? '#f0ebe0' : '#2b2a28';
}
