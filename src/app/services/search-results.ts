import { Dictionary } from '@ngrx/entity';

import { kindOf, shortKindKey, Translate } from '../board/older-notes';
import { untitledKey } from '../i18n/kinds';
import { ArtBoardItem, ItemData } from '../store/models';
import { formatRelativeTime, toDate } from '@c2n/components/relative-time';

import { getText, plainLine } from './utils';

/** A search result as a row of the search field: its first line, and what it is and when it was edited. */
export interface SearchSuggestion {
  id: string;
  label: string;
  description: string;
}

const PREVIEW_LENGTH = 80;

export { FULL_SCREEN } from '../extension-id';

/**
 * The search results (the store's, from fuse.js) as rows for the home and board search fields, in the app's language:
 * `t` and `locale` are `I18n.t` and `I18n.locale()`.
 */
export function searchSuggestions(
  items: ArtBoardItem[],
  data: Dictionary<ItemData>,
  t: Translate,
  locale: string,
): SearchSuggestion[] {
  return items.map((item) => {
    const itemData = data[item.id];
    const text = itemData ? getText(itemData.data, itemData.dataType, itemData.properties) : '';
    // Its first line as text: "1. Pack" reads "Pack", as in the Older notes and the Archive.
    const firstLine = text.split('\n').map(plainLine).find(Boolean) ?? '';
    const kind = kindOf(item);
    const label = firstLine || t(untitledKey(kind));
    const dataModified = itemData?.empty ? undefined : itemData?.modifiedDate;
    const date = toDate(dataModified ?? item.dataModifiedDate ?? item.modifiedDate);
    const edited = date ? formatRelativeTime(date, new Date(), { locale }) : '';
    return {
      id: item.id,
      label: label.length > PREVIEW_LENGTH ? label.slice(0, PREVIEW_LENGTH) + '…' : label,
      description: `${t(shortKindKey(kind))} · ${edited}`,
    };
  });
}

/** The search shortcut as this keyboard writes it (Apple keyboards say ⌘ where others say Ctrl); both work. */
export function searchShortcut(): string {
  const agent = navigator as Navigator & { userAgentData?: { platform?: string } };
  return /mac|iphone|ipad/i.test(agent.userAgentData?.platform || navigator.platform) ? '⌘ K' : 'Ctrl K';
}
