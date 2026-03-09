import * as React from 'react'
import type { Task, Project } from '@lucidity/shared'
import { ChevronRight, Plus } from 'lucide-react'
import { cn } from '~/lib/utils'
import { isInboxProject } from '~/utils/helpers'
import { TaskItem } from '~/components/task-item'
import { useCreateTask } from '~/hooks/useTasks'

interface ProjectGroupProps {
  project: Project
  tasks: Task[]
  allTasks: Task[]
  onToggleTask: (id: string) => void
  onClickTask?: (task: Task) => void
}

export function ProjectGroup({
  project,
  tasks,
  allTasks,
  onToggleTask,
  onClickTask,
}: ProjectGroupProps) {
  const [isOpen, setIsOpen] = React.useState(true)
  const [showCompleted, setShowCompleted] = React.useState(false)
  const [isAdding, setIsAdding] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const createTask = useCreateTask()

  const inbox = isInboxProject(project)
  const activeTasks = tasks.filter((t) => t.status !== 'completed')
  const completedTasks = tasks.filter((t) => t.status === 'completed')
  const completedCount = completedTasks.length
  const totalCount = tasks.length

  React.useEffect(() => {
    if (isAdding) inputRef.current?.focus()
  }, [isAdding])

  function handleSubmit() {
    const title = newTitle.trim()
    if (!title) return
    createTask.mutate({
      title,
      projectId: inbox ? undefined : project.id,
    })
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
      {/* Header */}
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
        <span
          className="truncate text-sm font-semibold"
          style={project.color ? { color: project.color } : undefined}
        >
          {project.name}
        </span>
        {totalCount > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        )}
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

      {/* Content */}
      {isOpen && (
        <div className="px-1 pb-1">
          {activeTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              allTasks={allTasks}
              onToggle={onToggleTask}
              onClick={onClickTask}
            />
          ))}

          {/* Inline task input */}
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

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div className="mt-1 border-t pt-1">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex w-full items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronRight
                  className={cn(
                    'h-3 w-3 transition-transform',
                    showCompleted && 'rotate-90',
                  )}
                />
                {completedTasks.length} completed
              </button>
              {showCompleted &&
                completedTasks.map((task) => (
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
      )}
    </div>
  )
}
