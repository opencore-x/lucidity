import * as React from 'react'
import type { Task, Comment } from '@lucidity/shared'
import {
  Calendar,
  Check,
  ChevronRight,
  ListTree,
  MessageSquare,
  Plus,
  Repeat,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '~/components/ui/sheet'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { useTask, useUpdateTask, useToggleTask, useCreateTask } from '~/hooks/useTasks'
import { useComments, useCreateComment, useDeleteComment } from '~/hooks/useComments'
import { useProjects } from '~/hooks/useProjects'
import {
  formatDueDate,
  getDueDateColor,
  getSubtasks,
} from '~/utils/helpers'

interface TaskPanelProps {
  taskId: string | null
  onClose: () => void
  allTasks: Task[]
}

export function TaskPanel({ taskId, onClose, allTasks }: TaskPanelProps) {
  return (
    <Sheet open={!!taskId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        {taskId && (
          <TaskPanelContent
            taskId={taskId}
            allTasks={allTasks}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function TaskPanelContent({
  taskId,
  allTasks,
  onClose,
}: {
  taskId: string
  allTasks: Task[]
  onClose: () => void
}) {
  const taskQuery = useTask(taskId)
  const projectsQuery = useProjects()
  const commentsQuery = useComments(taskId)
  const updateTask = useUpdateTask()
  const toggleTask = useToggleTask()
  const createTask = useCreateTask()
  const createComment = useCreateComment()
  const deleteComment = useDeleteComment()

  const task = taskQuery.data
  const projects = projectsQuery.data ?? []
  const comments = commentsQuery.data ?? []

  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [titleDraft, setTitleDraft] = React.useState('')
  const [isEditingDesc, setIsEditingDesc] = React.useState(false)
  const [descDraft, setDescDraft] = React.useState('')
  const [commentText, setCommentText] = React.useState('')
  const [isAddingSubtask, setIsAddingSubtask] = React.useState(false)
  const [subtaskTitle, setSubtaskTitle] = React.useState('')
  const subtaskInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isAddingSubtask) subtaskInputRef.current?.focus()
  }, [isAddingSubtask])

  if (!task) {
    return (
      <SheetHeader>
        <SheetTitle>Loading...</SheetTitle>
        <SheetDescription className="sr-only">Task details loading</SheetDescription>
      </SheetHeader>
    )
  }

  const isCompleted = task.status === 'completed'
  const subtasks = getSubtasks(allTasks, task.id)
  const project = projects.find((p) => p.id === task.projectId)
  const dueLabel = formatDueDate(task.dueDate)
  const dueColor = getDueDateColor(task.dueDate)

  function saveTitle() {
    const title = titleDraft.trim()
    if (title && title !== task!.title) {
      updateTask.mutate({ id: taskId, data: { title } })
    }
    setIsEditingTitle(false)
  }

  function saveDescription() {
    const desc = descDraft.trim() || null
    if (desc !== (task!.description ?? null)) {
      updateTask.mutate({ id: taskId, data: { description: desc } })
    }
    setIsEditingDesc(false)
  }

  function handleAddComment() {
    const text = commentText.trim()
    if (!text) return
    createComment.mutate({ taskId, content: text })
    setCommentText('')
  }

  function handleAddSubtask() {
    const title = subtaskTitle.trim()
    if (!title) return
    createTask.mutate({
      title,
      projectId: task!.projectId ?? undefined,
      parentTaskId: taskId,
    })
    setSubtaskTitle('')
  }

  function handleSubtaskKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddSubtask()
    }
    if (e.key === 'Escape') {
      setIsAddingSubtask(false)
      setSubtaskTitle('')
    }
  }

  return (
    <>
      <SheetHeader className="gap-0">
        <SheetDescription className="sr-only">Task details</SheetDescription>

        {/* Title */}
        {isEditingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveTitle()
              if (e.key === 'Escape') setIsEditingTitle(false)
            }}
            className="text-lg font-semibold bg-transparent outline-none border-b border-primary pb-0.5"
          />
        ) : (
          <SheetTitle
            className={cn(
              'cursor-pointer text-lg hover:text-primary/80',
              isCompleted && 'line-through text-muted-foreground',
            )}
            onClick={() => {
              setTitleDraft(task.title)
              setIsEditingTitle(true)
            }}
          >
            {task.title}
          </SheetTitle>
        )}

        {/* Meta row */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {task.taskNumber && <span>#{task.taskNumber}</span>}
          {project && (
            <span style={{ color: project.color ?? undefined }}>
              {project.name}
            </span>
          )}
          {task.recurringFrequency && (
            <span className="flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              {task.recurringFrequency}
            </span>
          )}
          <span className="capitalize">{task.status.replace('_', ' ')}</span>
        </div>
      </SheetHeader>

      <div className="flex flex-col gap-4 px-4 pb-4">
        {/* Toggle completion */}
        <Button
          variant={isCompleted ? 'outline' : 'default'}
          size="sm"
          onClick={() => toggleTask.mutate(taskId)}
        >
          <Check className="h-4 w-4" />
          {isCompleted ? 'Mark incomplete' : 'Mark complete'}
        </Button>

        {/* Due date */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Due date:</span>
          {task.dueDate ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={new Date(task.dueDate).toISOString().split('T')[0]}
                onChange={(e) => {
                  const val = e.target.value
                  updateTask.mutate({
                    id: taskId,
                    data: { dueDate: val ? new Date(val) : null },
                  })
                }}
                className="h-7 rounded border bg-transparent px-2 text-sm"
              />
              <button
                onClick={() =>
                  updateTask.mutate({ id: taskId, data: { dueDate: null } })
                }
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <input
              type="date"
              value=""
              onChange={(e) => {
                const val = e.target.value
                if (val) {
                  updateTask.mutate({
                    id: taskId,
                    data: { dueDate: new Date(val) },
                  })
                }
              }}
              className="h-7 rounded border bg-transparent px-2 text-sm"
            />
          )}
        </div>

        <Separator />

        {/* Description */}
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Description
          </p>
          {isEditingDesc ? (
            <textarea
              autoFocus
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={saveDescription}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsEditingDesc(false)
              }}
              rows={4}
              className="w-full resize-none rounded-md border bg-transparent p-2 text-sm outline-none focus:border-primary"
            />
          ) : (
            <div
              className="min-h-[2rem] cursor-pointer rounded-md p-2 text-sm hover:bg-accent/50"
              onClick={() => {
                setDescDraft(task.description ?? '')
                setIsEditingDesc(true)
              }}
            >
              {task.description || (
                <span className="text-muted-foreground">
                  Add a description...
                </span>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Subtasks */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <ListTree className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">
              Subtasks
              {subtasks.length > 0 && ` (${subtasks.length})`}
            </p>
            <button
              onClick={() => setIsAddingSubtask(true)}
              className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {subtasks.length > 0 && (
            <div className="flex flex-col">
              {subtasks.map((sub) => (
                <SubtaskRow
                  key={sub.id}
                  task={sub}
                  onToggle={() => toggleTask.mutate(sub.id)}
                />
              ))}
            </div>
          )}

          {isAddingSubtask && (
            <div className="flex items-center gap-2 px-1 py-1">
              <div className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border border-muted-foreground/40">
                <Plus className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
              <input
                ref={subtaskInputRef}
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                onKeyDown={handleSubtaskKeyDown}
                onBlur={() => {
                  handleAddSubtask()
                  setIsAddingSubtask(false)
                }}
                placeholder="New subtask..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}

          {subtasks.length === 0 && !isAddingSubtask && (
            <button
              onClick={() => setIsAddingSubtask(true)}
              className="flex items-center gap-2 px-1 py-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add subtask
            </button>
          )}
        </div>

        <Separator />

        {/* Comments */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">
              Comments
              {comments.length > 0 && ` (${comments.length})`}
            </p>
          </div>

          {comments.length > 0 && (
            <div className="mb-3 flex flex-col gap-2">
              {comments.map((comment) => (
                <CommentRow
                  key={comment.id}
                  comment={comment}
                  onDelete={() =>
                    deleteComment.mutate({
                      taskId,
                      commentId: comment.id,
                    })
                  }
                />
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddComment()
                }
              }}
              placeholder="Add a comment..."
              className="flex-1 rounded-md border bg-transparent px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleAddComment}
              disabled={!commentText.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

function SubtaskRow({
  task,
  onToggle,
}: {
  task: Task
  onToggle: () => void
}) {
  const isCompleted = task.status === 'completed'
  const dueLabel = formatDueDate(task.dueDate)
  const dueColor = getDueDateColor(task.dueDate)

  return (
    <div className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/50">
      <button
        onClick={onToggle}
        className={cn(
          'flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border transition-colors',
          isCompleted
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/40 hover:border-primary',
        )}
      >
        {isCompleted && <Check className="h-2.5 w-2.5" />}
      </button>
      <span
        className={cn(
          'flex-1 truncate text-sm',
          isCompleted && 'text-muted-foreground line-through',
        )}
      >
        {task.title}
      </span>
      {dueLabel && !isCompleted && (
        <span className={cn('shrink-0 text-xs', dueColor)}>{dueLabel}</span>
      )}
    </div>
  )
}

function CommentRow({
  comment,
  onDelete,
}: {
  comment: Comment
  onDelete: () => void
}) {
  return (
    <div className="group rounded-md bg-accent/30 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
        <button
          onClick={onDelete}
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {new Date(comment.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
        {comment.source === 'claude' && ' (AI)'}
      </p>
    </div>
  )
}
