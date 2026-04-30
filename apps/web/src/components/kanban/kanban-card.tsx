import * as React from 'react'
import type { Task, Project } from '@lucidity/shared'
import { Check, ListTree, Repeat } from 'lucide-react'
import { cn } from '~/lib/utils'
import {
  formatDueDate,
  getDueDateColor,
  getSubtaskProgress,
} from '~/utils/helpers'

interface KanbanCardProps {
  task: Task
  allTasks: Task[]
  project?: Project
  onToggle: (id: string) => void
  onClick: (task: Task) => void
  isDragOverlay?: boolean
  style?: React.CSSProperties
}

export const KanbanCard = React.memo(function KanbanCard({
  task,
  allTasks,
  project,
  onToggle,
  onClick,
  isDragOverlay,
  style,
}: KanbanCardProps) {
  const isCompleted = task.status === 'completed'
  const dueLabel = formatDueDate(task.dueDate)
  const dueColor = getDueDateColor(task.dueDate)
  const subtaskProgress = getSubtaskProgress(allTasks, task.id)

  return (
    <div
      className={cn(
        'cursor-grab rounded-lg border bg-card px-3 py-2.5 transition-shadow hover:shadow-sm',
        isDragOverlay && 'rotate-2 scale-105 shadow-lg',
      )}
      style={style}
      onClick={() => onClick(task)}
    >
      {/* Row 1: checkbox + title */}
      <div className="flex items-start gap-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle(task.id)
          }}
          className={cn(
            'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors',
            isCompleted
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/40 hover:border-primary',
          )}
        >
          {isCompleted && <Check className="h-3 w-3" />}
        </button>
        <span
          className={cn(
            'text-sm leading-snug',
            isCompleted && 'text-muted-foreground line-through',
          )}
        >
          {task.title}
        </span>
      </div>

      {/* Row 2: metadata */}
      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        {task.taskNumber && <span>#{task.taskNumber}</span>}

        {project && (
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: project.color ?? '#888' }}
            />
            <span className="truncate max-w-[100px]">{project.name}</span>
          </span>
        )}

        {task.recurringFrequency && <Repeat className="h-3 w-3 shrink-0" />}

        {subtaskProgress && (
          <span className="flex items-center gap-0.5">
            <ListTree className="h-3 w-3" />
            {subtaskProgress.completed}/{subtaskProgress.total}
          </span>
        )}

        {dueLabel && !isCompleted && (
          <span className={cn('ml-auto shrink-0', dueColor)}>{dueLabel}</span>
        )}
      </div>
    </div>
  )
})
