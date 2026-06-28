import type { Task, Project } from '@lucidity/shared';

/**
 * Virtual Inbox project for tasks without a projectId
 * This is not stored in the database - it's a UI-only grouping
 */
export const INBOX_PROJECT_ID = '__inbox__';

export const INBOX_PROJECT: Project = {
  id: INBOX_PROJECT_ID,
  userId: '',
  name: 'Inbox',
  color: null,
  description: null,
  isArchived: false,
  aiReviewDepth: 'none',
  visibility: 'private',
  createdAt: new Date(0), // Epoch - ensures it sorts first
  updatedAt: new Date(0),
};

/**
 * Check if a project is the virtual Inbox
 */
export function isInboxProject(project: Project): boolean {
  return project.id === INBOX_PROJECT_ID;
}

/**
 * Group root tasks (no parentTaskId) by project
 * Tasks with no projectId go to the virtual Inbox (shown first)
 */
export function groupTasksByProject(
  tasks: Task[],
  projects: Project[]
): Map<Project, Task[]> {
  // Sort projects by creation date (oldest first, new ones at bottom)
  const sortedProjects = [...projects].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const grouped = new Map<Project, Task[]>();

  // Get inbox tasks (tasks with no projectId)
  const inboxTasks = tasks.filter((task) => !task.parentTaskId && !task.projectId);

  // Always show Inbox first (even if empty, so users can add tasks)
  grouped.set(INBOX_PROJECT, inboxTasks);

  // Initialize other projects with empty arrays
  sortedProjects.forEach((project) => grouped.set(project, []));

  // Group root tasks by their project
  tasks
    .filter((task) => !task.parentTaskId && task.projectId)
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

export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
