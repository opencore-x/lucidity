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
  const pendingDeleteRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deleteTask = useCallback(
    (taskId: string) => {
      // Cancel any pending delete timer from a previous undo-able delete
      if (pendingDeleteRef.current) {
        clearTimeout(pendingDeleteRef.current);
        pendingDeleteRef.current = null;
      }

      // Snapshot cache before removal
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);
      const deletedTask = previousTasks?.find((t) => t.id === taskId);

      cancelTaskReminder(taskId);

      // Optimistically remove from cache
      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.filter((t) => t.id !== taskId && t.parentTaskId !== taskId)
      );

      // Schedule the actual API delete
      pendingDeleteRef.current = setTimeout(() => {
        pendingDeleteRef.current = null;
        tasksApi.delete(taskId).then(() => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['milestoneProgress'] });
        });
      }, UNDO_DELAY);

      // Show toast with undo handler
      showToast('Task deleted', () => {
        // Cancel the pending API delete
        if (pendingDeleteRef.current) {
          clearTimeout(pendingDeleteRef.current);
          pendingDeleteRef.current = null;
        }
        // Restore cache
        if (previousTasks) {
          queryClient.setQueryData(['tasks'], previousTasks);
        }
        // Reschedule notification if task had a future reminder
        if (deletedTask?.reminderAt && new Date(deletedTask.reminderAt).getTime() > Date.now()) {
          scheduleTaskReminder(taskId, deletedTask.title, new Date(deletedTask.reminderAt));
        }
      });
    },
    [queryClient, showToast]
  );

  return { deleteTask };
}
