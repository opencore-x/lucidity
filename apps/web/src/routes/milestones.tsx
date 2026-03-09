import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/milestones')({
  component: Milestones,
})

function Milestones() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold tracking-tight">Milestones</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Track progress across your milestones.
      </p>
    </div>
  )
}
