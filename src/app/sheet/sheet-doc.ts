/**
 * A sheet note: c2-spreadsheet's columns, inputs and cell styles, stored as JSON in the note's data (the title is in
 * `properties.title`, as for a list). JSON rather than a pipe table: a sheet keeps its column widths and formats.
 */

import type { SpreadsheetCellStyle, SpreadsheetColumn } from '@c2n/components/spreadsheet';

export interface SheetDoc {
  /** One entry per column: its name (`label`), and the width, format and alignment the user gave it. */
  columns: SpreadsheetColumn[];
  /** Raw inputs row by row; a formula is a string starting with `=`. */
  data: string[][];
  rows: number;
  /** Cell styles by address (`B3`). */
  styles: Record<string, SpreadsheetCellStyle>;
  /** The formula bar and the totals of the selection, shown or not. */
  formulaBar: boolean;
  summary: boolean;
}

/** A new sheet: three columns to name and three rows to fill. */
export function newSheet(): SheetDoc {
  return { columns: [{}, {}, {}], data: [], rows: 3, styles: {}, formulaBar: false, summary: false };
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Read a stored sheet defensively: anything malformed falls back to a new sheet's part rather than breaking the card. */
export function parseSheet(data: string | null | undefined): SheetDoc {
  let raw: unknown;
  try {
    raw = JSON.parse(data || 'null');
  } catch {
    return newSheet();
  }
  if (!isObject(raw)) {
    return newSheet();
  }
  const fresh = newSheet();
  const columns = Array.isArray(raw['columns'])
    ? raw['columns'].map((column) => (isObject(column) ? column : {}))
    : fresh.columns;
  const rowsOf = Array.isArray(raw['data']) ? raw['data'] : [];
  const cells = rowsOf.map((row) => (Array.isArray(row) ? row.map((cell) => (cell == null ? '' : String(cell))) : []));
  const rows =
    typeof raw['rows'] === 'number' && raw['rows'] > 0 ? Math.floor(raw['rows']) : Math.max(fresh.rows, cells.length);
  return {
    columns: columns.length ? (columns as SpreadsheetColumn[]) : fresh.columns,
    data: cells,
    rows: Math.max(rows, cells.length, 1),
    styles: isObject(raw['styles']) ? (raw['styles'] as Record<string, SpreadsheetCellStyle>) : {},
    formulaBar: raw['formulaBar'] === true,
    summary: raw['summary'] === true,
  };
}

export function serializeSheet(sheet: SheetDoc): string {
  return JSON.stringify(sheet);
}

/** The lines a sheet's card shows: its rows, plus the formula bar and the totals bar when they are on. */
export function sheetLines(sheet: SheetDoc): number {
  return sheet.rows + (sheet.formulaBar ? 1 : 0) + (sheet.summary ? 1 : 0);
}

/**
 * The sheet as text, for the search, the Older notes and the Archive: the column names, then each row's cells joined
 * by " · ". A formula's input says little to a reader and is left out.
 */
export function sheetText(sheet: SheetDoc): string {
  const line = (cells: readonly string[]) =>
    cells
      .map((cell) => cell.trim())
      .filter((cell) => cell && !cell.startsWith('='))
      .join(' · ');
  const header = line(sheet.columns.map((column) => column.label ?? ''));
  return [header, ...sheet.data.map(line)].filter(Boolean).join('\n');
}

/** The sheet as a GitHub pipe table, which a page pastes as a table: the column names, then the rows, formulas included. */
export function sheetToMarkdown(sheet: SheetDoc): string {
  const width = Math.max(1, sheet.columns.length, ...sheet.data.map((row) => row.length));
  const cell = (text: string | undefined) => (text ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
  const line = (cells: (string | undefined)[]) =>
    `| ${Array.from({ length: width }, (_, index) => cell(cells[index])).join(' | ')} |`;
  const lines = [
    line(sheet.columns.map((column) => column.label)),
    `| ${Array.from({ length: width }, () => '---').join(' | ')} |`,
  ];
  for (let row = 0; row < sheet.rows; row++) {
    lines.push(line(sheet.data[row] ?? []));
  }
  return lines.join('\n');
}
