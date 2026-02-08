import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi } from '@/api/comments';
import type { Comment } from '@lucidity/shared';

export function useComments(taskId: string) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => commentsApi.list(taskId),
    enabled: !!taskId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
      commentsApi.create(taskId, content),
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, commentId }: { taskId: string; commentId: string }) =>
      commentsApi.delete(taskId, commentId),
    onMutate: async ({ taskId, commentId }) => {
      await queryClient.cancelQueries({ queryKey: ['comments', taskId] });
      const previous = queryClient.getQueryData<Comment[]>(['comments', taskId]);

      queryClient.setQueryData<Comment[]>(['comments', taskId], (old) =>
        old?.filter((c) => c.id !== commentId)
      );

      return { previous, taskId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['comments', context.taskId], context.previous);
      }
    },
    onSettled: (_data, _err, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
    },
  });
}
