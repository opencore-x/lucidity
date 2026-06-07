import { useTasks } from '@/hooks/useTasks';
import type { Task } from '@lucidity/shared';

export type SubtaskProgress = { completed: number; total: number };

// Memoize-one: the direct-child progress map is derived once per tasks snapshot and
// shared by every row that asks for it. React Query hands back a stable `tasks`
// reference until the data changes, so a referential check rebuilds only when the
// data actually changes — keeping total work O(n), not O(rows × tasks) (a per-row
// scan is what froze the Search screen on broad queries).
let cachedTasks: Task[] | null = null;
let cachedMap = new Map<string, SubtaskProgress>();

function progressMap(tasks: Task[]): Map<string, SubtaskProgress> {
  if (tasks === cachedTasks) return cachedMap;
  const map = new Map<string, SubtaskProgress>();
  for (const t of tasks) {
    if (!t.parentTaskId) continue;
    const cur = map.get(t.parentTaskId) ?? { completed: 0, total: 0 };
    cur.total += 1;
    if (t.status === 'completed') cur.completed += 1;
    map.set(t.parentTaskId, cur);
  }
  cachedTasks = tasks;
  cachedMap = map;
  return map;
}

/** Direct-child subtask progress for one task, or null if it has no subtasks. */
export function useSubtaskProgress(taskId: string): SubtaskProgress | null {
  const { data: tasks = [] } = useTasks();
  return progressMap(tasks).get(taskId) ?? null;
}
