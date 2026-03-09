import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '~/api/client'
import type { CreateMilestone, UpdateMilestone, Milestone, Task } from '@lucidity/shared'

export interface MilestoneProgress {
  total: number
  completed: number
  pending: number
  inProgress: number
  blocked: number
  deferred: number
}

export function useMilestones(projectId: string | null) {
  return useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () =>
      apiClient<Milestone[]>(`/api/milestones?project_id=${projectId}`),
    enabled: !!projectId,
  })
}

export function useAllMilestones() {
  return useQuery({
    queryKey: ['milestones'],
    queryFn: () => apiClient<Milestone[]>('/api/milestones'),
  })
}

export function useMilestoneProgress(milestoneId: string) {
  return useQuery({
    queryKey: ['milestoneProgress', milestoneId],
    queryFn: () =>
      apiClient<MilestoneProgress>(`/api/milestones/${milestoneId}/progress`),
  })
}

export function useCreateMilestone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateMilestone) =>
      apiClient<Milestone>('/api/milestones', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] })
    },
  })
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMilestone }) =>
      apiClient<Milestone>(`/api/milestones/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] })
    },
  })
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/milestones/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['milestones'] })
      await queryClient.cancelQueries({ queryKey: ['tasks'] })

      const previousMilestones =
        queryClient.getQueryData<Milestone[]>(['milestones'])
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks'])

      queryClient.setQueryData<Milestone[]>(['milestones'], (old) =>
        old?.filter((m) => m.id !== id),
      )

      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((t) =>
          t.milestoneId === id ? { ...t, milestoneId: null } : t,
        ),
      )

      return { previousMilestones, previousTasks }
    },
    onError: (_err, _id, context) => {
      if (context?.previousMilestones) {
        queryClient.setQueryData(['milestones'], context.previousMilestones)
      }
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['milestoneProgress'] })
    },
  })
}
