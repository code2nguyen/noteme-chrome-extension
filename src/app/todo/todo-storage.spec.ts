import { describe, expect, it } from 'vitest';
import { forgetTodoList, storeTodoLook } from './todo-storage';

function storage(initial: Record<string, string> = {}) {
  const records = new Map(Object.entries(initial));
  return {
    records,
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => void records.set(key, value),
    removeItem: (key: string) => void records.delete(key),
  };
}

describe('storeTodoLook', () => {
  it("replaces the component's copy of the look with the note's, and keeps the filter tab", () => {
    const store = storage({ 'c2-todo-list:a': JSON.stringify({ look: { palette: 2 }, filter: 'done' }) });
    storeTodoLook('a', { palette: 3 }, store);
    expect(JSON.parse(store.records.get('c2-todo-list:a')!)).toEqual({ look: { palette: 3 }, filter: 'done' });
  });

  it('keeps the filter tab of a list whose look went back to the default', () => {
    const store = storage({ 'c2-todo-list:a': JSON.stringify({ look: { palette: 2 }, filter: 'active' }) });
    storeTodoLook('a', {}, store);
    expect(JSON.parse(store.records.get('c2-todo-list:a')!)).toEqual({ look: {}, filter: 'active' });
  });

  it('leaves nothing behind for a list with the default look and the first tab', () => {
    const store = storage({ 'c2-todo-list:a': JSON.stringify({ look: { palette: 2 } }) });
    storeTodoLook('a', {}, store);
    expect(store.records.size).toBe(0);
  });

  it('writes the look over a record it cannot read', () => {
    const store = storage({ 'c2-todo-list:a': '{' });
    storeTodoLook('a', { density: 'compact' }, store);
    expect(JSON.parse(store.records.get('c2-todo-list:a')!)).toEqual({ look: { density: 'compact' } });
  });

  it('does not throw when storage is blocked', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => storeTodoLook('a', { palette: 1 }, blocked)).not.toThrow();
    expect(() => forgetTodoList('a', blocked)).not.toThrow();
  });
});

describe('forgetTodoList', () => {
  it('removes the record of that list only', () => {
    const store = storage({ 'c2-todo-list:a': '{}', 'c2-todo-list:b': '{}' });
    forgetTodoList('a', store);
    expect([...store.records.keys()]).toEqual(['c2-todo-list:b']);
  });
});
