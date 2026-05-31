import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects';
import type { Project, Task } from '@lucidity/shared';

/**
 * Delete a project behind a confirm dialog, made smooth for the native SwiftUI
 * `List.ForEach` onDelete. SwiftUI slides the row out the instant the swipe commits
 * — so we optimistically drop the project (and its tasks) from the cache up front,
 * keeping the data in sync with the native view (no snap-back glitch). Cancel
 * restores both snapshots, animating the row straight back in; Delete persists the
 * removal (cascades to tasks server-side) and restores on failure.
 *
 * Reusable from the swipe-to-delete on the landing and the editor's Delete button.
 */
export function useConfirmDeleteProject() {
  const queryClient = useQueryClient();

  return useCallback(
    (project: Project, taskCount: number) => {
      const previousProjects = queryClient.getQueryData<Project[]>(['projects']);
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      const restore = () => {
        if (previousProjects) queryClient.setQueryData(['projects'], previousProjects);
        if (previousTasks) queryClient.setQueryData(['tasks'], previousTasks);
      };

      // Optimistically remove so the native row slide-out matches the data.
      queryClient.setQueryData<Project[]>(['projects'], (old) =>
        old?.filter((p) => p.id !== project.id)
      );
      queryClient.setQueryData<Task[]>(['tasks'], (old) =>
        old?.filter((t) => t.projectId !== project.id)
      );

      Alert.alert('Delete Project', `Delete "${project.name}" and all ${taskCount} of its tasks?`, [
        { text: 'Cancel', style: 'cancel', onPress: restore },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            projectsApi
              .delete(project.id)
              .then(() => {
                queryClient.invalidateQueries({ queryKey: ['projects'] });
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
              })
              .catch(restore);
          },
        },
      ]);
    },
    [queryClient]
  );
}
