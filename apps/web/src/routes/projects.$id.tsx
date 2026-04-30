import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Plus, ChevronRight, Check, Repeat, ListTree } from 'lucide-react'
import { useProject } from '~/hooks/useProjects'
import { useTasks, useToggleTask, useCreateTask } from '~/hooks/useTasks'
import { useMilestones } from '~/hooks/useMilestones'
import { cn } from '~/lib/utils'
import {
  formatDueDate,
  getDueDateColor,
  getSubtaskProgress,
} from '~/utils/helpers'
import { TaskItem } from '~/components/task-item'
import { TaskPanel } from '~/components/task-panel'
import type { Task, Milestone } from '@lucidity/shared'

export const Route = createFileRoute('/projects/$id')({
  component: ProjectDetailPage,
})

function ProjectDetailPage() {
  const { id } = Route.useParams()
  const projectQuery = useProject(id)
  const tasksQuery = useTasks()
  const milestonesQuery = useMilestones(id)
  const toggleTask = useToggleTask()
  const createTask = useCreateTask()
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null)

  const project = projectQuery.data
  const allTasks = tasksQuery.data ?? []
  const projectTasks = allTasks.filter(
    (t) => t.projectId === id && !t.parentTaskId,
  )
  const milestones = milestonesQuery.data ?? []
  const isLoading =
    projectQuery.isLoading || tasksQuery.isLoading

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-500">Project not found.</p>
        <Link to="/" className="mt-2 text-sm text-primary hover:underline">
          Back to projects
        </Link>
      </div>
    )
  }

  const activeTasks = projectTasks.filter((t) => t.status !== 'completed')
  const completedTasks = projectTasks.filter((t) => t.status === 'completed')

  // Group active tasks by milestone
  const tasksWithMilestone = new Map<string | null, Task[]>()
  tasksWithMilestone.set(null, []) // no milestone bucket

  milestones.forEach((m) => tasksWithMilestone.set(m.id, []))

  activeTasks.forEach((task) => {
    const key = task.milestoneId ?? null
    if (!tasksWithMilestone.has(key)) {
      tasksWithMilestone.set(key, [])
    }
    tasksWithMilestone.get(key)!.push(task)
  })

  const milestoneMap = new Map(milestones.map((m) => [m.id, m]))

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={project.color ? { color: project.color } : undefined}
          >
            {project.name}
          </h1>
          {project.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
        <span>{activeTasks.length} active</span>
        <span>{completedTasks.length} completed</span>
        {milestones.length > 0 && (
          <span>{milestones.length} milestone{milestones.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Task sections by milestone */}
      <div className="mt-6 flex flex-col gap-4">
        {/* Tasks with milestones */}
        {milestones.map((milestone) => {
          const mTasks = tasksWithMilestone.get(milestone.id) ?? []
          return (
            <MilestoneSection
              key={milestone.id}
              milestone={milestone}
              tasks={mTasks}
              allTasks={allTasks}
              projectId={id}
              onToggleTask={(taskId) => toggleTask.mutate(taskId)}
              onCreateTask={(title, milestoneId) =>
                createTask.mutate({ title, projectId: id, milestoneId })
              }
              onClickTask={(task) => setSelectedTaskId(task.id)}
            />
          )
        })}

        {/* Tasks without milestone */}
        <TaskSection
          title={milestones.length > 0 ? 'No milestone' : 'Tasks'}
          tasks={tasksWithMilestone.get(null) ?? []}
          allTasks={allTasks}
          projectId={id}
          onToggleTask={(taskId) => toggleTask.mutate(taskId)}
          onCreateTask={(title) => createTask.mutate({ title, projectId: id })}
          onClickTask={(task) => setSelectedTaskId(task.id)}
        />

        {/* Completed tasks */}
        {completedTasks.length > 0 && (
          <CompletedSection
            tasks={completedTasks}
            allTasks={allTasks}
            onToggleTask={(taskId) => toggleTask.mutate(taskId)}
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

function MilestoneSection({
  milestone,
  tasks,
  allTasks,
  projectId,
  onToggleTask,
  onCreateTask,
  onClickTask,
}: {
  milestone: Milestone
  tasks: Task[]
  allTasks: Task[]
  projectId: string
  onToggleTask: (id: string) => void
  onCreateTask: (title: string, milestoneId: string) => void
  onClickTask?: (task: Task) => void
}) {
  const [isOpen, setIsOpen] = React.useState(true)
  const [isAdding, setIsAdding] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isAdding) inputRef.current?.focus()
  }, [isAdding])

  function handleSubmit() {
    const title = newTitle.trim()
    if (!title) return
    onCreateTask(title, milestone.id)
    setNewTitle('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setIsAdding(false)
      setNewTitle('')
    }
  }

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
        <span className="truncate text-sm font-semibold">{milestone.name}</span>
        {milestone.dueDate && (
          <span className="text-xs text-muted-foreground">
            Due {new Date(milestone.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(true)
            setIsAdding(true)
          }}
          className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </button>

      {isOpen && (
        <div className="px-1 pb-1">
          {tasks.length === 0 && !isAdding && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No tasks
            </p>
          )}
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              allTasks={allTasks}
              onToggle={onToggleTask}
              onClick={onClickTask}
            />
          ))}

          {isAdding ? (
            <div className="flex items-center gap-3 px-2 py-1.5">
              <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-muted-foreground/40">
                <Plus className="h-3 w-3 text-muted-foreground" />
              </div>
              <input
                ref={inputRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  handleSubmit()
                  setIsAdding(false)
                }}
                placeholder="New task..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50"
            >
              <Plus className="h-4 w-4" />
              New task
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function TaskSection({
  title,
  tasks,
  allTasks,
  projectId,
  onToggleTask,
  onCreateTask,
  onClickTask,
}: {
  title: string
  tasks: Task[]
  allTasks: Task[]
  projectId: string
  onToggleTask: (id: string) => void
  onCreateTask: (title: string) => void
  onClickTask?: (task: Task) => void
}) {
  const [isOpen, setIsOpen] = React.useState(true)
  const [isAdding, setIsAdding] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isAdding) inputRef.current?.focus()
  }, [isAdding])

  function handleSubmit() {
    const title = newTitle.trim()
    if (!title) return
    onCreateTask(title)
    setNewTitle('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setIsAdding(false)
      setNewTitle('')
    }
  }

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
        <span className="truncate text-sm font-semibold">{title}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(true)
            setIsAdding(true)
          }}
          className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </button>

      {isOpen && (
        <div className="px-1 pb-1">
          {tasks.length === 0 && !isAdding && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No tasks
            </p>
          )}
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              allTasks={allTasks}
              onToggle={onToggleTask}
              onClick={onClickTask}
            />
          ))}

          {isAdding ? (
            <div className="flex items-center gap-3 px-2 py-1.5">
              <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-muted-foreground/40">
                <Plus className="h-3 w-3 text-muted-foreground" />
              </div>
              <input
                ref={inputRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  handleSubmit()
                  setIsAdding(false)
                }}
                placeholder="New task..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50"
            >
              <Plus className="h-4 w-4" />
              New task
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function CompletedSection({
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
        <span className="truncate text-sm font-semibold text-muted-foreground">
          Completed
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </button>

      {isOpen && (
        <div className="px-1 pb-1">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              allTasks={allTasks}
              onToggle={onToggleTask}
              onClick={onClickTask}
            />
          ))}
        </div>
      )}
    </div>
  )
}
