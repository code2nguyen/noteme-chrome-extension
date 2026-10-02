export enum DataType {
  TEXT = 'text',
  HTML = 'html',
  JSON = 'json',
  /** Quill Delta, written by Noteme 2.x. Converted to MARKDOWN when read. */
  DELTA = 'delta',
  /** The c2-notepad markdown dialect, written by Noteme 3.x text notes. */
  MARKDOWN = 'markdown',
  BLOB = 'blob',
  NA = 'NA',
}
