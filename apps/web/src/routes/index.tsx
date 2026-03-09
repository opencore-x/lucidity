import {
  Show,
  SignInButton,
  SignUpButton,
} from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import { useTasks, useToggleTask } from '~/hooks/useTasks'
import { useProjects } from '~/hooks/useProjects'
import { groupTasksByProject } from '~/utils/helpers'
import { ProjectGroup } from '~/components/project-group'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <>
      <Show when="signed-in">
        <ProjectsView />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  )
}

function ProjectsView() {
  const tasksQuery = useTasks()
  const projectsQuery = useProjects()
  const toggleTask = useToggleTask()

  const tasks = tasksQuery.data ?? []
  const projects = projectsQuery.data ?? []
  const isLoading = tasksQuery.isLoading || projectsQuery.isLoading

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (tasksQuery.error || projectsQuery.error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-red-500">
          Error: {tasksQuery.error?.message || projectsQuery.error?.message}
        </p>
      </div>
    )
  }

  const activeProjects = projects.filter((p) => !p.isArchived)
  const grouped = groupTasksByProject(tasks, activeProjects)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
      <div className="mt-4 flex flex-col gap-3">
        {Array.from(grouped.entries()).map(([project, projectTasks]) => (
          <ProjectGroup
            key={project.id}
            project={project}
            tasks={projectTasks}
            allTasks={tasks}
            onToggleTask={(id) => toggleTask.mutate(id)}
          />
        ))}
      </div>
    </div>
  )
}

function LandingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Lucidity</h1>
        <p className="mt-2 text-muted-foreground">
          Task management, clarified.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <SignInButton mode="modal">
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
              Sign up
            </button>
          </SignUpButton>
        </div>
      </div>
    </div>
  )
}
