import { Dictionary } from '@ngrx/entity';

import { ExtensionId } from '../extension-id';
import { kindOf, untitled } from '../board/older-notes';
import { ArtBoardItem, ItemData } from '../store/models';
import { editedLabel, getText, plainLine } from './utils';

/** A search result as a row of the search field: its first line, and what it is and when it was edited. */
export interface SearchSuggestion {
  id: string;
  label: string;
  description: string;
}

const PREVIEW_LENGTH = 80;

/** The notes that open full screen, and their route; a quick note and a to-do list are shown on the board instead. */
export const FULL_SCREEN: Partial<Record<ExtensionId, string>> = {
  [ExtensionId.Page]: '/page',
  [ExtensionId.Flow]: '/flow',
};

/** The search results (the store's, from fuse.js) as rows for the home and board search fields. */
export function searchSuggestions(items: ArtBoardItem[], data: Dictionary<ItemData>): SearchSuggestion[] {
  return items.map((item) => {
    const itemData = data[item.id];
    const text = itemData ? getText(itemData.data, itemData.dataType, itemData.properties) : '';
    // Its first line as text: "1. Pack" reads "Pack", as in the Older notes and the Archive.
    const firstLine = text.split('\n').map(plainLine).find(Boolean) ?? '';
    const kind = kindOf(item);
    const label = firstLine || untitled(kind);
    const dataModified = itemData?.empty ? undefined : itemData?.modifiedDate;
    const edited = editedLabel(dataModified ?? item.dataModifiedDate ?? item.modifiedDate);
    return {
      id: item.id,
      label: label.length > PREVIEW_LENGTH ? label.slice(0, PREVIEW_LENGTH) + '…' : label,
      description: `${kind} · ${edited}`,
    };
  });
}

/** The search shortcut as this keyboard writes it (Apple keyboards say ⌘ where others say Ctrl); both work. */
export function searchShortcut(): string {
  const agent = navigator as Navigator & { userAgentData?: { platform?: string } };
  return /mac|iphone|ipad/i.test(agent.userAgentData?.platform || navigator.platform) ? '⌘ K' : 'Ctrl K';
}
