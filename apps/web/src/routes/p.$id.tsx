import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Check, Circle, Globe, ListTree } from 'lucide-react'
import { apiClient } from '~/api/client'
import { cn } from '~/lib/utils'
import { formatDueDate, getDueDateColor } from '~/utils/helpers'
import type { Project, Task } from '@lucidity/shared'

export const Route = createFileRoute('/p/$id')({
  component: PublicProjectPage,
})

type PublicProjectResponse = { project: Project; tasks: Task[] }

const STATUS_META: Record<string, { label: string; className: string }> = {
  in_progress: { label: 'In Progress', className: 'text-blue-500' },
  blocked: { label: 'Blocked', className: 'text-red-500' },
  deferred: { label: 'Deferred', className: 'text-amber-500' },
}

function PublicProjectPage() {
  const { id } = Route.useParams()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-project', id],
    queryFn: () => apiClient<PublicProjectResponse>(`/api/public/projects/${id}`),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-background px-6 text-center">
        <h1 className="text-lg font-semibold">This project isn’t available</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The link may be wrong, or the project is no longer shared publicly.
        </p>
        <a href="https://lucidity.my" className="mt-2 text-sm text-primary hover:underline">
          Lucidity
        </a>
      </div>
    )
  }

  const { project, tasks } = data
  const rootTasks = tasks.filter((t) => !t.parentTaskId)
  const active = rootTasks.filter((t) => t.status !== 'completed')
  const completed = rootTasks.filter((t) => t.status === 'completed')
  const subtaskCount = (taskId: string) => tasks.filter((t) => t.parentTaskId === taskId).length

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Globe className="h-3.5 w-3.5" />
          <span>Public project · read-only</span>
        </div>
        <h1
          className="mt-2 text-3xl font-bold tracking-tight"
          style={project.color ? { color: project.color } : undefined}
        >
          {project.name}
        </h1>
        {project.description && (
          <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
        )}
        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span>{active.length} active</span>
          <span>{completed.length} completed</span>
        </div>

        {/* Active */}
        <div className="mt-8 flex flex-col">
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active tasks.</p>
          ) : (
            active.map((task) => (
              <PublicTaskRow key={task.id} task={task} subtasks={subtaskCount(task.id)} />
            ))
          )}
        </div>

        {/* Completed */}
        {completed.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Completed
            </h2>
            <div className="flex flex-col">
              {completed.map((task) => (
                <PublicTaskRow key={task.id} task={task} subtasks={subtaskCount(task.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 border-t pt-4 text-center text-xs text-muted-foreground">
          Shared via{' '}
          <a href="https://lucidity.my" className="text-primary hover:underline">
            Lucidity
          </a>
        </div>
      </div>
    </div>
  )
}

function PublicTaskRow({ task, subtasks }: { task: Task; subtasks: number }) {
  const completed = task.status === 'completed'
  const statusMeta = completed ? undefined : STATUS_META[task.status]
  const due = completed ? null : task.dueDate

  return (
    <div className="flex items-start gap-3 border-b py-2.5 last:border-b-0">
      {completed ? (
        <Check className="mt-0.5 h-[18px] w-[18px] shrink-0 text-green-500" />
      ) : (
        <Circle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground/40" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn('text-sm', completed && 'text-muted-foreground line-through')}>
          {task.title}
        </span>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {task.taskNumber != null && <span>#{task.taskNumber}</span>}
          {statusMeta && <span className={statusMeta.className}>{statusMeta.label}</span>}
          {subtasks > 0 && (
            <span className="flex items-center gap-0.5">
              <ListTree className="h-3 w-3" />
              {subtasks}
            </span>
          )}
          {due && <span className={getDueDateColor(due)}>{formatDueDate(due)}</span>}
        </div>
      </div>
    </div>
  )
}
