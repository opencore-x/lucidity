import type { Task, Project } from '@lucidity/shared';

/**
 * Group root tasks (no parentTaskId) by project
 */
export function groupTasksByProject(
  tasks: Task[],
  projects: Project[]
): Map<Project, Task[]> {
  // Sort projects: "Todo" first, then alphabetical
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.name === 'Todo') return -1;
    if (b.name === 'Todo') return 1;
    return a.name.localeCompare(b.name);
  });

  const grouped = new Map<Project, Task[]>();

  // Initialize with empty arrays
  sortedProjects.forEach((project) => grouped.set(project, []));

  // Group root tasks only
  tasks
    .filter((task) => !task.parentTaskId)
    .forEach((task) => {
      const project = sortedProjects.find((p) => p.id === task.projectId);
      if (project) {
        grouped.get(project)!.push(task);
      }
    });

  return grouped;
}

/**
 * Get direct subtasks of a task
 */
export function getSubtasks(tasks: Task[], parentId: string): Task[] {
  return tasks.filter((task) => task.parentTaskId === parentId);
}

/**
 * Calculate subtask progress for a task
 * Returns null if task has no subtasks
 */
export function getSubtaskProgress(
  tasks: Task[],
  parentId: string
): { completed: number; total: number } | null {
  const subtasks = getSubtasks(tasks, parentId);

  if (subtasks.length === 0) return null;

  const completed = subtasks.filter((t) => t.status === 'completed').length;
  return { completed, total: subtasks.length };
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'None';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format task status for display
 */
export function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
