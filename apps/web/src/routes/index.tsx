import {
  Show,
  SignInButton,
  SignUpButton,
} from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <>
      <Show when="signed-in">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All your projects and tasks.
          </p>
        </div>
      </Show>
      <Show when="signed-out">
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
      </Show>
    </>
  )
}
