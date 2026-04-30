import * as React from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { TASK_STATUS_VALUES } from '@lucidity/shared'
import type { Task, Project } from '@lucidity/shared'

type TaskStatus = (typeof TASK_STATUS_VALUES)[number]
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'

interface KanbanBoardProps {
  tasks: Task[]
  allTasks: Task[]
  projects: Project[]
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onToggle: (id: string) => void
  onClick: (task: Task) => void
  onCreate: (title: string, status: TaskStatus) => void
}

export function KanbanBoard({
  tasks,
  allTasks,
  projects,
  onStatusChange,
  onToggle,
  onClick,
  onCreate,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const tasksByStatus = React.useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    for (const status of TASK_STATUS_VALUES) {
      grouped[status] = []
    }
    for (const task of tasks) {
      if (grouped[task.status]) {
        grouped[task.status].push(task)
      }
    }
    return grouped
  }, [tasks])

  const projectMap = React.useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  )

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    // Determine target status: either dropping on a column (status string) or on a card
    let targetStatus: TaskStatus | undefined
    if ((TASK_STATUS_VALUES as readonly string[]).includes(overId)) {
      targetStatus = overId as TaskStatus
    } else {
      // Dropped on a card — find that card's status
      const overTask = tasks.find((t) => t.id === overId)
      if (!overTask) return
      targetStatus = overTask.status
    }

    // Find the dragged task's current status
    const draggedTask = tasks.find((t) => t.id === taskId)
    if (!draggedTask || draggedTask.status === targetStatus) return

    onStatusChange(taskId, targetStatus)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {TASK_STATUS_VALUES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status] ?? []}
            allTasks={allTasks}
            projects={projects}
            activeId={activeId}
            onToggle={onToggle}
            onClick={onClick}
            onCreate={onCreate}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <KanbanCard
            task={activeTask}
            allTasks={allTasks}
            project={
              activeTask.projectId
                ? projectMap.get(activeTask.projectId)
                : undefined
            }
            onToggle={() => {}}
            onClick={() => {}}
            isDragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
