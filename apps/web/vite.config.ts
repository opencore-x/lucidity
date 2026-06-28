import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // The monorepo keeps a single .env at the root; load VITE_* vars from there.
  envDir: '../../',
  server: {
    // API runs on 3001; keep the web dev server clear of it.
    port: 3000,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    // File-based routing without TanStack Start's SSR/server layer.
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    viteReact(),
    // Installable PWA: precaches the SPA shell so it launches offline and can be
    // "installed" as an app. (When this build is later embedded in Electron, the
    // service worker should be disabled — Electron loads from file:// and the SW
    // is redundant there.)
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Lucidity',
        short_name: 'Lucidity',
        description: 'Task management, clarified.',
        theme_color: '#06b6d4',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // SPA: serve index.html for unknown in-app routes while offline.
        navigateFallback: '/index.html',
      },
      devOptions: {
        // Keep the SW off in `vite dev`; verify via `vite preview` on a build.
        enabled: false,
      },
    }),
  ],
})
