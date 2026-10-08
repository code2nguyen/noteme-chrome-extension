/**
 * A to-do list note: its tasks, stored as a JSON array in the note's data (the title is in `properties.title`, as for
 * a page or a flow). c2-todo-list edits the tasks itself; the card stores what it reports.
 */

import type { TodoTask } from '@c2n/components/todo-list';

export type { TodoTask };

/** Read stored tasks defensively: anything malformed is dropped rather than breaking the card. */
export function parseTasks(data: string | null | undefined): TodoTask[] {
  let raw: unknown;
  try {
    raw = JSON.parse(data || 'null');
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (task): task is TodoTask => !!task && typeof task === 'object' && typeof (task as TodoTask).label === 'string',
  );
}

export function serializeTasks(tasks: readonly TodoTask[]): string {
  return JSON.stringify(tasks);
}

/** The tasks that still count: archived ones wait in the list's archive, out of the way. */
export function listedTasks(tasks: readonly TodoTask[]): TodoTask[] {
  return tasks.filter((task) => !task.archived);
}

/** The tasks as lines of text, for the search, the Older notes and the Archive: each label, then its note. */
export function tasksText(tasks: readonly TodoTask[]): string {
  return listedTasks(tasks)
    .map((task) => [task.label.trim(), task.note?.trim()].filter(Boolean).join(' — '))
    .filter(Boolean)
    .join('\n');
}
