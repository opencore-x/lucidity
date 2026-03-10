import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTasks, useToggleTask } from '~/hooks/useTasks'
import { useProjects } from '~/hooks/useProjects'
import { TaskItem } from '~/components/task-item'
import { TaskPanel } from '~/components/task-panel'
import { ChevronRight } from 'lucide-react'
import { cn } from '~/lib/utils'
import type { Task, Project } from '@lucidity/shared'

export const Route = createFileRoute('/today')({
  component: Today,
})

function Today() {
  const tasksQuery = useTasks()
  const projectsQuery = useProjects()
  const toggleTask = useToggleTask()
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null)

  const allTasks = tasksQuery.data ?? []
  const projects = projectsQuery.data ?? []
  const isLoading = tasksQuery.isLoading || projectsQuery.isLoading

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight">Today</h1>
        <p className="mt-1 text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  )

  const rootTasks = allTasks.filter((t) => !t.parentTaskId)

  const overdueTasks = rootTasks.filter((t) => {
    if (t.status === 'completed' || !t.dueDate) return false
    return new Date(t.dueDate) < todayStart
  })

  const todayTasks = rootTasks.filter((t) => {
    if (t.status === 'completed' || !t.dueDate) return false
    const d = new Date(t.dueDate)
    return d >= todayStart && d < todayEnd
  })

  const completedTodayTasks = rootTasks.filter((t) => {
    if (t.status !== 'completed' || !t.completedAt) return false
    const c = new Date(t.completedAt)
    return c >= todayStart && c < todayEnd
  })

  const projectMap = new Map(projects.map((p) => [p.id, p]))

  const totalActive = overdueTasks.length + todayTasks.length

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold tracking-tight">Today</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {totalActive === 0
          ? 'All clear for today.'
          : `${totalActive} task${totalActive !== 1 ? 's' : ''} to do.`}
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {overdueTasks.length > 0 && (
          <TaskGroup
            title="Overdue"
            titleClassName="text-red-500"
            tasks={overdueTasks}
            allTasks={allTasks}
            projectMap={projectMap}
            onToggleTask={(id) => toggleTask.mutate(id)}
            onClickTask={(task) => setSelectedTaskId(task.id)}
          />
        )}

        {todayTasks.length > 0 && (
          <TaskGroup
            title="Due today"
            tasks={todayTasks}
            allTasks={allTasks}
            projectMap={projectMap}
            onToggleTask={(id) => toggleTask.mutate(id)}
            onClickTask={(task) => setSelectedTaskId(task.id)}
          />
        )}

        {totalActive === 0 && (
          <div className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            No tasks due today or overdue.
          </div>
        )}

        {completedTodayTasks.length > 0 && (
          <CompletedTodayGroup
            tasks={completedTodayTasks}
            allTasks={allTasks}
            projectMap={projectMap}
            onToggleTask={(id) => toggleTask.mutate(id)}
            onClickTask={(task) => setSelectedTaskId(task.id)}
          />
        )}
      </div>
      <TaskPanel
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        allTasks={allTasks}
      />
    </div>
  )
}

function TaskGroup({
  title,
  titleClassName,
  tasks,
  allTasks,
  projectMap,
  onToggleTask,
  onClickTask,
}: {
  title: string
  titleClassName?: string
  tasks: Task[]
  allTasks: Task[]
  projectMap: Map<string, Project>
  onToggleTask: (id: string) => void
  onClickTask?: (task: Task) => void
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className={cn('text-sm font-semibold', titleClassName)}>
          {title}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <div className="px-1 pb-1">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center">
            <div className="flex-1">
              <TaskItem
                task={task}
                allTasks={allTasks}
                onToggle={onToggleTask}
                onClick={onClickTask}
              />
            </div>
            {task.projectId && projectMap.has(task.projectId) && (
              <span
                className="mr-2 shrink-0 text-xs"
                style={{
                  color: projectMap.get(task.projectId)!.color ?? undefined,
                }}
              >
                {projectMap.get(task.projectId)!.name}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CompletedTodayGroup({
  tasks,
  allTasks,
  projectMap,
  onToggleTask,
  onClickTask,
}: {
  tasks: Task[]
  allTasks: Task[]
  projectMap: Map<string, Project>
  onToggleTask: (id: string) => void
  onClickTask?: (task: Task) => void
}) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div className="rounded-lg border bg-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-3 py-2.5"
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            isOpen && 'rotate-90',
          )}
        />
        <span className="text-sm font-semibold text-muted-foreground">
          Completed today
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </button>
      {isOpen && (
        <div className="px-1 pb-1">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center">
              <div className="flex-1">
                <TaskItem
                  task={task}
                  allTasks={allTasks}
                  onToggle={onToggleTask}
                  onClick={onClickTask}
                />
              </div>
              {task.projectId && projectMap.has(task.projectId) && (
                <span
                  className="mr-2 shrink-0 text-xs"
                  style={{
                    color: projectMap.get(task.projectId)!.color ?? undefined,
                  }}
                >
                  {projectMap.get(task.projectId)!.name}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
