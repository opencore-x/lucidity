import { apiClient } from './client';
import type { Milestone, CreateMilestone, UpdateMilestone } from '@lucidity/shared';

export const milestonesApi = {
  list: (projectId: string) =>
    apiClient<Milestone[]>(`/api/milestones?project_id=${projectId}`),

  get: (id: string) => apiClient<Milestone>(`/api/milestones/${id}`),

  create: (data: CreateMilestone) =>
    apiClient<Milestone>('/api/milestones', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateMilestone) =>
    apiClient<Milestone>(`/api/milestones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<void>(`/api/milestones/${id}`, { method: 'DELETE' }),
};
