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

/** A field is a key of its box (a table's primary key), or points at another box's (a foreign key). */
export type FieldKey = 'primary' | 'foreign';

const FIELD_KEYS: readonly string[] = ['primary', 'foreign'];

/** A row of a box, as a column of a table in a data schema; arrows can leave or arrive at it (c2-flow's ports). */
export interface BoxField {
  /** Unique within its box. */
  id: string;
  name: string;
  /** Free text, such as `uuid` or `text`; absent when none is given. */
  type?: string;
  key?: FieldKey;
}

export interface FlowBox extends BoxStyle {
  id: string;
  label: string;
  /** Top-left corner on the canvas; absent until placed, then the auto layout decides. */
  position?: { x: number; y: number };
  /** Absent on a box without fields, which is drawn as its label only. */
  fields?: BoxField[];
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
  /** The fields it leaves and arrives at, as a foreign key points at a primary key; absent, the box itself. */
  sourcePort?: string;
  targetPort?: string;
  /** How each end is drawn; absent, the start plain and the end an arrowhead. */
  sourceMarker?: ArrowMarker;
  targetMarker?: ArrowMarker;
}

/**
 * How an end of an arrow is drawn (c2-flow's FlowEdgeMarker): an arrowhead, nothing, or the crow's foot of a
 * cardinality, as in an entity-relationship diagram.
 */
export const ARROW_MARKERS = ['arrow', 'none', 'one', 'zero-one', 'many', 'one-many', 'zero-many'] as const;
export type ArrowMarker = (typeof ARROW_MARKERS)[number];

export function isArrowMarker(value: unknown): value is ArrowMarker {
  return typeof value === 'string' && (ARROW_MARKERS as readonly string[]).includes(value);
}

/** The marker an end has when the arrow names none. */
export const DEFAULT_MARKERS = { source: 'none', target: 'arrow' } as const satisfies Record<string, ArrowMarker>;

/** The sides an arrow was drawn between, without any it does not have. */
export interface ArrowSides {
  sourceSide?: ArrowSide;
  targetSide?: ArrowSide;
}

/** The fields an arrow joins, without any it does not have. */
export interface ArrowPorts {
  sourcePort?: string;
  targetPort?: string;
}

/** Which arrow: two boxes, and the fields it joins when it joins fields (two boxes can be joined field by field). */
export interface ArrowRef extends ArrowPorts {
  source: string;
  target: string;
}

function readSides(edge: Partial<ArrowSides>): ArrowSides {
  return {
    ...(isArrowSide(edge.sourceSide) ? { sourceSide: edge.sourceSide } : {}),
    ...(isArrowSide(edge.targetSide) ? { targetSide: edge.targetSide } : {}),
  };
}

/** The ports of an arrow that are fields of its boxes; any other is dropped, and the arrow meets the box. */
function readPorts(nodes: readonly FlowBox[], edge: Partial<ArrowRef>): ArrowPorts {
  const has = (box: string | undefined, field: unknown) =>
    typeof field === 'string' && !!nodes.find((node) => node.id === box)?.fields?.some((entry) => entry.id === field);
  return {
    ...(has(edge.source, edge.sourcePort) ? { sourcePort: edge.sourcePort } : {}),
    ...(has(edge.target, edge.targetPort) ? { targetPort: edge.targetPort } : {}),
  };
}

function readMarkers(edge: Partial<FlowArrow>): Pick<FlowArrow, 'sourceMarker' | 'targetMarker'> {
  return {
    ...(isArrowMarker(edge.sourceMarker) && edge.sourceMarker !== DEFAULT_MARKERS.source
      ? { sourceMarker: edge.sourceMarker }
      : {}),
    ...(isArrowMarker(edge.targetMarker) && edge.targetMarker !== DEFAULT_MARKERS.target
      ? { targetMarker: edge.targetMarker }
      : {}),
  };
}

/** Whether `edge` is the arrow `ref` names: the same boxes, through the same fields. */
export function isArrow(edge: FlowArrow, ref: ArrowRef): boolean {
  return (
    edge.source === ref.source &&
    edge.target === ref.target &&
    edge.sourcePort === ref.sourcePort &&
    edge.targetPort === ref.targetPort
  );
}

