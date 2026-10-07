import '@c2n/components/menu';
import '@c2n/components/menu/menu-item';
import './flow-icons';

import type { FlowBox } from './flow-doc';
import {
  BOX_ICONS,
  BOX_INKS,
  BOX_PAPERS,
  BOX_SHAPES,
  BoxIcon,
  BoxInk,
  BoxPaper,
  BoxShape,
  iconLabel,
  isBoxIcon,
  isBoxInk,
  isBoxPaper,
  isBoxShape,
} from './flow-style';

/**
 * The right-click menu of a flow box: its shape, paper and ink as rows of choices that apply at once (the menu stays
 * open to try them), an icon picker, and Duplicate. c2-flow renders the rows in its own shadow root, out of reach of
 * the app's stylesheets, so they are built here as elements and the swatches carry their colour inline.
 */

/** What a row of the box menu asks for, read from its value (`box:<what>[:<name>]`). */
export type BoxMenuChoice =
  | { kind: 'shape'; shape: BoxShape }
  | { kind: 'paper'; paper: BoxPaper | undefined }
  | { kind: 'ink'; ink: BoxInk | undefined }
  | { kind: 'icon'; icon: BoxIcon | undefined }
  | { kind: 'duplicate' };

export function readBoxMenuValue(value: string): BoxMenuChoice | null {
  const [prefix, kind, name] = value.split(':');
  if (prefix !== 'box') {
    return null;
  }
  switch (kind) {
    case 'shape':
      return isBoxShape(name) ? { kind, shape: name } : null;
    case 'paper':
      return name === 'none' || isBoxPaper(name) ? { kind, paper: name === 'none' ? undefined : name } : null;
    case 'ink':
      return name === 'auto' || isBoxInk(name) ? { kind, ink: name === 'auto' ? undefined : name } : null;
    case 'icon':
      return name === 'none' || isBoxIcon(name) ? { kind, icon: name === 'none' ? undefined : name } : null;
    case 'duplicate':
      return { kind };
    default:
      return null;
  }
}

/** The outline of each shape, small, for its choice in the menu. */
const SHAPE_GLYPHS: Record<BoxShape, string> = {
  rect: '<rect x="2" y="4" width="16" height="10" rx="2"/>',
  pill: '<rect x="2" y="4" width="16" height="10" rx="5"/>',
  diamond: '<path d="M10 1.5 18.5 9 10 16.5 1.5 9z"/>',
  circle: '<circle cx="10" cy="9" r="7"/>',
  note: '<path d="M2.5 2.5h10l5 5v9h-15z M12.5 2.5v5h5"/>',
  slanted: '<path d="M5.5 4h13l-4 10h-13z"/>',
};

const SWATCH =
  'display:block;box-sizing:border-box;width:18px;height:18px;border-radius:50%;box-shadow:inset 0 0 0 1px rgb(0 0 0 / 28%)';

function element(tag: string, attributes: Record<string, string | boolean> = {}, ...children: (Node | string)[]) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== false) {
      node.setAttribute(name, value === true ? '' : value);
    }
  }
  node.append(...children);
  return node;
}

function shapeGlyph(shape: BoxShape): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('slot', 'prefix-icon');
  svg.setAttribute('viewBox', '0 0 20 18');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = SHAPE_GLYPHS[shape];
  return svg;
}

function swatch(style: string): HTMLElement {
  return element('span', { slot: 'prefix-icon', 'aria-hidden': 'true', style: `${SWATCH};${style}` });
}

/** One choice of a row: a radio of its group, kept open so the box changes under the menu. */
function choice(group: string, name: string, label: string, checked: boolean, look: Node): HTMLElement {
  return element(
    'c2-menu-item',
    { type: 'radio', name: `box-${group}`, value: `box:${group}:${name}`, label, checked, 'keep-open': true },
    look,
  );
}

function iconElement(icon: BoxIcon | 'smiley' | 'prohibit' | 'copy', slot?: string): HTMLElement {
  return element(`c2-phosphor-${icon}`, slot ? { slot, 'aria-hidden': 'true' } : { 'aria-hidden': 'true' });
}

/** The rows of a box's menu; the flow's own Rename and Delete follow them. */
export function boxMenu(box: FlowBox): Node[] {
  const shape = box.shape ?? 'rect';
  const iconRows: HTMLElement[] = [];
  for (let start = 0; start < BOX_ICONS.length; start += 6) {
    iconRows.push(
      element(
        'c2-menu-row',
        { 'aria-label': 'Icons' },
        ...BOX_ICONS.slice(start, start + 6).map((icon) =>
          element(
            'c2-menu-item',
            {
              type: 'radio',
              name: 'box-icon',
              value: `box:icon:${icon}`,
              label: iconLabel(icon),
              checked: box.icon === icon,
            },
            iconElement(icon, 'prefix-icon'),
          ),
        ),
      ),
    );
  }

  return [
    element('h6', {}, 'Shape'),
    element(
      'c2-menu-row',
      { 'aria-label': 'Shape' },
      ...BOX_SHAPES.map(({ name, label }) => choice('shape', name, label, shape === name, shapeGlyph(name))),
    ),
    element('h6', {}, 'Paper'),
    element(
      'c2-menu-row',
      { 'aria-label': 'Paper' },
      ...BOX_PAPERS.map(({ name, label, color }) =>
        choice('paper', name, label, box.paper === name, swatch(`background:${color}`)),
      ),
      choice('paper', 'none', 'No paper', !box.paper, swatch('border:1.5px dashed currentColor;box-shadow:none')),
    ),
    element('h6', {}, 'Text'),
    element(
      'c2-menu-row',
      { 'aria-label': 'Text colour' },
      choice('ink', 'auto', 'Auto', !box.ink, swatch('background:conic-gradient(#f0ebe0 0 50%, #2b2a28 0)')),
      ...BOX_INKS.map(({ name, label, color }) =>
        choice('ink', name, label, box.ink === name, swatch(`background:${color}`)),
      ),
    ),
    element('hr'),
    element(
      'c2-menu-item',
      { label: 'Icon' },
      iconElement('smiley', 'prefix-icon'),
      'Icon',
      element('span', { slot: 'shortcut' }, box.icon ? iconLabel(box.icon) : 'None'),
      element(
        'c2-menu',
        { slot: 'submenu', 'aria-label': 'Icon' },
        ...iconRows,
        element('hr'),
        element(
          'c2-menu-item',
          { value: 'box:icon:none', disabled: !box.icon },
          iconElement('prohibit', 'prefix-icon'),
          'No icon',
        ),
      ),
    ),
    element('c2-menu-item', { value: 'box:duplicate' }, iconElement('copy', 'prefix-icon'), 'Duplicate'),
    element('hr'),
  ];
}
