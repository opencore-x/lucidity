import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/api/tasks';
import { scheduleTaskReminder, cancelTaskReminder } from '@/lib/notifications';
import type { CreateTask, UpdateTask, Task } from '@lucidity/shared';

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.list,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => tasksApi.get(id),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTask) => tasksApi.create(data),
    onMutate: async (newTask) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      // Create optimistic task
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
        dueDate: newTask.dueDate ? new Date(newTask.dueDate as string | number | Date) : null,
        reminderAt: newTask.reminderAt ? new Date(newTask.reminderAt as string | number | Date) : null,
        recurringFrequency: newTask.recurringFrequency ?? null,
        reviewedAt: null,
        activeTimerStartedAt: null,
        totalElapsedSeconds: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Optimistically update the cache
      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old ? [...old, optimisticTask] : [optimisticTask]
      );

      // Return context with the snapshot
      return { previousTasks };
    },
    onError: (_err, _newTask, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['milestoneProgress'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTask }) =>
      tasksApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      // Optimistically update the task
      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((task) =>
          task.id === id ? { ...task, ...data, updatedAt: new Date() } : task
        )
      );

      return { previousTasks };
    },
    onSuccess: (updatedTask, { id, data }) => {
      if ('reminderAt' in data) {
        const task = updatedTask ?? queryClient.getQueryData<Task[]>(['tasks'])?.find((t) => t.id === id);
        if (data.reminderAt && task) {
          scheduleTaskReminder(id, task.title, new Date(data.reminderAt as string | number | Date));
        } else {
          cancelTaskReminder(id);
        }
      }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['milestoneProgress'] });
    },
  });
}

export function useToggleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksApi.toggleComplete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      // Optimistically toggle the task status
      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((task) => {
          if (task.id === id) {
            const newStatus = task.status === 'completed' ? 'pending' : 'completed';
            return {
              ...task,
              status: newStatus,
              completedAt: newStatus === 'completed' ? new Date() : null,
              updatedAt: new Date(),
            };
          }
          return task;
        })
      );

      return { previousTasks };
    },
    onSuccess: (_data, id) => {
      const task = queryClient.getQueryData<Task[]>(['tasks'])?.find((t) => t.id === id);
      if (!task) return;

      if (task.status === 'completed') {
        cancelTaskReminder(id);
      } else if (task.reminderAt && new Date(task.reminderAt).getTime() > Date.now()) {
        scheduleTaskReminder(id, task.title, new Date(task.reminderAt));
      }
    },
    onError: (_err, _id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['milestoneProgress'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      cancelTaskReminder(id);

      // Optimistically remove the task
      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.filter((task) => task.id !== id)
      );

      return { previousTasks };
    },
    onError: (_err, _id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['milestoneProgress'] });
    },
  });
}

export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskIds: string[]) => tasksApi.reorder(taskIds),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