/** A box joined to itself only from one of its fields to another, as a table referencing itself. */
function isLoop(ref: ArrowRef): boolean {
  return ref.source === ref.target && (!ref.sourcePort || !ref.targetPort || ref.sourcePort === ref.targetPort);
}

export interface FlowDoc {
  nodes: FlowBox[];
  edges: FlowArrow[];
}

export const EMPTY_FLOW: FlowDoc = { nodes: [], edges: [] };
/** The label of a new box when none is given; the view gives it in the language of the moment. */
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
    const fields = readFields(node.fields);
    return [
      {
        id: node.id,
        label: node.label,
        ...(position ? { position } : {}),
        ...readStyle(node),
        ...(fields.length ? { fields } : {}),
      },
    ];
  });
  const ids = new Set(nodes.map((node) => node.id));
  const edges: FlowArrow[] = [];
  for (const edge of Array.isArray(doc.edges) ? doc.edges : []) {
    if (!edge || !ids.has(edge.source) || !ids.has(edge.target)) {
      continue;
    }
    const ref = { source: edge.source, target: edge.target, ...readPorts(nodes, edge) };
    // A port dropped (its field gone) can make an arrow the same as another: one arrow per pair, as connect() keeps.
    if (isLoop(ref) || edges.some((kept) => isArrow(kept, ref))) {
      continue;
    }
    const label = typeof edge.label === 'string' ? edge.label.trim() : '';
    edges.push({
      source: ref.source,
      target: ref.target,
      ...(label ? { label } : {}),
      ...readSides(edge),
      ...(ref.sourcePort ? { sourcePort: ref.sourcePort } : {}),
      ...(ref.targetPort ? { targetPort: ref.targetPort } : {}),
      ...readMarkers(edge),
    });
  }
  return { nodes, edges };
}

