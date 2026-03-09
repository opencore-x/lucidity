/// <reference types="vite/client" />
import { ClerkProvider } from '@clerk/tanstack-react-start'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import * as React from 'react'
import { Show } from '@clerk/tanstack-react-start'
import { ApiProvider } from '~/providers/ApiProvider'
import { TooltipProvider } from '~/components/ui/tooltip'
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar'
import { AppSidebar } from '~/components/app-sidebar'
import { CommandPalette } from '~/components/command-palette'
import appCss from '~/styles/app.css?url'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
})

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Lucidity' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ClerkProvider>
          <QueryClientProvider client={queryClient}>
            <ApiProvider>
              <TooltipProvider>
                {children}
              </TooltipProvider>
            </ApiProvider>
          </QueryClientProvider>
        </ClerkProvider>
        {process.env.NODE_ENV === 'development' && (
          <TanStackRouterDevtools position="bottom-right" />
        )}
        <Scripts />
      </body>
    </html>
  )
}

function RootComponent() {
  return (
    <>
      <Show when="signed-in">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <Outlet />
          </SidebarInset>
        </SidebarProvider>
        <CommandPalette />
      </Show>
      <Show when="signed-out">
        <Outlet />
      </Show>
    </>
  )
}
