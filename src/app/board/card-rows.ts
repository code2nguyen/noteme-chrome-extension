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

/**
 * The rows a card spans. Notes and flows keep their stored height; a page card is as tall as its excerpt, so a short
 * page is a short card, until it is resized. `pageTextLength` is only called for such a page: reading the text means
 * parsing its markdown.
 */
export function cardRows(item: ArtBoardItem, pageTextLength: () => number): number {
  if (item.extensionId !== ExtensionId.Page || item.gridPosition.rows !== PAGE_AUTO_ROWS) {
    return item.gridPosition.rows;
  }
  return Math.min(
    MAX_PAGE_ROWS,
    MIN_PAGE_ROWS + Math.ceil(Math.min(pageTextLength(), PAGE_EXCERPT_LENGTH) / CHARS_PER_ROW),
  );
}

/** The rows to store for a card the board laid out `tileRows` high: a page left at its excerpt's height keeps following it. */
export function storedRows(item: ArtBoardItem, tileRows: number, pageTextLength: () => number): number {
  return item.extensionId === ExtensionId.Page && tileRows === cardRows(item, pageTextLength)
    ? item.gridPosition.rows
    : tileRows;
}

/** The fewest rows a resize can leave a card: a page keeps the height of its shortest excerpt card. */
export function minCardRows(item: ArtBoardItem): number {
  return item.extensionId === ExtensionId.Page ? MIN_PAGE_ROWS : MIN_CARD_ROWS;
}
