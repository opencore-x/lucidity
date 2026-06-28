# @lucidity/desktop

Lucidity desktop shell (Electron). It renders the **same build** the web app and PWA ship (`apps/web/dist`) — not a thin URL wrapper — and will grow the native layer (local notes-vault filesystem, Lucid daemon control, tray/menus) that justifies a desktop app.

## Status: auth spike

This is the de-risking spike for the milestone task "Electron desktop shell wrapping the SPA + native layer." It exists to answer one question first: **does Clerk auth work inside Electron?**

Approach: the main process serves `apps/web/dist` over `http://localhost:7777` (a real http origin, not `file://`) and loads it in a `BrowserWindow`, so Clerk behaves exactly as it does on the web.

## Run

```bash
# 1. build the web SPA the shell renders
pnpm --filter @lucidity/web build
# 2. make sure the API is up (the SPA fetches it)
pnpm dev:api
# 3. launch the shell
pnpm dev:desktop
```

## Known follow-ups (not done in the spike)

- Disable the PWA **service worker** in the desktop build (redundant under a local origin; risks stale caching).
- Point the renderer at the **production API** instead of the build-time `VITE_API_URL`.
- Native layer: notes-vault FS + file watching, daemon lifecycle, tray/menu/global shortcut, deep links.
- Packaging + auto-update (electron-builder / electron-updater), code signing + notarization.
- Harden `setWindowOpenHandler` / CSP for production.
