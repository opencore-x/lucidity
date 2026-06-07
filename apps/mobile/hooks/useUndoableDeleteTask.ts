import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/api/tasks';
import { cancelTaskReminder, scheduleTaskReminder } from '@/lib/notifications';
import { useToastStore } from '@/stores/toastStore';
import { pendingTaskDeletions } from '@/lib/pendingTaskDeletions';
import type { Task } from '@lucidity/shared';

const UNDO_DELAY = 4000;

// Module-level: this hook runs per row (called inside SwipeableTaskRow), so per-instance
// refs would let each row only track its own delete — earlier deletes' tasks reappeared
// when a sibling row's delete settled and refetched. One timer per task lets several
// deletes run concurrently without cancelling each other.
const deleteTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function useUndoableDeleteTask() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  const deleteTask = useCallback(
    (taskId: string) => {
      // Re-deleting the same task: drop its stale timer, keep everyone else's.
      const existing = deleteTimers.get(taskId);
      if (existing) {
        clearTimeout(existing);
        deleteTimers.delete(taskId);
      }

      // Snapshot the full ordered list + the rows this delete removes (the task and its
      // direct subtasks), so undo can restore them in place without resurrecting other
      // pending deletes.
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);
      const removedTasks =
        previousTasks?.filter((t) => t.id === taskId || t.parentTaskId === taskId) ?? [];
      const removedIds = removedTasks.map((t) => t.id);
      const deletedTask = removedTasks.find((t) => t.id === taskId);

      cancelTaskReminder(taskId);

      // Tombstone first so any refetch during the undo window keeps these rows hidden (the
      // server still has them until the delayed DELETE fires), then drop them from the
      // cache for an instant UI update.
      removedIds.forEach((id) => pendingTaskDeletions.add(id));
      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.filter((t) => !pendingTaskDeletions.has(t.id))
      );

      // Stop hiding the rows. Called on undo, and after the server delete settles (success,
      // or a 404 that means the row was already gone) so a later refetch reflects truth.
      const clearTombstones = () => removedIds.forEach((id) => pendingTaskDeletions.delete(id));

      // Schedule the real API delete on this task's own timer.
      const timer = setTimeout(() => {
        deleteTimers.delete(taskId);
        tasksApi
          .delete(taskId)
          // 404 = the task is already gone (e.g. cascade-deleted by a parent's delete).
          // The end state we wanted (task absent) holds, so treat it as success.
          .catch((err) => {
            if (!String(err?.message ?? '').includes('404')) throw err;
          })
          .then(
            () => {
              clearTombstones();
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
              queryClient.invalidateQueries({ queryKey: ['milestoneProgress'] });
            },
            (err) => {
              // Genuine failure: un-hide the rows and resync from the server.
              clearTombstones();
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
              console.warn('Failed to delete task', taskId, err);
            }
          );
      }, UNDO_DELAY);
      deleteTimers.set(taskId, timer);

      // Toast (latest delete owns the visible undo). Undo restores only this task's rows,
      // at their original positions.
      showToast('Task deleted', () => {
        const t = deleteTimers.get(taskId);
        if (t) {
          clearTimeout(t);
          deleteTimers.delete(taskId);
        }
        clearTombstones();
        queryClient.setQueryData<Task[]>(['tasks'], (current) => {
          const cur = current ?? [];
          const curIds = new Set(cur.map((x) => x.id));
          const restoreIds = new Set(removedIds);
          // Walk the snapshot in original order, keeping rows still present plus the ones
          // we're restoring; this skips siblings other deletes removed.
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
    [queryClient, showToast]
  );

  return { deleteTask };
}
