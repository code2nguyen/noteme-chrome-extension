/**
 * What c2-todo-list keeps in localStorage under its `storage-key`: the filter tab (All, To do, Done), which Noteme
 * wants remembered on this computer, and a copy of the list's look, which it puts back when the list is drawn.
 * Noteme keeps the look with the note, where another computer may change it; this file is the one place that knows
 * the component's record, `c2-todo-list:<key>` holding `{ look, filter? }`.
 */
const PREFIX = 'c2-todo-list:';

type KeyValue = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Make the component's copy of the look the one kept with the note, before the list is drawn from it. The filter
 * tab is left as it is; a list with neither leaves nothing behind.
 */
export function storeTodoLook(id: string, look: object, storage: KeyValue = localStorage): void {
  try {
    const key = PREFIX + id;
    let stored: unknown;
    try {
      stored = JSON.parse(storage.getItem(key) ?? 'null');
    } catch {
      stored = null;
    }
    const filter = stored && typeof stored === 'object' ? (stored as { filter?: unknown }).filter : undefined;
    if (Object.keys(look).length === 0 && filter === undefined) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, JSON.stringify(filter === undefined ? { look } : { look, filter }));
    }
  } catch {
    // Storage can be full or blocked: the list is then drawn with the look bound to it.
  }
}

/** Drop the record of a list that was deleted, here or on another computer. */
export function forgetTodoList(id: string, storage: KeyValue = localStorage): void {
  try {
    storage.removeItem(PREFIX + id);
  } catch {
    // Storage can be blocked; nothing to forget then.
  }
}
