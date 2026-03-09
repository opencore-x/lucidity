import type { Task } from '@lucidity/shared'
import { Check, Repeat, ListTree } from 'lucide-react'
import { cn } from '~/lib/utils'
import {
  formatDueDate,
  getDueDateColor,
  getSubtaskProgress,
} from '~/utils/helpers'

interface TaskItemProps {
  task: Task
  allTasks: Task[]
  onToggle: (id: string) => void
  onClick?: (task: Task) => void
}

export function TaskItem({ task, allTasks, onToggle, onClick }: TaskItemProps) {
  const isCompleted = task.status === 'completed'
  const dueLabel = formatDueDate(task.dueDate)
  const dueColor = getDueDateColor(task.dueDate)
  const subtaskProgress = getSubtaskProgress(allTasks, task.id)

  return (
    <div
      className="group flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent/50 cursor-pointer"
      onClick={() => onClick?.(task)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle(task.id)
        }}
        className={cn(
          'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors',
          isCompleted
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/40 hover:border-primary',
        )}
      >
        {isCompleted && <Check className="h-3 w-3" />}
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={cn(
            'truncate text-sm',
            isCompleted && 'text-muted-foreground line-through',
          )}
        >
          {task.title}
        </span>

        {task.taskNumber && (
          <span className="shrink-0 text-xs text-muted-foreground">
            #{task.taskNumber}
          </span>
        )}

        {task.recurringFrequency && (
          <Repeat className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}

        {subtaskProgress && (
          <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
            <ListTree className="h-3 w-3" />
            {subtaskProgress.completed}/{subtaskProgress.total}
          </span>
        )}
      </div>

      {dueLabel && !isCompleted && (
        <span className={cn('shrink-0 text-xs', dueColor)}>{dueLabel}</span>
      )}
    </div>
  )
}
