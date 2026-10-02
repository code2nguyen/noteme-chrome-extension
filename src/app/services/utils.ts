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

export function getText(data: unknown, type: string): string {
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

export const IndexableItemTypes: string[] = [DataType.TEXT, DataType.HTML, DataType.MARKDOWN];

export function without<T>(values: T[], value: T): T[] {
  return values.filter((item) => item !== value);
}
