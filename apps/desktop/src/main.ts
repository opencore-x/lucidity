import { app, BrowserWindow, nativeImage, shell } from 'electron'
import path from 'node:path'
import http from 'node:http'
import sirv from 'sirv'

// The desktop app renders the SAME build the web app/PWA ship. We serve it over
// a real http://localhost origin (not file://) so Clerk's auth flows behave
// exactly as they do on the web — this is the core of the auth spike.
// Set the app name before `ready` so the menu bar / About panel read "Lucidity"
// instead of "Electron". NOTE: the Cmd+Tab switcher name comes from the running
// bundle's Info.plist (CFBundleName) — in dev that's Electron.app, so it stays
// "Electron" until electron-builder packages a real Lucidity.app.
app.setName('Lucidity')

const WEB_DIST = path.join(__dirname, '../../web/dist')
const ICON_PNG = path.join(__dirname, '../assets/icon.png')
const PORT = 7777
const ORIGIN = `http://localhost:${PORT}`

function startStaticServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    // `single: true` → SPA fallback to index.html for client-side routes.
    const serve = sirv(WEB_DIST, { single: true, dev: false })
    const server = http.createServer((req, res) =>
      serve(req, res, () => {
        res.statusCode = 404
        res.end('Not found')
      }),
    )
    server.on('error', reject)
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[desktop] serving ${WEB_DIST} at ${ORIGIN}`)
      resolve(ORIGIN)
    })
  })
}

async function createWindow() {
  const url = await startStaticServer()

  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    title: 'Lucidity',
    icon: ICON_PNG,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Clerk opens OAuth (Google/Apple) and its hosted account pages via window.open.
  // Allow those to open as child windows so the sign-in flow can complete in-app.
  // Anything that isn't our origin or Clerk's could alternatively be punted to the
  // system browser; for the spike we allow popups so OAuth can round-trip.
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    const isInternal =
      target.startsWith(ORIGIN) ||
      target.includes('.clerk.accounts.dev') ||
      target.includes('clerk.') ||
      target.includes('accounts.google.com') ||
      target.includes('appleid.apple.com')
    if (isInternal) return { action: 'allow' }
    shell.openExternal(target)
    return { action: 'deny' }
  })

  win.webContents.on('did-fail-load', (_e, code, desc, validatedURL) => {
    console.error(`[desktop] did-fail-load ${code} ${desc} @ ${validatedURL}`)
  })
  win.webContents.on('console-message', (_e, level, message) => {
    // Surface renderer console (incl. Clerk errors) in the main-process log.
    console.log(`[renderer:${level}] ${message}`)
  })

  await win.loadURL(url)
  // Open devtools during the spike so auth issues are visible.
  win.webContents.openDevTools({ mode: 'detach' })
}

app.whenReady().then(() => {
  // In dev (unpackaged) the dock shows the generic Electron icon — override it.
  // Packaging (electron-builder) will bake assets/icon.icns in for real builds.
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(nativeImage.createFromPath(ICON_PNG))
  }
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
