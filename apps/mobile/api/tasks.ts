import { apiClient } from './client';
import type { Task, CreateTask, UpdateTask } from '@opentask/shared';

export const tasksApi = {
  list: () => apiClient<Task[]>('/api/tasks'),

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
};
