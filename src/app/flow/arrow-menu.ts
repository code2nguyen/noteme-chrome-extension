import '@c2n/components/menu';
import '@c2n/components/menu/menu-item';

import type { I18n } from '../i18n/i18n.service';
import { element } from './box-menu';
import { ARROW_MARKERS, ArrowMarker, DEFAULT_MARKERS, FlowArrow, isArrowMarker } from './flow-doc';

/**
 * The right-click menu of a flow arrow: how its start and its end are drawn, an arrowhead or the crow's foot of a
 * cardinality, as rows of choices that apply at once (the menu stays open to try them). Built as elements, as the box
 * menu is (c2-flow renders the rows in its own shadow root), each time the menu opens.
 */

/** What a row of the arrow menu asks for, read from its value (`arrow:<end>:<marker>`). */
export interface ArrowMenuChoice {
  end: 'source' | 'target';
  marker: ArrowMarker;
}

export function readArrowMenuValue(value: string): ArrowMenuChoice | null {
  const [prefix, end, marker] = value.split(':');
  if (prefix !== 'arrow' || (end !== 'source' && end !== 'target') || !isArrowMarker(marker)) {
    return null;
  }
  return { end, marker };
}

/** Each end as drawn on the right of a short line; the start's are mirrored. */
const MARKER_GLYPHS: Record<ArrowMarker, string> = {
  arrow: '<path d="M2 9h19 M15 4l6 5-6 5"/>',
  none: '<path d="M2 9h20"/>',
  one: '<path d="M2 9h20 M15 4v10 M19 4v10"/>',
  'zero-one': '<path d="M2 9h6 M14 9h8 M18 4v10"/><circle cx="11" cy="9" r="3"/>',
  many: '<path d="M2 9h20 M15 9l7-5 M15 9l7 5"/>',
  'one-many': '<path d="M2 9h20 M12 4v10 M15 9l7-5 M15 9l7 5"/>',
  'zero-many': '<path d="M2 9h4 M12 9h10 M15 9l7-5 M15 9l7 5"/><circle cx="9" cy="9" r="3"/>',
};

function markerGlyph(marker: ArrowMarker, end: 'source' | 'target'): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('slot', 'prefix-icon');
  svg.setAttribute('viewBox', '0 0 24 18');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    end === 'source' ? `<g transform="matrix(-1 0 0 1 24 0)">${MARKER_GLYPHS[marker]}</g>` : MARKER_GLYPHS[marker];
  return svg;
}

function endRow(edge: FlowArrow, end: 'source' | 'target', t: I18n['t']): HTMLElement[] {
  const current = (end === 'source' ? edge.sourceMarker : edge.targetMarker) ?? DEFAULT_MARKERS[end];
  const heading = t(end === 'source' ? 'flow.menu.arrowStart' : 'flow.menu.arrowEnd');
  return [
    element('h6', {}, heading),
    element(
      'c2-menu-row',
      { 'aria-label': heading },
      ...ARROW_MARKERS.map((marker) =>
        element(
          'c2-menu-item',
          {
            type: 'radio',
            name: `arrow-${end}`,
            value: `arrow:${end}:${marker}`,
            label: t(`flow.marker.${marker}`),
            checked: current === marker,
            'keep-open': true,
          },
          markerGlyph(marker, end),
        ),
      ),
    ),
  ];
}

/** The rows of an arrow's menu; the flow's own Edit label and Delete follow them. */
export function arrowMenu(edge: FlowArrow, t: I18n['t']): Node[] {
  return [...endRow(edge, 'source', t), ...endRow(edge, 'target', t), element('hr')];
}
