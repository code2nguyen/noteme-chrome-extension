/**
 * A flow note: boxes and arrows. Stored as JSON in the note's data (the title is in `properties.title`, as for a
 * page). Every edit is a pure function from one document to the next, so the view only routes c2-flow's events here.
 */

import { BoxIcon, BoxInk, BoxPaper, BoxShape, isBoxIcon, isBoxInk, isBoxPaper, isBoxShape } from './flow-style';

/** How a box looks; each is absent until chosen (a box, on the theme's colours, without an icon). */
export interface BoxStyle {
  shape?: BoxShape;
  paper?: BoxPaper;
  /** Absent: Auto, an ink that reads on the paper. */
  ink?: BoxInk;
  icon?: BoxIcon;
}

export interface FlowBox extends BoxStyle {
  id: string;
  label: string;
  /** Top-left corner on the canvas; absent until placed, then the auto layout decides. */
  position?: { x: number; y: number };
}

/** A side of a box, where an arrow leaves or arrives (c2-flow's FlowSide). */
export type ArrowSide = 'top' | 'right' | 'bottom' | 'left';

const ARROW_SIDES: readonly string[] = ['top', 'right', 'bottom', 'left'];

function isArrowSide(value: unknown): value is ArrowSide {
  return typeof value === 'string' && ARROW_SIDES.includes(value);
}

export interface FlowArrow {
  source: string;
  target: string;
  /** Text halfway along the arrow, such as the "yes" and "no" of a decision. */
  label?: string;
  /** The sides of the boxes it was drawn from and to; absent, the flow's direction decides (out right, in left). */
  sourceSide?: ArrowSide;
  targetSide?: ArrowSide;
}

/** The sides an arrow was drawn between, without any it does not have. */
export interface ArrowSides {
  sourceSide?: ArrowSide;
  targetSide?: ArrowSide;
}

function readSides(edge: Partial<ArrowSides>): ArrowSides {
  return {
    ...(isArrowSide(edge.sourceSide) ? { sourceSide: edge.sourceSide } : {}),
    ...(isArrowSide(edge.targetSide) ? { targetSide: edge.targetSide } : {}),
  };
}

export interface FlowDoc {
  nodes: FlowBox[];
  edges: FlowArrow[];
}

export const EMPTY_FLOW: FlowDoc = { nodes: [], edges: [] };
export const NEW_BOX_LABEL = 'New box';

/** Read stored flow data defensively: anything malformed is dropped rather than breaking the view. */
export function parseFlow(data: string | null | undefined): FlowDoc {
  let raw: unknown;
  try {
    raw = JSON.parse(data || 'null');
  } catch {
    return EMPTY_FLOW;
  }
  const doc = (raw ?? {}) as Partial<FlowDoc>;
  const nodes = (Array.isArray(doc.nodes) ? doc.nodes : []).flatMap((node): FlowBox[] => {
    if (!node || typeof node.id !== 'string' || typeof node.label !== 'string') {
      return [];
    }
    const position =
      node.position && Number.isFinite(node.position.x) && Number.isFinite(node.position.y)
        ? { x: node.position.x, y: node.position.y }
        : undefined;
    return [{ id: node.id, label: node.label, ...(position ? { position } : {}), ...readStyle(node) }];
  });
  const ids = new Set(nodes.map((node) => node.id));
  const edges = (Array.isArray(doc.edges) ? doc.edges : []).flatMap((edge): FlowArrow[] => {
    if (!edge || !ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) {
      return [];
    }
    const label = typeof edge.label === 'string' ? edge.label.trim() : '';
    return [{ source: edge.source, target: edge.target, ...(label ? { label } : {}), ...readSides(edge) }];
  });
  return { nodes, edges };
}

/** The style a stored box has, without anything unknown (a shape or colour from a later version is dropped). */
function readStyle(node: Partial<BoxStyle>): BoxStyle {
  return {
    ...(isBoxShape(node.shape) && node.shape !== 'rect' ? { shape: node.shape } : {}),
    ...(isBoxPaper(node.paper) ? { paper: node.paper } : {}),
    ...(isBoxInk(node.ink) ? { ink: node.ink } : {}),
    ...(isBoxIcon(node.icon) ? { icon: node.icon } : {}),
  };
}

export function serializeFlow(doc: FlowDoc): string {
  return JSON.stringify(doc);
}

export function addBox(
  doc: FlowDoc,
  id: string,
  position: { x: number; y: number },
  source?: string,
  sides: ArrowSides = {},
): FlowDoc {
  const edges =
    source && doc.nodes.some((node) => node.id === source)
      ? [...doc.edges, { source, target: id, ...readSides(sides) }]
      : doc.edges;
  return { nodes: [...doc.nodes, { id, label: NEW_BOX_LABEL, position }], edges };
}

