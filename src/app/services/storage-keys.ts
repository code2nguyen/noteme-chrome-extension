/**
 * The keys of the records in chrome.storage, in one framework-free module: the app (storage.api.ts) and the background
 * worker (src/worker) read the same ones.
 */

/** A note's card: `ART_BOARD_ITEM__<id>`. */
export const ART_BOARD_ITEM_PREFIX = 'ART_BOARD_ITEM__';
/** A note's text: `ITEM_DATA__<id>`. */
export const ITEM_DATA_PREFIX = 'ITEM_DATA__';
/** The one record holding every plan: small, so it is read and written whole. */
export const PLAN_KEY = 'PLAN__ITEMS';
