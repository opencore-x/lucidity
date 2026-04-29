import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTasks, useUpdateTask, useToggleTask, useCreateTask } from '~/hooks/useTasks'
import { useProjects } from '~/hooks/useProjects'
import { KanbanBoard } from '~/components/kanban/kanban-board'
import { TaskPanel } from '~/components/task-panel'
import { ChevronDown } from 'lucide-react'
import type { Task } from '@lucidity/shared'
import { TASK_STATUS_VALUES } from '@lucidity/shared'

type TaskStatus = (typeof TASK_STATUS_VALUES)[number]

export const Route = createFileRoute('/kanban')({
  component: Kanban,
})

function Kanban() {
  const tasksQuery = useTasks()
  const projectsQuery = useProjects()
  const updateTask = useUpdateTask()
  const toggleTask = useToggleTask()
  const createTask = useCreateTask()

  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null)
  const [filterProjectId, setFilterProjectId] = React.useState<string | null>(null)
  const [filterOpen, setFilterOpen] = React.useState(false)
  const filterRef = React.useRef<HTMLDivElement>(null)

  const allTasks = tasksQuery.data ?? []
  const projects = projectsQuery.data ?? []
  const isLoading = tasksQuery.isLoading || projectsQuery.isLoading

  // Close filter dropdown on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    if (filterOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [filterOpen])

  const rootTasks = React.useMemo(() => {
    let tasks = allTasks.filter((t) => !t.parentTaskId)
    if (filterProjectId) {
      tasks = tasks.filter((t) => t.projectId === filterProjectId)
    }
    return tasks
  }, [allTasks, filterProjectId])

  const filterProject = filterProjectId
    ? projects.find((p) => p.id === filterProjectId)
    : null

  function handleStatusChange(taskId: string, status: TaskStatus) {
    updateTask.mutate({ id: taskId, data: { status } })
  }

  function handleCreate(title: string, status: TaskStatus) {
    createTask.mutate({
      title,
      status,
      ...(filterProjectId ? { projectId: filterProjectId } : {}),
    })
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight">Board</h1>
        <p className="mt-1 text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Board</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag tasks between columns to change status.
          </p>
        </div>

        {/* Project filter */}
        <div className="relative ml-auto" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm hover:bg-accent/50"
          >
            {filterProject ? (
              <>
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: filterProject.color ?? '#888' }}
                />
                {filterProject.name}
              </>
            ) : (
              'All projects'
            )}
            <ChevronDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {filterOpen && (
            <div className="absolute right-0 z-50 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md">
              <button
                onClick={() => {
                  setFilterProjectId(null)
                  setFilterOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                All projects
              </button>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setFilterProjectId(p.id)
                    setFilterOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: p.color ?? '#888' }}
                  />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          tasks={rootTasks}
          allTasks={allTasks}
          projects={projects}
          onStatusChange={handleStatusChange}
          onToggle={(id) => toggleTask.mutate(id)}
          onClick={(task) => setSelectedTaskId(task.id)}
          onCreate={handleCreate}
        />
      </div>

      <TaskPanel
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        allTasks={allTasks}
      />
    </div>
  )
}
