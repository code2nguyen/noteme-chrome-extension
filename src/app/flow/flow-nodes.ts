import type { FlowNode } from '@c2n/components/flow';

import './flow-icons';
import { FlowDoc } from './flow-doc';
import { inkColor, paperColor } from './flow-style';

/** A flow's boxes as c2-flow draws them: placed where they were left, in their shape, colours and icon. */
export function flowNodes(doc: FlowDoc): FlowNode[] {
  return doc.nodes.map(({ id, label, position, shape, paper, ink, icon }) => ({
    id,
    label,
    ...(position ? { position } : {}),
    ...(shape ? { shape } : {}),
    background: paperColor(paper),
    color: inkColor(ink, paper),
    icon: icon ? document.createElement(`c2-phosphor-${icon}`) : undefined,
  }));
}
