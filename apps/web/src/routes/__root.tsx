/// <reference types="vite/client" />
import { Outlet, createRootRoute, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar'
import { AppSidebar } from '~/components/app-sidebar'
import { CommandPalette } from '~/components/command-palette'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  // Public share routes (/p/:id) render standalone — no sidebar, no auth gate —
  // so a logged-out visitor sees a clean read-only page regardless of session.
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  if (pathname.startsWith('/p/')) {
    return <Outlet />
  }

  return (
    <>
      <SignedIn>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <Outlet />
          </SidebarInset>
        </SidebarProvider>
        <CommandPalette />
      </SignedIn>
      <SignedOut>
        <Outlet />
      </SignedOut>
      {import.meta.env.DEV && (
        <TanStackRouterDevtools position="bottom-right" />
      )}
    </>
  )
}
