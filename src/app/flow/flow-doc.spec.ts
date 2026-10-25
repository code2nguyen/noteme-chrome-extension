import { describe, expect, it } from 'vitest';
import {
  addBox,
  addField,
  connect,
  deleteBox,
  deleteField,
  disconnect,
  duplicateBox,
  editField,
  EMPTY_FLOW,
  flowText,
  labelArrow,
  markArrow,
  moveField,
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

  it('names a new box in the language it is given, leaving the boxes already there as they are', () => {
    const doc = addBox(addBox(EMPTY_FLOW, 'a', at(0, 0)), 'b', at(1, 0), 'a', {}, 'Nouvelle boîte');
    expect(doc.nodes.map((node) => node.label)).toEqual([NEW_BOX_LABEL, 'Nouvelle boîte']);
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
    expect(disconnect(doc, { source: 'a', target: 'b' }).edges).toEqual([{ source: 'b', target: 'c' }]);
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

  it('keeps the sides an arrow was drawn between, through a label and a reload, and drops unknown ones', () => {
    const boxes = addBox(addBox(EMPTY_FLOW, 'a', at(0, 0)), 'b', at(0, 1));
    const doc = connect(boxes, 'a', 'b', { sourceSide: 'bottom', targetSide: 'top' });
    expect(doc.edges).toEqual([{ source: 'a', target: 'b', sourceSide: 'bottom', targetSide: 'top' }]);
    const labelled = labelArrow(doc, { source: 'a', target: 'b' }, 'next');
    expect(labelled.edges).toEqual([
      { source: 'a', target: 'b', label: 'next', sourceSide: 'bottom', targetSide: 'top' },
    ]);
    expect(parseFlow(serializeFlow(labelled)).edges).toEqual(labelled.edges);
    const odd = JSON.stringify({
      ...boxes,
      edges: [{ source: 'a', target: 'b', sourceSide: 'middle', targetSide: 'left' }],
    });
    expect(parseFlow(odd).edges).toEqual([{ source: 'a', target: 'b', targetSide: 'left' }]);
  });

  it('labels an arrow, and an empty label removes it', () => {
    const doc = connect(addBox(addBox(EMPTY_FLOW, 'a', at(0, 0)), 'b', at(1, 0)), 'a', 'b');
    const labelled = labelArrow(doc, { source: 'a', target: 'b' }, '  yes ');
    expect(labelled.edges).toEqual([{ source: 'a', target: 'b', label: 'yes' }]);
    expect(labelArrow(labelled, { source: 'a', target: 'b' }, 'yes')).toBe(labelled);
    expect(labelArrow(labelled, { source: 'a', target: 'b' }, ' ').edges).toEqual([{ source: 'a', target: 'b' }]);
    expect(labelArrow(doc, { source: 'b', target: 'a' }, 'no')).toBe(doc);
    // A box deleted takes its labelled arrows with it.
    expect(deleteBox(labelled, 'b').edges).toEqual([]);
  });

  it('gives its labels as text, the arrows after the boxes', () => {
    const doc = connect(renameBox(addBox(addBox(EMPTY_FLOW, 'a', at(0, 0)), 'b', at(1, 0)), 'a', 'Pack'), 'a', 'b');
    expect(flowText(doc)).toBe(`Pack\n${NEW_BOX_LABEL}`);
    expect(flowText(labelArrow(doc, { source: 'a', target: 'b' }, 'if it rains'))).toBe(
      `Pack\n${NEW_BOX_LABEL}\nif it rains`,
    );
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

  describe('fields (a data schema)', () => {
    /** Two tables: customers(id) and orders(id, customer_id). */
    const schema = () => {
      let doc = addBox(
        addBox(EMPTY_FLOW, 'c', at(0, 0), undefined, {}, 'customers'),
        'o',
        at(300, 0),
        undefined,
        {},
        'orders',
      );
      doc = addField(doc, 'c', 'id', 'id');
      doc = addField(addField(doc, 'o', 'id', 'id'), 'o', 'cid', 'customer_id');
      return doc;
    };

    it('adds, edits and orders the fields of a box', () => {
      let doc = schema();
      expect(doc.nodes[1].fields?.map((field) => field.name)).toEqual(['id', 'customer_id']);
      expect(addField(doc, 'o', 'id', 'again')).toBe(doc);
      expect(addField(doc, 'missing', 'x', 'x')).toBe(doc);
      doc = editField(doc, 'c', 'id', { type: ' uuid ', key: 'primary' });
      expect(doc.nodes[0].fields).toEqual([{ id: 'id', name: 'id', type: 'uuid', key: 'primary' }]);
      expect(editField(doc, 'c', 'id', { type: 'uuid' })).toBe(doc);
      // A field keeps its name when emptied; an empty type or no key clears it.
      expect(editField(doc, 'c', 'id', { name: '  ', type: '', key: undefined }).nodes[0].fields).toEqual([
        { id: 'id', name: 'id' },
      ]);
      expect(moveField(doc, 'o', 1, 0).nodes[1].fields?.map((field) => field.id)).toEqual(['cid', 'id']);
      expect(moveField(doc, 'o', 0, 5)).toBe(doc);
      expect(flowText(doc)).toBe('customers\nid\norders\nid\ncustomer_id');
    });

    it('joins fields, several times between the same boxes and within one box, and only through fields it has', () => {
      let doc = schema();
      doc = connect(doc, 'o', 'c', { sourcePort: 'cid', targetPort: 'id' });
      doc = connect(doc, 'o', 'c', { sourcePort: 'id', targetPort: 'id' });
      expect(connect(doc, 'o', 'c', { sourcePort: 'cid', targetPort: 'id' })).toBe(doc);
      expect(doc.edges).toEqual([
        { source: 'o', target: 'c', sourcePort: 'cid', targetPort: 'id' },
        { source: 'o', target: 'c', sourcePort: 'id', targetPort: 'id' },
      ]);
      // A table referencing itself, from one field to another; never a field to itself.
      expect(connect(doc, 'o', 'o', { sourcePort: 'cid', targetPort: 'id' }).edges).toHaveLength(3);
      expect(connect(doc, 'o', 'o', { sourcePort: 'id', targetPort: 'id' })).toBe(doc);
      // A port that is not a field of its box is dropped: the arrow meets the box.
      expect(connect(schema(), 'c', 'o', { sourcePort: 'cid' }).edges).toEqual([{ source: 'c', target: 'o' }]);
      // Arrows between fields are told apart by them.
      const ref = { source: 'o', target: 'c', sourcePort: 'id', targetPort: 'id' };
      expect(disconnect(doc, ref).edges).toEqual([doc.edges[0]]);
      expect(labelArrow(doc, ref, 'odd').edges[1].label).toBe('odd');
      expect(labelArrow(doc, { source: 'o', target: 'c' }, 'none')).toBe(doc);
    });

    it('takes the arrows through a field away with it', () => {
      let doc = connect(schema(), 'o', 'c', { sourcePort: 'cid', targetPort: 'id' });
      doc = connect(doc, 'o', 'c');
      const without = deleteField(doc, 'o', 'cid');
      expect(without.nodes[1].fields?.map((field) => field.id)).toEqual(['id']);
      expect(without.edges).toEqual([{ source: 'o', target: 'c' }]);
      // The last field gone, the box has none.
      expect(deleteField(schema(), 'c', 'id').nodes[0]).not.toHaveProperty('fields');
      expect(deleteField(doc, 'o', 'missing')).toBe(doc);
    });

    it('draws the ends of an arrow as cardinalities, storing only what is not the default', () => {
      const ref = { source: 'o', target: 'c', sourcePort: 'cid', targetPort: 'id' };
      let doc = connect(schema(), 'o', 'c', ref);
      doc = markArrow(markArrow(doc, ref, 'source', 'many'), ref, 'target', 'one');
      expect(doc.edges[0]).toEqual({ ...ref, sourceMarker: 'many', targetMarker: 'one' });
      expect(markArrow(doc, ref, 'source', 'many')).toBe(doc);
      expect(markArrow(doc, ref, 'target', 'arrow').edges[0]).toEqual({ ...ref, sourceMarker: 'many' });
      expect(markArrow(doc, { source: 'o', target: 'c' }, 'source', 'one')).toBe(doc);
    });

    it('reads fields, ports and markers back, dropping what does not hold', () => {
      const ref = { source: 'o', target: 'c', sourcePort: 'cid', targetPort: 'id' };
      const doc = markArrow(
        connect(editField(schema(), 'c', 'id', { key: 'primary' }), 'o', 'c', ref),
        ref,
        'source',
        'many',
      );
      expect(parseFlow(serializeFlow(doc))).toEqual(doc);
      const odd = JSON.stringify({
        nodes: [
          {
            id: 'a',
            label: 'A',
            fields: [{ id: 'x', name: 'x', key: 'unique', type: 3 }, { id: 'x', name: 'dup' }, { name: 'no id' }],
          },
          { id: 'b', label: 'B', fields: 'nope' },
        ],
        edges: [
          {
            source: 'a',
            target: 'b',
            sourcePort: 'x',
            targetPort: 'gone',
            sourceMarker: 'star',
            targetMarker: 'arrow',
          },
          { source: 'a', target: 'a', sourcePort: 'x', targetPort: 'x' },
        ],
      });
      expect(parseFlow(odd)).toEqual({
        nodes: [
          { id: 'a', label: 'A', fields: [{ id: 'x', name: 'x' }] },
          { id: 'b', label: 'B' },
        ],
        edges: [{ source: 'a', target: 'b', sourcePort: 'x' }],
      });
    });

    it('keeps one arrow when a dropped field makes two the same', () => {
      const odd = JSON.stringify({
        nodes: [
          { id: 'o', label: 'O', fields: [{ id: 'cid', name: 'cid' }] },
          { id: 'c', label: 'C' },
        ],
        edges: [
          { source: 'o', target: 'c', sourcePort: 'cid', targetPort: 'id', label: 'first' },
          { source: 'o', target: 'c', sourcePort: 'cid', label: 'second' },
        ],
      });
      expect(parseFlow(odd).edges).toEqual([{ source: 'o', target: 'c', sourcePort: 'cid', label: 'first' }]);
    });

    it('connects a new box from the field an arrow was drawn from', () => {
      const doc = addBox(schema(), 'n', at(600, 0), 'o', { sourcePort: 'cid', sourceSide: 'right' });
      expect(doc.edges).toEqual([{ source: 'o', target: 'n', sourceSide: 'right', sourcePort: 'cid' }]);
    });
  });
});
