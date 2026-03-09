import type { Task, Project } from '@lucidity/shared'

export const INBOX_PROJECT_ID = '__inbox__'

export const INBOX_PROJECT: Project = {
  id: INBOX_PROJECT_ID,
  userId: '',
  name: 'Inbox',
  color: null,
  description: null,
  isArchived: false,
  aiReviewDepth: 'none',
  createdAt: new Date(0),
  updatedAt: new Date(0),
}

export function isInboxProject(project: Project): boolean {
  return project.id === INBOX_PROJECT_ID
}

export function groupTasksByProject(
  tasks: Task[],
  projects: Project[],
): Map<Project, Task[]> {
  const sortedProjects = [...projects].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  const grouped = new Map<Project, Task[]>()
  const inboxTasks = tasks.filter(
    (task) => !task.parentTaskId && !task.projectId,
  )
  grouped.set(INBOX_PROJECT, inboxTasks)

  sortedProjects.forEach((project) => grouped.set(project, []))

  tasks
    .filter((task) => !task.parentTaskId && task.projectId)
    .forEach((task) => {
      const project = sortedProjects.find((p) => p.id === task.projectId)
      if (project) {
        grouped.get(project)!.push(task)
      }
    })

  return grouped
}

export function getSubtasks(tasks: Task[], parentId: string): Task[] {
  return tasks.filter((task) => task.parentTaskId === parentId)
}

export function getSubtaskProgress(
  tasks: Task[],
  parentId: string,
): { completed: number; total: number } | null {
  const subtasks = getSubtasks(tasks, parentId)
  if (subtasks.length === 0) return null
  const completed = subtasks.filter((t) => t.status === 'completed').length
  return { completed, total: subtasks.length }
}

export function formatDueDate(date: Date | string | null | undefined): string | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.floor(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diff < 0) return 'Overdue'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getDueDateColor(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.floor(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diff < 0) return 'text-red-500'
  if (diff === 0) return 'text-amber-500'
  if (diff === 1) return 'text-orange-500'
  return 'text-muted-foreground'
}
