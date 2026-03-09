import * as React from 'react'

type ShortcutHandler = (e: KeyboardEvent) => void

const shortcuts = new Map<string, ShortcutHandler>()

function getShortcutKey(e: KeyboardEvent): string | null {
  const meta = e.metaKey || e.ctrlKey
  if (!meta) return null
  return `mod+${e.key.toLowerCase()}`
}

function handleKeyDown(e: KeyboardEvent) {
  // Don't fire shortcuts when typing in inputs
  const target = e.target as HTMLElement
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  ) {
    return
  }

  const key = getShortcutKey(e)
  if (key && shortcuts.has(key)) {
    e.preventDefault()
    shortcuts.get(key)!(e)
  }
}

let listenerAttached = false

function ensureListener() {
  if (!listenerAttached) {
    document.addEventListener('keydown', handleKeyDown)
    listenerAttached = true
  }
}

export function useKeyboardShortcut(
  key: string,
  handler: ShortcutHandler,
) {
  React.useEffect(() => {
    ensureListener()
    shortcuts.set(key, handler)
    return () => {
      shortcuts.delete(key)
    }
  }, [key, handler])
}
