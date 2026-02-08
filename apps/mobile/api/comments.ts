import { apiClient } from './client';
import type { Comment } from '@lucidity/shared';

export const commentsApi = {
  list: (taskId: string) =>
    apiClient<Comment[]>(`/api/tasks/${taskId}/comments`),

  create: (taskId: string, content: string) =>
    apiClient<Comment>(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  update: (taskId: string, commentId: string, content: string) =>
    apiClient<Comment>(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),

  delete: (taskId: string, commentId: string) =>
    apiClient<void>(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
    }),
};
