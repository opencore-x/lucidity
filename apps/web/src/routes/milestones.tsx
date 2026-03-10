import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useAllMilestones, useMilestoneProgress } from '~/hooks/useMilestones'
import { useProjects } from '~/hooks/useProjects'
import { useTasks, useToggleTask } from '~/hooks/useTasks'
import { TaskItem } from '~/components/task-item'
import { TaskPanel } from '~/components/task-panel'
import { ChevronRight, Flag } from 'lucide-react'
import { cn } from '~/lib/utils'
import type { Milestone, Project, Task } from '@lucidity/shared'
import type { MilestoneProgress } from '~/hooks/useMilestones'

export const Route = createFileRoute('/milestones')({
  component: Milestones,
})

function Milestones() {
  const milestonesQuery = useAllMilestones()
  const projectsQuery = useProjects()
  const tasksQuery = useTasks()
  const toggleTask = useToggleTask()
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null)

  const milestones = milestonesQuery.data ?? []
  const projects = projectsQuery.data ?? []
  const allTasks = tasksQuery.data ?? []
  const isLoading =
    milestonesQuery.isLoading || projectsQuery.isLoading || tasksQuery.isLoading

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight">Milestones</h1>
        <p className="mt-1 text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const projectMap = new Map(projects.map((p) => [p.id, p]))

  // Group milestones by project
  const byProject = new Map<string, Milestone[]>()
  milestones.forEach((m) => {
    if (!byProject.has(m.projectId)) {
      byProject.set(m.projectId, [])
    }
    byProject.get(m.projectId)!.push(m)
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold tracking-tight">Milestones</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {milestones.length === 0
          ? 'No milestones yet.'
          : `${milestones.length} milestone${milestones.length !== 1 ? 's' : ''} across ${byProject.size} project${byProject.size !== 1 ? 's' : ''}.`}
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {Array.from(byProject.entries()).map(([projectId, projectMilestones]) => {
          const project = projectMap.get(projectId)
          if (!project) return null

          return (
            <div key={projectId}>
              <Link
                to="/projects/$id"
                params={{ id: projectId }}
                className="mb-3 flex items-center gap-2 text-sm font-semibold hover:underline"
                style={project.color ? { color: project.color } : undefined}
              >
                {project.name}
              </Link>
              <div className="flex flex-col gap-3">
                {projectMilestones.map((milestone) => (
                  <MilestoneCard
                    key={milestone.id}
                    milestone={milestone}
                    allTasks={allTasks}
                    onToggleTask={(id) => toggleTask.mutate(id)}
                    onClickTask={(task) => setSelectedTaskId(task.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {milestones.length === 0 && (
          <div className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            <Flag className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            No milestones yet. Create milestones within projects to track progress.
          </div>
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

function MilestoneCard({
  milestone,
  allTasks,
  onToggleTask,
  onClickTask,
}: {
  milestone: Milestone
  allTasks: Task[]
  onToggleTask: (id: string) => void
  onClickTask?: (task: Task) => void
}) {
  const progressQuery = useMilestoneProgress(milestone.id)
  const [isOpen, setIsOpen] = React.useState(false)

  const progress = progressQuery.data
  const milestoneTasks = allTasks.filter(
    (t) => t.milestoneId === milestone.id && !t.parentTaskId,
  )
  const activeTasks = milestoneTasks.filter((t) => t.status !== 'completed')
  const completedTasks = milestoneTasks.filter((t) => t.status === 'completed')

  const pct = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0

  return (
    <div className="rounded-lg border bg-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 px-3 py-3"
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            isOpen && 'rotate-90',
          )}
        />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <div className="flex w-full items-center gap-2">
            <span className="truncate text-sm font-semibold">
              {milestone.name}
            </span>
            {milestone.dueDate && (
              <span className="shrink-0 text-xs text-muted-foreground">
                Due{' '}
                {new Date(milestone.dueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {progress
                ? `${progress.completed}/${progress.total}`
                : '...'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="px-1 pb-1">
          {activeTasks.length === 0 && completedTasks.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No tasks in this milestone.
            </p>
          )}

          {activeTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              allTasks={allTasks}
              onToggle={onToggleTask}
              onClick={onClickTask}
            />
          ))}

          {completedTasks.length > 0 && (
            <CompletedMilestoneTasks
              tasks={completedTasks}
              allTasks={allTasks}
              onToggleTask={onToggleTask}
              onClickTask={onClickTask}
            />
          )}
        </div>
      )}
    </div>
  )
}

function CompletedMilestoneTasks({
  tasks,
  allTasks,
  onToggleTask,
  onClickTask,
}: {
  tasks: Task[]
  allTasks: Task[]
  onToggleTask: (id: string) => void
  onClickTask?: (task: Task) => void
}) {
  const [show, setShow] = React.useState(false)

  return (
    <div className="mt-1 border-t pt-1">
      <button
        onClick={() => setShow(!show)}
        className="flex w-full items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronRight
          className={cn(
            'h-3 w-3 transition-transform',
            show && 'rotate-90',
          )}
        />
        {tasks.length} completed
      </button>
      {show &&
        tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            allTasks={allTasks}
            onToggle={onToggleTask}
            onClick={onClickTask}
          />
        ))}
    </div>
  )
}
