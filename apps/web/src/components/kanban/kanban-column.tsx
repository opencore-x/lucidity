import * as React from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TASK_STATUS_VALUES } from '@lucidity/shared'
import type { Task, Project } from '@lucidity/shared'

type TaskStatus = (typeof TASK_STATUS_VALUES)[number]
import { Plus } from 'lucide-react'
import { cn } from '~/lib/utils'
import { KanbanCard } from './kanban-card'

const STATUS_CONFIG: Record<string, { label: string; dotColor: string }> = {
  pending: { label: 'Pending', dotColor: 'bg-gray-400' },
  in_progress: { label: 'In Progress', dotColor: 'bg-blue-500' },
  completed: { label: 'Completed', dotColor: 'bg-green-500' },
  blocked: { label: 'Blocked', dotColor: 'bg-red-500' },
  deferred: { label: 'Deferred', dotColor: 'bg-amber-500' },
}

interface KanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  allTasks: Task[]
  projects: Project[]
  activeId: string | null
  onToggle: (id: string) => void
  onClick: (task: Task) => void
  onCreate: (title: string, status: TaskStatus) => void
}

export function KanbanColumn({
  status,
  tasks,
  allTasks,
  projects,
  activeId,
  onToggle,
  onClick,
  onCreate,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const [isCreating, setIsCreating] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  const config = STATUS_CONFIG[status] ?? { label: status, dotColor: 'bg-gray-400' }
  const projectMap = React.useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  )
  const taskIds = React.useMemo(() => tasks.map((t) => t.id), [tasks])

  React.useEffect(() => {
    if (isCreating) inputRef.current?.focus()
  }, [isCreating])

  function handleSubmit() {
    const title = newTitle.trim()
    if (title) {
      onCreate(title, status)
      setNewTitle('')
    } else {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex w-[320px] shrink-0 flex-col rounded-lg border bg-muted/30">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className={cn('h-2.5 w-2.5 rounded-full', config.dotColor)} />
        <span className="text-sm font-semibold">{config.label}</span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 transition-colors',
          isOver && 'bg-accent/50',
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableCard
              key={task.id}
              task={task}
              allTasks={allTasks}
              project={task.projectId ? projectMap.get(task.projectId) : undefined}
              activeId={activeId}
              onToggle={onToggle}
              onClick={onClick}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isCreating && (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No tasks
          </div>
        )}

        {/* Inline creation */}
        {isCreating ? (
          <div className="rounded-lg border bg-card px-3 py-2.5">
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSubmit()
                }
                if (e.key === 'Escape') {
                  setIsCreating(false)
                  setNewTitle('')
                }
              }}
              onBlur={handleSubmit}
              placeholder="Task title..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add task
          </button>
        )}
      </div>
    </div>
  )
}

function SortableCard({
  task,
  allTasks,
  project,
  activeId,
  onToggle,
  onClick,
}: {
  task: Task
  allTasks: Task[]
  project?: Project
  activeId: string | null
  onToggle: (id: string) => void
  onClick: (task: Task) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || task.id === activeId ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <KanbanCard
        task={task}
        allTasks={allTasks}
        project={project}
        onToggle={onToggle}
        onClick={onClick}
        style={style}
      />
    </div>
  )
}
