import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '~/api/client'
import { useAuthReady } from '~/providers/ApiProvider'
import type { CreateProject, UpdateProject, Project } from '@lucidity/shared'

export function useProjects() {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient<Project[]>('/api/projects'),
    enabled: authReady,
  })
}

export function useProject(id: string) {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => apiClient<Project>(`/api/projects/${id}`),
    enabled: authReady && !!id,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateProject) =>
      apiClient<Project>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onMutate: async (newProject) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] })
      const previousProjects =
        queryClient.getQueryData<Project[]>(['projects'])

      const optimisticProject: Project = {
        id: `temp-${Date.now()}`,
        userId: 'temp-user',
        name: newProject.name,
        color: newProject.color ?? null,
        description: newProject.description ?? null,
        isArchived: newProject.isArchived ?? false,
        aiReviewDepth: newProject.aiReviewDepth ?? 'light',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      queryClient.setQueryData<Project[]>(['projects'], (old) =>
        old ? [...old, optimisticProject] : [optimisticProject],
      )

      return { previousProjects }
    },
    onError: (_err, _newProject, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects'], context.previousProjects)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProject }) =>
      apiClient<Project>(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] })
      const previousProjects =
        queryClient.getQueryData<Project[]>(['projects'])

      queryClient.setQueryData<Project[]>(['projects'], (old) =>
        old?.map((project) =>
          project.id === id
            ? { ...project, ...data, updatedAt: new Date() }
            : project,
        ),
      )

      return { previousProjects }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects'], context.previousProjects)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/projects/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] })
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousProjects =
        queryClient.getQueryData<Project[]>(['projects'])

      queryClient.setQueryData<Project[]>(['projects'], (old) =>
        old?.filter((project) => project.id !== id),
      )

      return { previousProjects }
    },
    onError: (_err, _id, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects'], context.previousProjects)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
