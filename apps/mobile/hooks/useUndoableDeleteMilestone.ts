import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { milestonesApi } from '@/api/milestones';
import { useToastStore } from '@/stores/toastStore';
import type { Milestone } from '@lucidity/shared';
import type { Task } from '@lucidity/shared';

const UNDO_DELAY = 4000;

export function useUndoableDeleteMilestone() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  const pendingDeleteRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deleteMilestone = useCallback(
    (milestoneId: string) => {
      if (pendingDeleteRef.current) {
        clearTimeout(pendingDeleteRef.current);
        pendingDeleteRef.current = null;
      }

      const previousMilestones = queryClient.getQueryData<Milestone[]>(['milestones']);
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      // Optimistically remove milestone and unlink tasks
      queryClient.setQueryData<Milestone[]>(['milestones'], (old) =>
        old?.filter((m) => m.id !== milestoneId)
      );
      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((t) => (t.milestoneId === milestoneId ? { ...t, milestoneId: null } : t))
      );

      pendingDeleteRef.current = setTimeout(() => {
        pendingDeleteRef.current = null;
        milestonesApi.delete(milestoneId).then(() => {
          queryClient.invalidateQueries({ queryKey: ['milestones'] });
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['milestoneProgress'] });
        });
      }, UNDO_DELAY);

      showToast('Milestone deleted', () => {
        if (pendingDeleteRef.current) {
          clearTimeout(pendingDeleteRef.current);
          pendingDeleteRef.current = null;
        }
        if (previousMilestones) {
          queryClient.setQueryData(['milestones'], previousMilestones);
        }
        if (previousTasks) {
          queryClient.setQueryData(['tasks'], previousTasks);
        }
      });
    },
    [queryClient, showToast]
  );

  return { deleteMilestone };
}