/** A box's stored fields, each once, without a malformed one or an unknown key. */
function readFields(value: unknown): BoxField[] {
  const seen = new Set<string>();
  return (Array.isArray(value) ? (value as Partial<BoxField>[]) : []).flatMap((field): BoxField[] => {
    if (!field || typeof field.id !== 'string' || typeof field.name !== 'string' || seen.has(field.id)) {
      return [];
    }
    seen.add(field.id);
    const type = typeof field.type === 'string' ? field.type.trim() : '';
    const key = typeof field.key === 'string' && FIELD_KEYS.includes(field.key) ? field.key : undefined;
    return [{ id: field.id, name: field.name, ...(type ? { type } : {}), ...(key ? { key } : {}) }];
  });
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

/**
 * A box named `label` (written into the document: it stays in the language it was made in), connected from `source`
 * (from its field `sourcePort`, when the arrow was drawn from one).
 */
export function addBox(
  doc: FlowDoc,
  id: string,
  position: { x: number; y: number },
  source?: string,
  ends: ArrowSides & Pick<ArrowPorts, 'sourcePort'> = {},
  label = NEW_BOX_LABEL,
): FlowDoc {
  const edges =
    source && doc.nodes.some((node) => node.id === source)
      ? [
          ...doc.edges,
          { source, target: id, ...readSides(ends), ...readPorts(doc.nodes, { source, sourcePort: ends.sourcePort }) },
        ]
      : doc.edges;
  return { nodes: [...doc.nodes, { id, label, position }], edges };
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

/**
 * An arrow from `source` to `target`, between the sides it was drawn from and to, or the fields; once per pair of boxes
 * (per pair of fields, for an arrow between fields).
 */
export function connect(doc: FlowDoc, source: string, target: string, ends: ArrowSides & ArrowPorts = {}): FlowDoc {
  const ref = { source, target, ...readPorts(doc.nodes, { source, target, ...ends }) };
  if (isLoop(ref) || doc.edges.some((edge) => isArrow(edge, ref))) {
    return doc;
  }
  return { ...doc, edges: [...doc.edges, { ...ref, ...readSides(ends) }] };
}

export function disconnect(doc: FlowDoc, ref: ArrowRef): FlowDoc {
  return { ...doc, edges: doc.edges.filter((edge) => !isArrow(edge, ref)) };
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

/** Names the arrow `ref`; an empty label removes it. */
export function labelArrow(doc: FlowDoc, ref: ArrowRef, label: string): FlowDoc {
  const text = label.trim();
  const index = doc.edges.findIndex((edge) => isArrow(edge, ref));
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

/** Draws one end of the arrow `ref` as `marker`; its default (the start plain, the end an arrowhead) is not stored. */
export function markArrow(doc: FlowDoc, ref: ArrowRef, end: 'source' | 'target', marker: ArrowMarker): FlowDoc {
  const key = end === 'source' ? 'sourceMarker' : 'targetMarker';
  const index = doc.edges.findIndex((edge) => isArrow(edge, ref));
  const edge = doc.edges[index];
  if (!edge || (edge[key] ?? DEFAULT_MARKERS[end]) === marker) {
    return doc;
  }
  const { [key]: _marker, ...rest } = edge;
  const edges = [...doc.edges];
  edges[index] = { ...rest, ...(marker !== DEFAULT_MARKERS[end] ? { [key]: marker } : {}) };
  return { ...doc, edges };
}

/** The box `id` with its fields changed by `change`; the same document when there is no such box. */
function withFields(doc: FlowDoc, id: string, change: (fields: BoxField[]) => BoxField[]): FlowDoc {
  const box = doc.nodes.find((node) => node.id === id);
  if (!box) {
    return doc;
  }
  const fields = change(box.fields ?? []);
  if (fields === (box.fields ?? [])) {
    return doc;
  }
  const { fields: _fields, ...rest } = box;
  const next: FlowBox = fields.length ? { ...rest, fields } : rest;
  return { ...doc, nodes: doc.nodes.map((node) => (node === box ? next : node)) };
}

/** A field at the end of box `id`'s, named `name`. */
export function addField(doc: FlowDoc, id: string, fieldId: string, name: string): FlowDoc {
  return withFields(doc, id, (fields) =>
    fields.some((field) => field.id === fieldId) ? fields : [...fields, { id: fieldId, name }],
  );
}

/**
 * Changes a field of box `id`: each key given is set, or cleared when empty or `undefined`. An empty name keeps the one
 * it had (a field is always named). The same document when nothing changes.
 */
export function editField(
  doc: FlowDoc,
  id: string,
  fieldId: string,
  change: Partial<Pick<BoxField, 'name' | 'type' | 'key'>>,
): FlowDoc {
  return withFields(doc, id, (fields) => {
    const field = fields.find((entry) => entry.id === fieldId);
    if (!field) {
      return fields;
    }
    const name = change.name?.trim() || field.name;
    const type = 'type' in change ? change.type?.trim() || undefined : field.type;
    const key = 'key' in change ? change.key : field.key;
    if (name === field.name && type === field.type && key === field.key) {
      return fields;
    }
    const next: BoxField = { id: field.id, name, ...(type ? { type } : {}), ...(key ? { key } : {}) };
    return fields.map((entry) => (entry === field ? next : entry));
  });
}

/** Removes a field of box `id`, and the arrows that leave or arrive at it. */
export function deleteField(doc: FlowDoc, id: string, fieldId: string): FlowDoc {
  const next = withFields(doc, id, (fields) =>
    fields.some((field) => field.id === fieldId) ? fields.filter((field) => field.id !== fieldId) : fields,
  );
  if (next === doc) {
    return doc;
  }
  const through = (edge: FlowArrow) =>
    (edge.source === id && edge.sourcePort === fieldId) || (edge.target === id && edge.targetPort === fieldId);
  return { ...next, edges: next.edges.filter((edge) => !through(edge)) };
}

/** Moves the field at index `from` of box `id`'s to index `to` (counted once it is taken out, as c2-flow's row-move). */
export function moveField(doc: FlowDoc, id: string, from: number, to: number): FlowDoc {
  return withFields(doc, id, (fields) => {
    if (from === to || !fields[from] || to < 0 || to >= fields.length) {
      return fields;
    }
    const next = [...fields];
    const [field] = next.splice(from, 1);
    next.splice(to, 0, field);
    return next;
  });
}

/** The words of a flow, for search and the card: its box labels (each with its fields) in order, then the arrows' labels. */
export function flowText(doc: FlowDoc): string {
  return [
    ...doc.nodes.flatMap((node) => [node.label, ...(node.fields ?? []).map((field) => field.name)]),
    ...doc.edges.flatMap((edge) => (edge.label ? [edge.label] : [])),
  ].join('\n');
}
