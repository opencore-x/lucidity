import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { milestonesApi } from '@/api/milestones';
import type { CreateMilestone, Milestone, Task, UpdateMilestone } from '@lucidity/shared';

export function useCreateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMilestone) => milestonesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
    },
  });
}

export function useMilestones(projectId: string | null) {
  return useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => milestonesApi.list(projectId!),
    enabled: !!projectId,
  });
}

export function useAllMilestones() {
  return useQuery({
    queryKey: ['milestones'],
    queryFn: () => milestonesApi.list(),
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMilestone }) =>
      milestonesApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['milestones'] });
      const previousMilestones = queryClient.getQueryData<Milestone[]>(['milestones']);

      // The detail screen reads the milestone out of the ['milestones'] list query,
      // so patch it there for an immediate reflection (e.g. description edits).
      queryClient.setQueryData<Milestone[]>(['milestones'], (old) =>
        old?.map((m) => (m.id === id ? { ...m, ...data, updatedAt: new Date() } : m))
      );

      return { previousMilestones };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMilestones) {
        queryClient.setQueryData(['milestones'], context.previousMilestones);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
    },
  });
}

export function useMilestoneProgress(milestoneId: string) {
  return useQuery({
    queryKey: ['milestoneProgress', milestoneId],
    queryFn: () => milestonesApi.progress(milestoneId),
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => milestonesApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['milestones'] });
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      const previousMilestones = queryClient.getQueryData<Milestone[]>(['milestones']);
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      queryClient.setQueryData<Milestone[]>(['milestones'], (old) =>
        old?.filter((m) => m.id !== id)
      );

      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((t) => (t.milestoneId === id ? { ...t, milestoneId: null } : t))
      );

      return { previousMilestones, previousTasks };
    },
    onError: (_err, _id, context) => {
      if (context?.previousMilestones) {
        queryClient.setQueryData(['milestones'], context.previousMilestones);
      }
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['milestoneProgress'] });
    },
  });
}
