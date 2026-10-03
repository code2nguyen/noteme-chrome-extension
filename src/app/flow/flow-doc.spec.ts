import { describe, expect, it } from 'vitest';
import {
  addBox,
  connect,
  deleteBox,
  disconnect,
  EMPTY_FLOW,
  flowText,
  labelArrow,
  NEW_BOX_LABEL,
  parseFlow,
  placeBoxes,
  renameBox,
  serializeFlow,
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
});
