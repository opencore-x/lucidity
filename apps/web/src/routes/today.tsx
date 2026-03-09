import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/today')({
  component: Today,
})

function Today() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold tracking-tight">Today</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tasks due today and overdue.
      </p>
    </div>
  )
}
