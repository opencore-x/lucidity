import { useQuery } from '@tanstack/react-query';
import { milestonesApi } from '@/api/milestones';

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

export function useMilestoneProgress(milestoneId: string) {
  return useQuery({
    queryKey: ['milestoneProgress', milestoneId],
    queryFn: () => milestonesApi.progress(milestoneId),
  });
}
