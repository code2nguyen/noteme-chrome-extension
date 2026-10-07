import { describe, expect, it } from 'vitest';
import {
  addBox,
  connect,
  deleteBox,
  disconnect,
  duplicateBox,
  EMPTY_FLOW,
  flowText,
  labelArrow,
  NEW_BOX_LABEL,
  parseFlow,
  placeBoxes,
  renameBox,
  serializeFlow,
  styleBox,
} from './flow-doc';

const at = (x: number, y: number) => ({ x, y });

describe('flow document', () => {
  it('reads stored data defensively', () => {
    expect(parseFlow(null)).toEqual(EMPTY_FLOW);
    expect(parseFlow('not json')).toEqual(EMPTY_FLOW);
    const doc = parseFlow(
      JSON.stringify({
        nodes: [
          { id: 'a', label: 'A', position: { x: 1, y: 2 } },
          { id: 'b', label: 'B', position: { x: 'x' } },
          { id: 3 },
        ],
        edges: [
          { source: 'a', target: 'b', label: ' yes ' },
          { source: 'b', target: 'a', label: 42 },
          { source: 'a', target: 'gone' },
          { source: 'a', target: 'a' },
        ],
      }),
    );
    expect(doc).toEqual({
      nodes: [
        { id: 'a', label: 'A', position: { x: 1, y: 2 } },
        { id: 'b', label: 'B' },
      ],
      edges: [
        { source: 'a', target: 'b', label: 'yes' },
        { source: 'b', target: 'a' },
      ],
    });
    expect(parseFlow(serializeFlow(doc))).toEqual(doc);
  });

  it('adds a box where asked, connected from its source', () => {
    let doc = addBox(EMPTY_FLOW, 'a', at(10, 20));
    expect(doc.nodes).toEqual([{ id: 'a', label: NEW_BOX_LABEL, position: at(10, 20) }]);
    doc = addBox(doc, 'b', at(200, 20), 'a');
    expect(doc.edges).toEqual([{ source: 'a', target: 'b' }]);
    expect(addBox(doc, 'c', at(0, 0), 'missing').edges).toHaveLength(1);
  });

  it('renames, connects once, disconnects and deletes with the arrows that touch it', () => {
    let doc = addBox(addBox(addBox(EMPTY_FLOW, 'a', at(0, 0)), 'b', at(1, 0)), 'c', at(2, 0));
    doc = renameBox(doc, 'a', 'Weather ok?');
    expect(doc.nodes[0].label).toBe('Weather ok?');
    expect(renameBox(doc, 'a', 'Weather ok?')).toBe(doc);
    expect(renameBox(doc, 'missing', 'Rain')).toBe(doc);
    doc = connect(connect(connect(doc, 'a', 'b'), 'a', 'b'), 'b', 'c');
    expect(doc.edges).toEqual([
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
    ]);
    expect(connect(doc, 'a', 'a')).toBe(doc);
    expect(disconnect(doc, 'a', 'b').edges).toEqual([{ source: 'b', target: 'c' }]);
    const without = deleteBox(doc, 'b');
    expect(without.nodes.map((node) => node.id)).toEqual(['a', 'c']);
    expect(without.edges).toEqual([]);
  });

  it('keeps positions, rounded, and forgets them on an auto layout', () => {
    const doc = addBox(addBox(EMPTY_FLOW, 'a', at(0, 0)), 'b', at(0, 0));
    expect(placeBoxes(doc, { a: at(10.4, 20.6) }).nodes).toEqual([
      { id: 'a', label: NEW_BOX_LABEL, position: at(10, 21) },
      { id: 'b', label: NEW_BOX_LABEL, position: at(0, 0) },
    ]);
    expect(placeBoxes(doc, null).nodes).toEqual([
      { id: 'a', label: NEW_BOX_LABEL },
      { id: 'b', label: NEW_BOX_LABEL },
    ]);
  });

  it('labels an arrow, and an empty label removes it', () => {
    const doc = connect(addBox(addBox(EMPTY_FLOW, 'a', at(0, 0)), 'b', at(1, 0)), 'a', 'b');
    const labelled = labelArrow(doc, 'a', 'b', '  yes ');
    expect(labelled.edges).toEqual([{ source: 'a', target: 'b', label: 'yes' }]);
    expect(labelArrow(labelled, 'a', 'b', 'yes')).toBe(labelled);
    expect(labelArrow(labelled, 'a', 'b', ' ').edges).toEqual([{ source: 'a', target: 'b' }]);
    expect(labelArrow(doc, 'b', 'a', 'no')).toBe(doc);
    // A box deleted takes its labelled arrows with it.
    expect(deleteBox(labelled, 'b').edges).toEqual([]);
  });

  it('gives its labels as text, the arrows after the boxes', () => {
    const doc = connect(renameBox(addBox(addBox(EMPTY_FLOW, 'a', at(0, 0)), 'b', at(1, 0)), 'a', 'Pack'), 'a', 'b');
    expect(flowText(doc)).toBe(`Pack\n${NEW_BOX_LABEL}`);
    expect(flowText(labelArrow(doc, 'a', 'b', 'if it rains'))).toBe(`Pack\n${NEW_BOX_LABEL}\nif it rains`);
  });

  it('styles a box, keeps its look through an auto layout, and reads only known styles back', () => {
    let doc = addBox(EMPTY_FLOW, 'a', at(0, 0));
    doc = styleBox(doc, 'a', { shape: 'diamond', paper: 'yellow', icon: 'question' });
    expect(doc.nodes[0]).toEqual({
      id: 'a',
      label: NEW_BOX_LABEL,
      position: at(0, 0),
      shape: 'diamond',
      paper: 'yellow',
      icon: 'question',
    });
    expect(styleBox(doc, 'a', { paper: 'yellow' })).toBe(doc);
    expect(styleBox(doc, 'missing', { paper: 'blue' })).toBe(doc);
    // A box is the plain shape, and undefined clears a choice (Auto ink, no icon).
    const plain = styleBox(styleBox(doc, 'a', { shape: 'rect', icon: undefined }), 'a', { ink: 'red' });
    expect(plain.nodes[0]).toEqual({ id: 'a', label: NEW_BOX_LABEL, position: at(0, 0), paper: 'yellow', ink: 'red' });

    expect(placeBoxes(doc, null).nodes[0]).toEqual({
      id: 'a',
      label: NEW_BOX_LABEL,
      shape: 'diamond',
      paper: 'yellow',
      icon: 'question',
    });
    expect(parseFlow(serializeFlow(doc))).toEqual(doc);
    const odd = JSON.stringify({
      nodes: [{ id: 'a', label: 'A', shape: 'star', paper: 'gold', ink: 7, icon: 'rocket' }],
    });
    expect(parseFlow(odd).nodes).toEqual([{ id: 'a', label: 'A' }]);
  });

  it('duplicates a box beside it, with its look and without its arrows', () => {
    let doc = connect(addBox(addBox(EMPTY_FLOW, 'a', at(10, 20)), 'b', at(300, 20)), 'a', 'b');
    doc = styleBox(doc, 'a', { shape: 'pill', paper: 'green' });
    const copied = duplicateBox(doc, 'a', 'c');
    expect(copied.nodes.map((node) => node.id)).toEqual(['a', 'c', 'b']);
    expect(copied.nodes[1]).toEqual({ ...copied.nodes[0], id: 'c', position: at(34, 44) });
    expect(copied.edges).toEqual(doc.edges);
    expect(duplicateBox(doc, 'a', 'd', at(100, 100)).nodes[1].position).toEqual(at(124, 124));
    expect(duplicateBox(doc, 'missing', 'e')).toBe(doc);
  });
});
