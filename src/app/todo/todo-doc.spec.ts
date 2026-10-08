import { describe, expect, it } from 'vitest';

import { parseTasks, serializeTasks, tasksText } from './todo-doc';

describe('todo-doc', () => {
  it('reads stored tasks back as they were written', () => {
    const tasks = [
      { id: 'a', label: 'Pack', done: true },
      { id: 'b', label: 'Book a taxi', note: 'before 6', ink: 2 },
    ];
    expect(parseTasks(serializeTasks(tasks))).toEqual(tasks);
  });

  it('reads nothing from missing or malformed data, and drops tasks without a label', () => {
    expect(parseTasks(null)).toEqual([]);
    expect(parseTasks('')).toEqual([]);
    expect(parseTasks('{not json')).toEqual([]);
    expect(parseTasks('{"tasks": []}')).toEqual([]);
    expect(parseTasks('[null, 3, {"id": "x"}, {"label": "Keep"}]')).toEqual([{ label: 'Keep' }]);
  });

  it('writes the tasks as text, a line each, without the archived ones', () => {
    expect(
      tasksText([
        { label: 'Pack', note: 'the blue bag' },
        { label: 'Gone', archived: true },
        { label: '  ' },
        { label: 'Book a taxi' },
      ]),
    ).toBe('Pack — the blue bag\nBook a taxi');
  });
});
