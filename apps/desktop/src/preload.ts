import { contextBridge } from 'electron'

// Minimal, safe bridge for the spike. The native layer (notes-vault FS, daemon
// control) will expand this with IPC channels later.
contextBridge.exposeInMainWorld('lucidityDesktop', {
  isDesktop: true,
  platform: process.platform,
  electronVersion: process.versions.electron,
})
