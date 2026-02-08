import { useQuery } from '@tanstack/react-query';
import { milestonesApi } from '@/api/milestones';

export function useMilestones(projectId: string | null) {
  return useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => milestonesApi.list(projectId!),
    enabled: !!projectId,
  });
}