/** Renames a box; the same document when nothing changes, so committing an unchanged label saves nothing. */
export function renameBox(doc: FlowDoc, id: string, label: string): FlowDoc {
  const box = doc.nodes.find((node) => node.id === id);
  if (!box || box.label === label) {
    return doc;
  }
  return { ...doc, nodes: doc.nodes.map((node) => (node === box ? { ...node, label } : node)) };
}

export function deleteBox(doc: FlowDoc, id: string): FlowDoc {
  return {
    nodes: doc.nodes.filter((node) => node.id !== id),
    edges: doc.edges.filter((edge) => edge.source !== id && edge.target !== id),
  };
}

/** An arrow from `source` to `target`, between the sides it was drawn from and to; once per pair of boxes. */
export function connect(doc: FlowDoc, source: string, target: string, sides: ArrowSides = {}): FlowDoc {
  const exists = doc.edges.some((edge) => edge.source === source && edge.target === target);
  return exists || source === target ? doc : { ...doc, edges: [...doc.edges, { source, target, ...readSides(sides) }] };
}

export function disconnect(doc: FlowDoc, source: string, target: string): FlowDoc {
  return { ...doc, edges: doc.edges.filter((edge) => edge.source !== source || edge.target !== target) };
}

/** Keep where the boxes are now (after a drag, or once the flow pinned the auto layout). */
export function placeBoxes(doc: FlowDoc, positions: Record<string, { x: number; y: number }> | null): FlowDoc {
  if (!positions) {
    return { ...doc, nodes: doc.nodes.map(({ position: _position, ...node }) => node) };
  }
  return {
    ...doc,
    nodes: doc.nodes.map((node) => {
      const position = positions[node.id];
      return position ? { ...node, position: { x: Math.round(position.x), y: Math.round(position.y) } } : node;
    }),
  };
}

/**
 * Changes how a box looks: each key given is set, or cleared when `undefined` (a plain box is `rect`, so `rect` clears
 * the shape). The same document when nothing changes.
 */
export function styleBox(doc: FlowDoc, id: string, style: BoxStyle): FlowDoc {
  const box = doc.nodes.find((node) => node.id === id);
  if (!box) {
    return doc;
  }
  const next: FlowBox = { ...box };
  for (const key of Object.keys(style) as (keyof BoxStyle)[]) {
    const value = key === 'shape' && style.shape === 'rect' ? undefined : style[key];
    if (value === undefined) {
      delete next[key];
    } else {
      (next as unknown as Record<string, unknown>)[key] = value;
    }
  }
  const same = (['shape', 'paper', 'ink', 'icon'] as const).every((key) => next[key] === box[key]);
  return same ? doc : { ...doc, nodes: doc.nodes.map((node) => (node === box ? next : node)) };
}

/** A copy of a box, label and look, beside it (`at`: where the box is now); not connected to anything. */
export function duplicateBox(doc: FlowDoc, id: string, newId: string, at?: { x: number; y: number }): FlowDoc {
  const box = doc.nodes.find((node) => node.id === id);
  if (!box) {
    return doc;
  }
  const from = at ?? box.position;
  const copy: FlowBox = { ...box, id: newId, ...(from ? { position: { x: from.x + 24, y: from.y + 24 } } : {}) };
  const index = doc.nodes.indexOf(box);
  return { ...doc, nodes: [...doc.nodes.slice(0, index + 1), copy, ...doc.nodes.slice(index + 1)] };
}

/** Names the arrow from `source` to `target`; an empty label removes it. */
export function labelArrow(doc: FlowDoc, source: string, target: string, label: string): FlowDoc {
  const text = label.trim();
  const index = doc.edges.findIndex((edge) => edge.source === source && edge.target === target);
  const edge = doc.edges[index];
  if (!edge || (edge.label ?? '') === text) {
    return doc;
  }
  const { label: _label, ...rest } = edge;
  const edges = [...doc.edges];
  // The arrow keeps its sides.
  edges[index] = { ...rest, ...(text ? { label: text } : {}) };
  return { ...doc, edges };
}

/** The words of a flow, for search and the card: its box labels in order, then the arrows' labels. */
export function flowText(doc: FlowDoc): string {
  return [
    ...doc.nodes.map((node) => node.label),
    ...doc.edges.flatMap((edge) => (edge.label ? [edge.label] : [])),
  ].join('\n');
}
