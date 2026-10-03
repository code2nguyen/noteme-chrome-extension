import { ItemData } from '../store/models';
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

/** Strip the c2-notepad markup so the text can be indexed and previewed. */
export function markdownToText(markdown: string): string {
  return markdown
    .replace(/^- \[[ xX]\] /gm, '')
    .replace(/<\/?(u|span|mark)\b[^>]*>/g, '')
    .replace(/(?<!\\)(\*\*|~~|==|\*)/g, '')
    .replace(/\\(.)/g, '$1');
}

/** Strip page markdown (c2-page-editor's GFM) down to its words, for search and previews. */
export function pageMarkdownToText(markdown: string): string {
  return markdown
    .replace(/^(`{3,}|~{3,}).*$/gm, '')
    .replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+)/gm, '')
    .replace(/^\s*([-*_])(\s*\1){2,}\s*$/gm, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<\/?(u|span|mark)\b[^>]*>/g, '')
    .replace(/(?<!\\)(\*\*|__|~~|\*|`)/g, '')
    .replace(/\\(.)/g, '$1')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** "2 min ago", "yesterday", "Tue", "24 Sep": how recent an edit is, in a few words. */
export function editedLabel(value: string | undefined, now = new Date()): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  if (days === 1) {
    return 'yesterday';
  }
  if (days < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

export function getText(data: unknown, type: string, properties?: ItemData['properties']): string {
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

export const IndexableItemTypes: string[] = [DataType.HTML, DataType.MARKDOWN, DataType.PAGE];

export function without<T>(values: T[], value: T): T[] {
  return values.filter((item) => item !== value);
}
