import {
  FolderOpen,
  Sun,
  Moon,
  Monitor,
  Columns3,
  Flag,
  Search,
  Settings,
} from 'lucide-react'

import { NavMain } from '~/components/nav-main'
import { NavUser } from '~/components/nav-user'
import { ThemeToggle } from '~/components/theme-toggle'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '~/components/ui/sidebar'
import { Link } from '@tanstack/react-router'

const navItems = [
  { title: 'Projects', url: '/', icon: FolderOpen },
  { title: 'Today', url: '/today', icon: Sun },
  { title: 'Board', url: '/kanban', icon: Columns3 },
  { title: 'Milestones', url: '/milestones', icon: Flag },
  { title: 'Search', url: '/search', icon: Search },
]

const bottomItems = [
  { title: 'Settings', url: '/settings', icon: Settings },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg text-sm font-bold">
                  L
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Lucidity</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Task management
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavMain items={bottomItems} label="Settings" />
      </SidebarContent>
      <SidebarFooter>
        <ThemeToggle />
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
