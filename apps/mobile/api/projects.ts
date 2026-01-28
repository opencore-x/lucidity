import { apiClient } from './client';
import type { Project, CreateProject, UpdateProject } from '@lucidity/shared';

export const projectsApi = {
  list: () => apiClient<Project[]>('/api/projects'),

  get: (id: string) => apiClient<Project>(`/api/projects/${id}`),

  create: (data: CreateProject) =>
    apiClient<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateProject) =>
    apiClient<Project>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<void>(`/api/projects/${id}`, { method: 'DELETE' }),
};
