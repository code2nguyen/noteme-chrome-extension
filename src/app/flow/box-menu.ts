import '@c2n/components/menu';
import '@c2n/components/menu/menu-item';
import './flow-icons';

import type { I18n } from '../i18n/i18n.service';
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
  isBoxIcon,
  isBoxInk,
  isBoxPaper,
  isBoxShape,
} from './flow-style';

/**
 * The right-click menu of a flow box: its shape, paper and ink as rows of choices that apply at once (the menu stays
 * open to try them), an icon picker, its fields, and Duplicate. c2-flow renders the rows in its own shadow root, out of reach of
 * the app's stylesheets, so they are built here as elements and the swatches carry their colour inline. Built each
 * time the menu opens, with the text in the language of the moment (`t`).
 */

/** What a row of the box menu asks for, read from its value (`box:<what>[:<name>]`). */
export type BoxMenuChoice =
  | { kind: 'shape'; shape: BoxShape }
  | { kind: 'paper'; paper: BoxPaper | undefined }
  | { kind: 'ink'; ink: BoxInk | undefined }
  | { kind: 'icon'; icon: BoxIcon | undefined }
  | { kind: 'fields' }
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
    case 'fields':
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

export function element(
  tag: string,
  attributes: Record<string, string | boolean> = {},
  ...children: (Node | string)[]
) {
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

function iconElement(icon: BoxIcon | 'smiley' | 'prohibit' | 'copy' | 'rows', slot?: string): HTMLElement {
  return element(`c2-phosphor-${icon}`, slot ? { slot, 'aria-hidden': 'true' } : { 'aria-hidden': 'true' });
}

/** The rows of a box's menu; the flow's own Rename and Delete follow them. */
export function boxMenu(box: FlowBox, t: I18n['t']): Node[] {
  const shape = box.shape ?? 'rect';
  const iconRows: HTMLElement[] = [];
  for (let start = 0; start < BOX_ICONS.length; start += 6) {
    iconRows.push(
      element(
        'c2-menu-row',
        { 'aria-label': t('flow.menu.icons') },
        ...BOX_ICONS.slice(start, start + 6).map((icon) =>
          element(
            'c2-menu-item',
            {
              type: 'radio',
              name: 'box-icon',
              value: `box:icon:${icon}`,
              label: t(`flow.icon.${icon}`),
              checked: box.icon === icon,
            },
            iconElement(icon, 'prefix-icon'),
          ),
        ),
      ),
    );
  }

  return [
    element('h6', {}, t('flow.menu.shape')),
    element(
      'c2-menu-row',
      { 'aria-label': t('flow.menu.shape') },
      ...BOX_SHAPES.map(({ name }) => choice('shape', name, t(`flow.shape.${name}`), shape === name, shapeGlyph(name))),
    ),
    element('h6', {}, t('flow.menu.paper')),
    element(
      'c2-menu-row',
      { 'aria-label': t('flow.menu.paper') },
      ...BOX_PAPERS.map(({ name, color }) =>
        choice('paper', name, t(`flow.paper.${name}`), box.paper === name, swatch(`background:${color}`)),
      ),
      choice(
        'paper',
        'none',
        t('flow.menu.noPaper'),
        !box.paper,
        swatch('border:1.5px dashed currentColor;box-shadow:none'),
      ),
    ),
    element('h6', {}, t('flow.menu.text')),
    element(
      'c2-menu-row',
      { 'aria-label': t('flow.menu.textColour') },
      choice(
        'ink',
        'auto',
        t('flow.menu.auto'),
        !box.ink,
        swatch('background:conic-gradient(#f0ebe0 0 50%, #2b2a28 0)'),
      ),
      ...BOX_INKS.map(({ name, color }) =>
        choice('ink', name, t(`flow.ink.${name}`), box.ink === name, swatch(`background:${color}`)),
      ),
    ),
    element('hr'),
    element(
      'c2-menu-item',
      { label: t('flow.menu.icon') },
      iconElement('smiley', 'prefix-icon'),
      t('flow.menu.icon'),
      element('span', { slot: 'shortcut' }, box.icon ? t(`flow.icon.${box.icon}`) : t('flow.menu.none')),
      element(
        'c2-menu',
        { slot: 'submenu', 'aria-label': t('flow.menu.icon') },
        ...iconRows,
        element('hr'),
        element(
          'c2-menu-item',
          { value: 'box:icon:none', disabled: !box.icon },
          iconElement('prohibit', 'prefix-icon'),
          t('flow.menu.noIcon'),
        ),
      ),
    ),
    // A box's fields make it a table of a data schema, its arrows joining field to field.
    element(
      'c2-menu-item',
      { value: 'box:fields' },
      iconElement('rows', 'prefix-icon'),
      t('flow.menu.fields'),
      ...(box.fields?.length ? [element('span', { slot: 'shortcut' }, String(box.fields.length))] : []),
    ),
    element('c2-menu-item', { value: 'box:duplicate' }, iconElement('copy', 'prefix-icon'), t('flow.menu.duplicate')),
    element('hr'),
  ];
}
