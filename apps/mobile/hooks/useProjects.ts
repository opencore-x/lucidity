import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects';
import type { CreateProject, UpdateProject, Project } from '@lucidity/shared';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProject) => projectsApi.create(data),
    onMutate: async (newProject) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['projects'] });

      // Snapshot the previous value
      const previousProjects = queryClient.getQueryData<Project[]>(['projects']);

      // Create optimistic project
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
      };

      // Optimistically update the cache
      queryClient.setQueryData<Project[]>(['projects'], (old) =>
        old ? [...old, optimisticProject] : [optimisticProject]
      );

      // Return context with the snapshot
      return { previousProjects };
    },
    onError: (_err, _newProject, context) => {
      // Rollback on error
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects'], context.previousProjects);
      }
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProject }) =>
      projectsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previousProjects = queryClient.getQueryData<Project[]>(['projects']);
      const previousProject = queryClient.getQueryData<Project>(['projects', id]);

      // Optimistically update the project in the list...
      queryClient.setQueryData<Project[]>(['projects'], (old) =>
        old?.map((project) =>
          project.id === id ? { ...project, ...data, updatedAt: new Date() } : project
        )
      );
      // ...and the individual query the detail screen reads, so e.g. a color change
      // reflects immediately instead of after a manual refresh / revisit.
      queryClient.setQueryData<Project>(['projects', id], (old) =>
        old ? { ...old, ...data, updatedAt: new Date() } : old
      );

      return { previousProjects, previousProject };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects'], context.previousProjects);
      }
      if (context?.previousProject) {
        queryClient.setQueryData(['projects', id], context.previousProject);
      }
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      const previousProjects = queryClient.getQueryData<Project[]>(['projects']);

      // Optimistically remove the project
      queryClient.setQueryData<Project[]>(['projects'], (old) =>
        old?.filter((project) => project.id !== id)
      );

      return { previousProjects };
    },
    onError: (_err, _id, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects'], context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
