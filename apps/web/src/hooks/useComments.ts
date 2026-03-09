import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '~/api/client'
import type { Comment } from '@lucidity/shared'

export function useComments(taskId: string) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: () =>
      apiClient<Comment[]>(`/api/tasks/${taskId}/comments`),
    enabled: !!taskId,
  })
}

export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
      apiClient<Comment>(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      commentId,
    }: {
      taskId: string
      commentId: string
    }) =>
      apiClient<void>(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: 'DELETE',
      }),
    onMutate: async ({ taskId, commentId }) => {
      await queryClient.cancelQueries({ queryKey: ['comments', taskId] })
      const previous = queryClient.getQueryData<Comment[]>([
        'comments',
        taskId,
      ])

      queryClient.setQueryData<Comment[]>(['comments', taskId], (old) =>
        old?.filter((c) => c.id !== commentId),
      )

      return { previous, taskId }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ['comments', context.taskId],
          context.previous,
        )
      }
    },
    onSettled: (_data, _err, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
    },
  })
}
