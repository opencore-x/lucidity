import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useKeyboardShortcut } from '~/hooks/useKeyboardShortcuts'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import {
  FolderOpen,
  Sun,
  Flag,
  Search,
  Settings,
} from 'lucide-react'

const commands = [
  { label: 'Projects', icon: FolderOpen, to: '/' as const },
  { label: 'Today', icon: Sun, to: '/today' as const },
  { label: 'Milestones', icon: Flag, to: '/milestones' as const },
  { label: 'Search', icon: Search, to: '/search' as const },
  { label: 'Settings', icon: Settings, to: '/settings' as const },
]

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const navigate = useNavigate()

  useKeyboardShortcut(
    'mod+k',
    React.useCallback(() => setOpen((o) => !o), []),
  )

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()),
  )

  function handleSelect(to: string) {
    setOpen(false)
    setQuery('')
    navigate({ to })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 border-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              No results found.
            </p>
          )}
          {filtered.map((cmd) => (
            <button
              key={cmd.label}
              onClick={() => handleSelect(cmd.to)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <cmd.icon className="h-4 w-4" />
              {cmd.label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
