import type { IFuseOptions } from 'fuse.js';

import type { ItemData } from '../store/models';
import { getText } from './utils';

/** A note as the search reads it: its words, whatever its kind. */
export interface SearchDocument {
  id: string;
  text: string;
}

/** The same search in the app (SearchService) and from the address bar (the worker's omnibox). */
export const SEARCH_OPTIONS: IFuseOptions<SearchDocument> = {
  keys: ['text'],
  useExtendedSearch: true,
  // A page is long: a word must match wherever it is, not only near the start (Fuse's default `distance` of 100
  // characters from `location` 0 misses everything further down). The tighter threshold keeps fuzzy noise out.
  ignoreLocation: true,
  threshold: 0.3,
};

export const toSearchDocument = (item: ItemData): SearchDocument => ({
  id: item.id,
  text: getText(item.data, item.dataType, item.properties),
});
