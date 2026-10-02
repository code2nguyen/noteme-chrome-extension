import { ItemData } from './models';

/** Fold the partial updates of one note into one, later fields winning; `properties` merge key by key. */
export function mergeItemDataUpdates(updates: Partial<ItemData>[]): Partial<ItemData> {
  return updates.reduce<Partial<ItemData>>(
    (merged, update) => ({ ...merged, ...update, properties: { ...merged.properties, ...update.properties } }),
    {},
  );
}
