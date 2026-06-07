import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { uuidv7 } from 'uuidv7';
import { tasksApi } from '@/api/tasks';
import { scheduleTaskReminder, cancelTaskReminder } from '@/lib/notifications';
import type { CreateTask, UpdateTask, Task } from '@lucidity/shared';

// In-flight create POSTs keyed by the client-generated task id. A task is editable the
// instant it's created (optimistically), but its row doesn't exist on the server until the
// POST lands — so a write fired during that window must wait for the create, or it 404s.
const pendingTaskCreates = new Map<string, Promise<unknown>>();

// Run `op` only after any in-flight create for `id` has settled, so updates/toggles/deletes
// are ordered after the create that produced the row. If the create rejected, this rejects
// too (the row never existed), so the dependent write rolls back instead of 404ing.
async function afterPendingCreate<T>(id: string, op: () => Promise<T>): Promise<T> {
  const pending = pendingTaskCreates.get(id);
  if (pending) await pending;
  return op();
}

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
    mutationFn: (data: CreateTask) => {
      const promise = tasksApi.create(data);
      // Track the POST by its (client-generated) id so writes fired before it lands wait
      // for it (see afterPendingCreate). data.id is set in onMutate, which runs first.
      const id = data.id;
      if (id) {
        pendingTaskCreates.set(id, promise);
        void promise
          .catch(() => {})
          .finally(() => {
            if (pendingTaskCreates.get(id) === promise) pendingTaskCreates.delete(id);
          });
      }
      return promise;
    },
    onMutate: async (newTask) => {
      // Generate a stable client UUIDv7 and stamp it onto the variables so the POST body,
      // this optimistic row, and the saved row all share one id. (onMutate receives the
      // same object the mutationFn will send.) This is why an open task sheet survives the
      // create: the id never changes underneath it.
      if (!newTask.id) newTask.id = uuidv7();

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      // Create optimistic task
      const optimisticTask: Task = {
        id: newTask.id,
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

      // Optimistically update the cache. Prepend so the new task lands at the top of
      // the list (matching the server's newest-first default order) instead of the
      // bottom, so it's immediately visible for editing.
      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old ? [optimisticTask, ...old] : [optimisticTask]
      );

      // Return context with the snapshot
      return { previousTasks };
    },
    onError: (_err, _newTask, context) => {
      // Rollback on error. The optimistic row is removed; if a sheet is open on it, the
      // sheet's own auto-close effect dismisses it (the id is gone from the list).
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
      afterPendingCreate(id, () => tasksApi.update(id, data)),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      // Optimistically update the task. Do NOT touch updatedAt: the server doesn't bump
      // it on update (schema is defaultNow() only, no $onUpdate), so faking a fresh
      // updatedAt makes the task sort to the top of any updatedAt-ordered list (the Search
      // "Recent" list) until the refetch reveals the unchanged value — it visibly jumps to
      // the top and drops back. Mirroring the server (leave updatedAt alone) keeps it put.
      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.map((task) => (task.id === id ? { ...task, ...data } : task))
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
    mutationFn: (id: string) => afterPendingCreate(id, () => tasksApi.toggleComplete(id)),
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
    mutationFn: (id: string) => afterPendingCreate(id, () => tasksApi.delete(id)),
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
