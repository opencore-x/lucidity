import { apiClient } from './client';

interface ApiKeyMeta {
  exists: boolean;
  prefix?: string;
  createdAt?: string;
  lastUsedAt?: string | null;
}

interface ApiKeyCreateResponse {
  key: string;
  prefix: string;
}

export const apiKeyApi = {
  get: () => apiClient<ApiKeyMeta>('/api/auth/api-key'),

  create: () =>
    apiClient<ApiKeyCreateResponse>('/api/auth/api-key', {
      method: 'POST',
    }),

  revoke: () =>
    apiClient<void>('/api/auth/api-key', { method: 'DELETE' }),
};
