import { apiClient } from './client';
import type { Milestone, CreateMilestone, UpdateMilestone } from '@lucidity/shared';

export interface MilestoneProgress {
  milestoneId: string;
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  blocked: number;
  deferred: number;
  percent: number;
}

export const milestonesApi = {
  list: (projectId?: string) =>
    apiClient<Milestone[]>(
      projectId ? `/api/milestones?project_id=${projectId}` : '/api/milestones'
    ),

  get: (id: string) => apiClient<Milestone>(`/api/milestones/${id}`),

  progress: (id: string) =>
    apiClient<MilestoneProgress>(`/api/milestones/${id}/progress`),

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
