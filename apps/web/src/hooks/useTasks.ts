import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '~/api/client'
import { useAuthReady } from '~/providers/ApiProvider'
import type { CreateTask, UpdateTask, Task } from '@lucidity/shared'

export function useTasks() {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await apiClient<{ tasks: Task[]; total: number; hasMore: boolean }>('/api/tasks?limit=200')
      return res.tasks
    },
    enabled: authReady,
  })
}

export function useTask(id: string) {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => apiClient<Task>(`/api/tasks/${id}`),
    enabled: authReady && !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTask) =>
      apiClient<Task>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks'])

      const optimisticTask: Task = {
        id: `temp-${Date.now()}`,
        userId: 'temp-user',
        title: newTask.title,
        projectId: newTask.projectId ?? null,
        milestoneId: newTask.milestoneId ?? null,
        parentTaskId: newTask.parentTaskId ?? null,
        description: newTask.description ?? null,
        status: newTask.status ?? 'pending',
        priority: newTask.priority ?? 500,
        position: null,
        taskNumber: null,
        completedAt: null,
        dueDate: newTask.dueDate
          ? new Date(newTask.dueDate as string | number | Date)
          : null,
        reminderAt: newTask.reminderAt
          ? new Date(newTask.reminderAt as string | number | Date)
          : null,
        recurringFrequency: newTask.recurringFrequency ?? null,
        reviewedAt: null,
        activeTimerStartedAt: null,
        totalElapsedSeconds: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old ? [...old, optimisticTask] : [optimisticTask],
      )

      return { previousTasks }
    },
    onError: (_err, _newTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['milestoneProgress'] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTask }) =>
      apiClient<Task>(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks'])

      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((task) =>
          task.id === id ? { ...task, ...data, updatedAt: new Date() } : task,
        ),
      )

      return { previousTasks }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['milestoneProgress'] })
    },
  })
}

export function useToggleTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Task>(`/api/tasks/${id}/complete`, { method: 'PATCH' }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks'])

      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((task) => {
          if (task.id === id) {
            const newStatus =
              task.status === 'completed' ? 'pending' : 'completed'
            return {
              ...task,
              status: newStatus,
              completedAt: newStatus === 'completed' ? new Date() : null,
              updatedAt: new Date(),
            }
          }
          return task
        }),
      )

      return { previousTasks }
    },
    onError: (_err, _id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['milestoneProgress'] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks'])

      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.filter((task) => task.id !== id),
      )

      return { previousTasks }
    },
    onError: (_err, _id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['milestoneProgress'] })
    },
  })
}

export function useReorderTasks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskIds: string[]) =>
      apiClient<void>('/api/tasks/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ taskIds }),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
