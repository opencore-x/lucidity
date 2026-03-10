import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '~/providers/ThemeProvider'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '~/components/ui/sidebar'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  function cycle() {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const label = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={cycle} tooltip={`Theme: ${label}`}>
          <Icon />
          <span>{label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
