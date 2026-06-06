import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/api/tasks';
import { cancelTaskReminder, scheduleTaskReminder } from '@/lib/notifications';
import { useToastStore } from '@/stores/toastStore';
import type { Task } from '@lucidity/shared';

const UNDO_DELAY = 4000;

export function useUndoableDeleteTask() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  // One timer per task: deleting several tasks in quick succession must not
  // cancel earlier tasks' pending API deletes (the old single-ref design left
  // only the last task actually deleted; the rest reappeared on refetch).
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const inFlightRef = useRef(0);

  // Only refetch once every pending + in-flight delete has resolved, otherwise
  // the refetch repopulates tasks that were optimistically removed but whose
  // server delete hasn't fired yet.
  const maybeInvalidate = useCallback(() => {
    if (timersRef.current.size === 0 && inFlightRef.current === 0) {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['milestoneProgress'] });
    }
  }, [queryClient]);

  const deleteTask = useCallback(
    (taskId: string) => {
      // Re-deleting the same task: drop its stale timer, keep everyone else's.
      const existing = timersRef.current.get(taskId);
      if (existing) {
        clearTimeout(existing);
        timersRef.current.delete(taskId);
      }

      // Snapshot the full ordered list + the rows this delete removes, so undo
      // can restore them in place without resurrecting other pending deletes.
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);
      const removedTasks =
        previousTasks?.filter((t) => t.id === taskId || t.parentTaskId === taskId) ?? [];
      const deletedTask = removedTasks.find((t) => t.id === taskId);

      cancelTaskReminder(taskId);

      // Optimistically remove the task (and its subtasks) from cache.
      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.filter((t) => t.id !== taskId && t.parentTaskId !== taskId)
      );

      // Schedule the real API delete on this task's own timer.
      const timer = setTimeout(() => {
        timersRef.current.delete(taskId);
        inFlightRef.current += 1;
        tasksApi.delete(taskId).finally(() => {
          inFlightRef.current -= 1;
          maybeInvalidate();
        });
      }, UNDO_DELAY);
      timersRef.current.set(taskId, timer);

      // Toast (latest delete owns the visible undo). Undo restores only this
      // task's rows, at their original positions.
      showToast('Task deleted', () => {
        const t = timersRef.current.get(taskId);
        if (t) {
          clearTimeout(t);
          timersRef.current.delete(taskId);
        }
        queryClient.setQueryData<Task[]>(['tasks'], (current) => {
          const cur = current ?? [];
          const curIds = new Set(cur.map((x) => x.id));
          const restoreIds = new Set(removedTasks.map((x) => x.id));
          // Walk the snapshot in original order, keeping rows still present plus
          // the ones we're restoring; this skips siblings other deletes removed.
          const result = (previousTasks ?? cur).filter(
            (x) => curIds.has(x.id) || restoreIds.has(x.id)
          );
          // Preserve any tasks created after the snapshot.
          const known = new Set(result.map((x) => x.id));
          for (const x of cur) if (!known.has(x.id)) result.push(x);
          return result;
        });
        if (deletedTask?.reminderAt && new Date(deletedTask.reminderAt).getTime() > Date.now()) {
          scheduleTaskReminder(taskId, deletedTask.title, new Date(deletedTask.reminderAt));
        }
      });
    },
    [queryClient, showToast, maybeInvalidate]
  );

  return { deleteTask };
}
