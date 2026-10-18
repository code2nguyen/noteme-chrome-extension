import { ExtensionId } from '../extension-id';
import { noteDefaultProperties } from '../note-config';
import { ArtBoardItem } from '../store/models';

/** The characters of a page shown on its card. */
export const PAGE_EXCERPT_LENGTH = 220;

const MIN_PAGE_ROWS = 3;
/** The smallest a card can be resized to: below it a note, a list or a flow can no longer be read. */
const MIN_CARD_ROWS = 5;
export const MIN_CARD_COLUMNS = 2;
const MAX_PAGE_ROWS = 6;
const CHARS_PER_ROW = 70;

/** A page's stored height until it is resized, which stands for "as tall as its excerpt": no card can be 0 rows high. */
export const PAGE_AUTO_ROWS = noteDefaultProperties[ExtensionId.Page].gridPosition.rows;
/** A sheet's stored height until it is resized, which stands for "as tall as its rows". */
export const SHEET_AUTO_ROWS = noteDefaultProperties[ExtensionId.Sheet].gridPosition.rows;

/** The most sheet lines a card grows to; past them the sheet scrolls inside it. */
const MAX_SHEET_LINES = 12;
/** A sheet card's title, column names, buttons and padding, and one line of the sheet, in pixels. */
const SHEET_CHROME = 150;
const SHEET_LINE = 32;
/** One board row and the gap after it (board.scss: --c2-masonry--row-height, --c2-masonry--gap). */
const BOARD_ROW = 20;
const BOARD_GAP = 16;

/** A card that follows its content: a page left at its excerpt's height, a sheet at its rows'. */
function followsContent(item: ArtBoardItem): boolean {
  return (
    (item.extensionId === ExtensionId.Page && item.gridPosition.rows === PAGE_AUTO_ROWS) ||
    (item.extensionId === ExtensionId.Sheet && item.gridPosition.rows === SHEET_AUTO_ROWS)
  );
}

/**
 * The rows a card spans. Notes, lists and flows keep their stored height; a page card is as tall as its excerpt and a
 * sheet card as its rows (up to MAX_SHEET_LINES), until it is resized. `contentSize` is only called for such a card:
 * a page's text length, a sheet's lines (sheet-doc.ts sheetLines). Reading either means parsing the note's data.
 */
export function cardRows(item: ArtBoardItem, contentSize: () => number): number {
  if (!followsContent(item)) {
    return item.gridPosition.rows;
  }
  if (item.extensionId === ExtensionId.Sheet) {
    const height = SHEET_CHROME + SHEET_LINE * Math.min(MAX_SHEET_LINES, Math.max(1, contentSize()));
    return Math.max(MIN_CARD_ROWS, Math.ceil((height + BOARD_GAP) / (BOARD_ROW + BOARD_GAP)));
  }
  return Math.min(
    MAX_PAGE_ROWS,
    MIN_PAGE_ROWS + Math.ceil(Math.min(contentSize(), PAGE_EXCERPT_LENGTH) / CHARS_PER_ROW),
  );
}

/** The rows to store for a card the board laid out `tileRows` high: a card left at its content's height keeps following it. */
export function storedRows(item: ArtBoardItem, tileRows: number, contentSize: () => number): number {
  return followsContent(item) && tileRows === cardRows(item, contentSize) ? item.gridPosition.rows : tileRows;
}

/** The fewest rows a resize can leave a card: a page keeps the height of its shortest excerpt card. */
export function minCardRows(item: ArtBoardItem): number {
  return item.extensionId === ExtensionId.Page ? MIN_PAGE_ROWS : MIN_CARD_ROWS;
}
