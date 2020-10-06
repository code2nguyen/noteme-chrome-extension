/**
 * Storage is a key value store with following strategy :
 * Entity
 * - entity: key: ENTITY_NAME + ID, value: Entity Value
 * - entity Ids:  key: ENTITY_NAME_IDS, value: Array of Entity Id
 * Master/Detail Entity
 * - MasterDetailIds: key: MASTER_ENTITY_NAME__DETAIL_ENTITY_IDS + Master ID, value: Array of detail IDs
 */
import { Observable } from 'rxjs';
import { InjectionToken } from '@angular/core';

export const STORAGE_API = new InjectionToken<StorageApi>('Storage API Service');
export interface StorageApi {
  set(key: string, value: any): Observable<void>;
  get<T = any>(key: string): Observable<T | undefined>;
  get<T = any>(key: string[]): Observable<T[]>;
  remove(key: string | string[]): Observable<void>;
}

export function artBoardArtBoardItemIdsKey(boardId: string): string {
  return `_ART_BOARD__ART_BOARD_ITEM_IDS__${boardId}`;
}

export function artBoardItemIdsKey(): string {
  return `_ART_BOARD_ITEM__IDS`;
}

export function artBoardItemKey(artBoardItemId: string): string {
  return `ART_BOARD_ITEM__${artBoardItemId}`;
}

export function itemDataKey(itemDataId: string): string {
  return `ITEM_DATA__${itemDataId}`;
}

export function userKey(): string {
  return `USER`;
}

export function itemDataIndexKey(): string {
  return `_ITEM_DATA_INDEX`;
}
