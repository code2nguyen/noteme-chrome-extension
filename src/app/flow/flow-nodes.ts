import type { FlowNode, FlowNodeRow } from '@c2n/components/flow';

import './flow-icons';
import { BoxField, FlowDoc } from './flow-doc';
import { inkColor, paperColor } from './flow-style';

/** The icon before a key field: a key for a primary key, a link for a foreign one. */
const KEY_ICONS = { primary: 'key', foreign: 'link-simple' } as const;

/**
 * The icon elements one c2-flow draws, by box and field (or box alone) and icon: each redraw of the flow (an edit, a
 * drag) hands it the same element for a row whose icon did not change, rather than a new one for every keyed field.
 * One per c2-flow, as an element can only be in one place.
 */
export type FlowIcons = Map<string, HTMLElement>;

function iconElement(icons: FlowIcons, used: Set<string>, slot: string, name: string): HTMLElement {
  const key = `${slot}|${name}`;
  used.add(key);
  let element = icons.get(key);
  if (!element) {
    element = document.createElement(`c2-phosphor-${name}`);
    icons.set(key, element);
  }
  return element;
}

function fieldRow(icons: FlowIcons, used: Set<string>, boxId: string, { id, name, type, key }: BoxField): FlowNodeRow {
  return {
    id,
    label: name,
    ...(type ? { meta: type } : {}),
    ...(key ? { icon: iconElement(icons, used, `${boxId}/${id}`, KEY_ICONS[key]) } : {}),
  };
}

/**
 * A flow's boxes as c2-flow draws them: placed where they were left, in their shape, colours and icon. The icons of
 * boxes and fields no longer drawn (deleted, their key changed, another flow shown) leave `icons`.
 */
export function flowNodes(doc: FlowDoc, icons: FlowIcons = new Map()): FlowNode[] {
  const used = new Set<string>();
  const nodes = doc.nodes.map(({ id, label, position, shape, paper, ink, icon, fields }) => ({
    id,
    label,
    ...(position ? { position } : {}),
    ...(shape ? { shape } : {}),
    background: paperColor(paper),
    color: inkColor(ink, paper),
    icon: icon ? iconElement(icons, used, id, icon) : undefined,
    ...(fields ? { rows: fields.map((field) => fieldRow(icons, used, id, field)) } : {}),
  }));
  for (const key of icons.keys()) {
    if (!used.has(key)) {
      icons.delete(key);
    }
  }
  return nodes;
}
