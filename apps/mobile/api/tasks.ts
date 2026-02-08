import { apiClient } from './client';
import type { Task, CreateTask, UpdateTask } from '@lucidity/shared';

type TaskListResponse = { tasks: Task[]; total: number; hasMore: boolean };

export const tasksApi = {
  list: async (): Promise<Task[]> => {
    const limit = 200;
    let offset = 0;
    let allTasks: Task[] = [];
    let hasMore = true;

    while (hasMore) {
      const res = await apiClient<TaskListResponse>(
        `/api/tasks?limit=${limit}&offset=${offset}`,
      );
      allTasks = allTasks.concat(res.tasks);
      hasMore = res.hasMore;
      offset += limit;
    }

    return allTasks;
  },

  get: (id: string) => apiClient<Task>(`/api/tasks/${id}`),

  create: (data: CreateTask) =>
    apiClient<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateTask) =>
    apiClient<Task>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<void>(`/api/tasks/${id}`, { method: 'DELETE' }),

  toggleComplete: (id: string) =>
    apiClient<Task>(`/api/tasks/${id}/complete`, { method: 'PATCH' }),

  reorder: (taskIds: string[]) =>
    apiClient<{ updated: number }>('/api/tasks/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ taskIds }),
    }),
};
