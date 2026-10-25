import { flowText, parseFlow } from '../flow/flow-doc';
import { ItemData } from '../store/models';
import { parseTasks, tasksText } from '../todo/todo-doc';
import { parseSheet, sheetText } from '../sheet/sheet-doc';
import { DataType } from '../store/models/data-type';

export function uuid(): string {
  return crypto.randomUUID();
}

export function getCurrentDate(): string {
  return new Date().toISOString();
}

export function getTime(value: string): number {
  return new Date(value).getTime();
}

export function createEmptyItemData(id: string): ItemData {
  return {
    id,
    data: null,
    createdDate: getCurrentDate(),
    modifiedDate: getCurrentDate(),
    empty: true,
    dataType: DataType.NA,
  };
}

export function isNotNullOrUndefined<T>(input: null | undefined | T): input is T {
  return input != null;
}

/**
 * An image (`![alt|320](src)`, as c2-notepad and c2-page-editor write it), on its own line or beside text, reads as
 * its alt text. A typed `\![` is escaped, not an image; after `\\` (an escaped backslash) it is one.
 */
const IMAGE = /(?<!(?:^|[^\\])(?:\\\\)*\\)!\[((?:\\.|[^\]\\])*)\]\((?:<[^>\n]*>|[^\s()]+)\)/g;

function imagesToText(markdown: string): string {
  return markdown.replace(IMAGE, (_, label: string) => label.replace(/(?<!\\)\|\d+$/, ''));
}

/** A fenced code block or an inline code span: what it holds is text as written. */
const CODE =
  /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[ \t]*$|(?![\s\S]))|(`+)[^`\n](?:[^\n]*?[^`\n])?\2(?!`)/gm;

/** Applies `rewrite` to the markdown outside its code, which is kept as written. */
function outsideCode(markdown: string, rewrite: (text: string) => string): string {
  let result = '';
  let last = 0;
  for (const match of markdown.matchAll(CODE)) {
    result += rewrite(markdown.slice(last, match.index)) + match[0];
    last = match.index + match[0].length;
  }
  return result + rewrite(markdown.slice(last));
}

/** Strip the c2-notepad markup so the text can be indexed and previewed. */
export function markdownToText(markdown: string): string {
  return imagesToText(markdown)
    .replace(/^- \[[ xX]\] /gm, '')
    .replace(/<\/?(u|span|mark)\b[^>]*>/g, '')
    .replace(/(?<!\\)(\*\*|~~|==|\*)/g, '')
    .replace(/\\(.)/g, '$1');
}

/** Strip page markdown (c2-page-editor's GFM) down to its words, for search and previews. */
export function pageMarkdownToText(markdown: string): string {
  return (
    // An empty line is written <br>, as is a line break in a table cell: neither is text. A <br> in code is.
    outsideCode(imagesToText(markdown), (text) =>
      text.replace(/^[ \t]*<br\s*\/?>[ \t]*$/gim, '').replace(/<br\s*\/?>/gi, ' '),
    )
      // A table: its options comment and delimiter row go, each row reads as its cells.
      .replace(/^[ \t]*<!--[ \t]*table:.*-->[ \t]*$/gm, '')
      .replace(/^[ \t]*\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)+\|?[ \t]*$/gm, '')
      .replace(/^[ \t]*\|(.*?)(?<!\\)\|?[ \t]*$/gm, (_, cells: string) =>
        cells
          .split(/(?<!\\)\|/)
          .map((cell) => cell.trim())
          .filter(Boolean)
          .join(' · '),
      )
      .replace(/^(`{3,}|~{3,}).*$/gm, '')
      .replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+)/gm, '')
      .replace(/^\s*([-*_])(\s*\1){2,}\s*$/gm, '')
      // A destination may hold balanced parentheses, as in Wikipedia's (disambiguation) links.
      .replace(/!?\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, '$1')
      .replace(/<\/?(u|span|mark)\b[^>]*>/g, '')
      .replace(/(?<!\\)(\*\*|__|~~|\*|`)/g, '')
      .replace(/\\(.)/g, '$1')
      .replace(/\n{2,}/g, '\n')
      .trim()
  );
}

export function getText(data: unknown, type: string, properties?: ItemData['properties']): string {
  if (type === DataType.FLOW) {
    const labels = typeof data === 'string' ? flowText(parseFlow(data)) : '';
    return [properties?.title?.trim(), labels].filter(Boolean).join('\n');
  }
  if (type === DataType.TODO) {
    const tasks = typeof data === 'string' ? tasksText(parseTasks(data)) : '';
    return [properties?.title?.trim(), tasks].filter(Boolean).join('\n');
  }
  if (type === DataType.SHEET) {
    const cells = typeof data === 'string' ? sheetText(parseSheet(data)) : '';
    return [properties?.title?.trim(), cells].filter(Boolean).join('\n');
  }
  if (type === DataType.PAGE) {
    const body = typeof data === 'string' ? pageMarkdownToText(data) : '';
    return [properties?.title?.trim(), body].filter(Boolean).join('\n');
  }
  if (typeof data !== 'string') {
    return '';
  }
  switch (type) {
    case DataType.HTML:
      return data.replace(/<[^>]+>/g, '');
    case DataType.MARKDOWN:
      return markdownToText(data);
    case DataType.TEXT:
      return data;
    default:
      return '';
  }
}

export const IndexableItemTypes: string[] = [
  DataType.HTML,
  DataType.MARKDOWN,
  DataType.PAGE,
  DataType.FLOW,
  DataType.TODO,
  DataType.SHEET,
];

export function without<T>(values: T[], value: T): T[] {
  return values.filter((item) => item !== value);
}

/**
 * A line without its markdown list marker or checkbox: "- [ ] oat milk", "1. [x] oat milk" and "[ ] oat milk" (a task
 * whose number the page editor already dropped) all read "oat milk".
 */
export function plainLine(line: string): string {
  return line
    .trim()
    .replace(/^(?:[-*+]\s+|\d+[.)]\s+)?(?:\[[ xX]\]\s+)?/, '')
    .trim();
}
