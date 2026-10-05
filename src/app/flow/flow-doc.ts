/**
 * A flow note: boxes and arrows. Stored as JSON in the note's data (the title is in `properties.title`, as for a
 * page). Every edit is a pure function from one document to the next, so the view only routes c2-flow's events here.
 */

export interface FlowBox {
  id: string;
  label: string;
  /** Top-left corner on the canvas; absent until placed, then the auto layout decides. */
  position?: { x: number; y: number };
}

export interface FlowArrow {
  source: string;
  target: string;
  /** Text halfway along the arrow, such as the "yes" and "no" of a decision. */
  label?: string;
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
    return [{ id: node.id, label: node.label, ...(position ? { position } : {}) }];
  });
  const ids = new Set(nodes.map((node) => node.id));
  const edges = (Array.isArray(doc.edges) ? doc.edges : []).flatMap((edge): FlowArrow[] => {
    if (!edge || !ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) {
      return [];
    }
    const label = typeof edge.label === 'string' ? edge.label.trim() : '';
    return [{ source: edge.source, target: edge.target, ...(label ? { label } : {}) }];
  });
  return { nodes, edges };
}

export function serializeFlow(doc: FlowDoc): string {
  return JSON.stringify(doc);
}

export function addBox(doc: FlowDoc, id: string, position: { x: number; y: number }, source?: string): FlowDoc {
  const edges =
    source && doc.nodes.some((node) => node.id === source) ? [...doc.edges, { source, target: id }] : doc.edges;
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

export function connect(doc: FlowDoc, source: string, target: string): FlowDoc {
  const exists = doc.edges.some((edge) => edge.source === source && edge.target === target);
  return exists || source === target ? doc : { ...doc, edges: [...doc.edges, { source, target }] };
}

export function disconnect(doc: FlowDoc, source: string, target: string): FlowDoc {
  return { ...doc, edges: doc.edges.filter((edge) => edge.source !== source || edge.target !== target) };
}

/** Keep where the boxes are now (after a drag, or once the flow pinned the auto layout). */
export function placeBoxes(doc: FlowDoc, positions: Record<string, { x: number; y: number }> | null): FlowDoc {
  if (!positions) {
    return { ...doc, nodes: doc.nodes.map(({ id, label }) => ({ id, label })) };
  }
  return {
    ...doc,
    nodes: doc.nodes.map((node) => {
      const position = positions[node.id];
      return position ? { ...node, position: { x: Math.round(position.x), y: Math.round(position.y) } } : node;
    }),
  };
}

/** Names the arrow from `source` to `target`; an empty label removes it. */
export function labelArrow(doc: FlowDoc, source: string, target: string, label: string): FlowDoc {
  const text = label.trim();
  const index = doc.edges.findIndex((edge) => edge.source === source && edge.target === target);
  const edge = doc.edges[index];
  if (!edge || (edge.label ?? '') === text) {
    return doc;
  }
  const edges = [...doc.edges];
  edges[index] = { source, target, ...(text ? { label: text } : {}) };
  return { ...doc, edges };
}

/** The words of a flow, for search and the card: its box labels in order, then the arrows' labels. */
export function flowText(doc: FlowDoc): string {
  return [
    ...doc.nodes.map((node) => node.label),
    ...doc.edges.flatMap((edge) => (edge.label ? [edge.label] : [])),
  ].join('\n');
}
