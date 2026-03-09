import type { LucideIcon } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '~/components/ui/sidebar'

export function NavMain({
  items,
  label,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
  }[]
  label?: string
}) {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              isActive={currentPath === item.url}
              tooltip={item.title}
            >
              <Link to={item.url}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
