import { useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi } from '@/api/comments';
import { useToastStore } from '@/stores/toastStore';
import type { Comment } from '@lucidity/shared';

const UNDO_DELAY = 4000;

/**
 * Delete a comment with a 4s undo window + toast (mirrors useUndoableDeleteTask).
 * Optimistically removes from cache; the real API delete is deferred so "Undo"
 * can cancel it and restore the snapshot.
 */
export function useUndoableDeleteComment() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  const pendingDeleteRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deleteComment = useCallback(
    (taskId: string, commentId: string) => {
      if (pendingDeleteRef.current) {
        clearTimeout(pendingDeleteRef.current);
        pendingDeleteRef.current = null;
      }

      const previous = queryClient.getQueryData<Comment[]>(['comments', taskId]);
      queryClient.setQueryData<Comment[]>(['comments', taskId], (old) =>
        old?.filter((c) => c.id !== commentId)
      );

      pendingDeleteRef.current = setTimeout(() => {
        pendingDeleteRef.current = null;
        commentsApi.delete(taskId, commentId).then(() => {
          queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
        });
      }, UNDO_DELAY);

      showToast('Comment deleted', () => {
        if (pendingDeleteRef.current) {
          clearTimeout(pendingDeleteRef.current);
          pendingDeleteRef.current = null;
        }
        if (previous) {
          queryClient.setQueryData(['comments', taskId], previous);
        }
      });
    },
    [queryClient, showToast]
  );

  return { deleteComment };
}

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
