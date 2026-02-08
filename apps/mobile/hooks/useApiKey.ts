import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeyApi } from '@/api/apiKey';

export function useApiKey() {
  return useQuery({
    queryKey: ['apiKey'],
    queryFn: apiKeyApi.get,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiKeyApi.create,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKey'] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiKeyApi.revoke,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKey'] });
    },
  });
}
