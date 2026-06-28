import { apiClient } from './client';
import type {
  ProjectMemberWithUser,
  InviteProjectMember,
  MemberAccess,
} from '@lucidity/shared';
import type { ProjectVisibility } from '@lucidity/shared';

export const projectMembersApi = {
  list: (projectId: string) =>
    apiClient<ProjectMemberWithUser[]>(`/api/projects/${projectId}/members`),

  invite: (projectId: string, data: InviteProjectMember) =>
    apiClient<ProjectMemberWithUser>(`/api/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAccess: (projectId: string, userId: string, access: MemberAccess) =>
    apiClient<unknown>(`/api/projects/${projectId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ access }),
    }),

  remove: (projectId: string, userId: string) =>
    apiClient<void>(`/api/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
    }),

  // Visibility is owner-only and lives on its own endpoint (not the project PATCH).
  setVisibility: (projectId: string, visibility: ProjectVisibility) =>
    apiClient<unknown>(`/api/projects/${projectId}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ visibility }),
    }),
};
