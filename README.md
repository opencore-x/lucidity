# Lucidity

> A personal productivity hub to improve and track your life digitally

## Vision

- **Primary goal:** Personal productivity improvement through unified life tracking
- **Target user:** Built for myself first, others can use if helpful
- **Philosophy:** Not competing to be the best todo app — it's a productivity hub where tasks, calendar, finances, bookmarks, habits, goals, and insights come together

## Platforms

- iOS & Android — React Native (Expo)
- Web App — Future
- Apple Watch — Swift/SwiftUI

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | Expo (React Native) |
| Navigation | Expo Router v6 (file-based) |
| Language | TypeScript |
| Backend | Node.js + Hono |
| Database | PostgreSQL (Neon) |
| ORM | Drizzle |
| Server State | TanStack React Query |
| UI State | Zustand |
| Styling | NativeWind (Tailwind for RN) |
| Auth | Clerk |
| Package Manager | pnpm |
| Monorepo | Turborepo |

## Monorepo Structure

```
apps/
  api/        Hono REST API (port 3000)
  mobile/     Expo React Native app
packages/
  db/         Drizzle ORM schema + Neon PostgreSQL
  shared/     Zod schemas and TypeScript types
  mcp-server/ MCP server for Claude integration
```

## Development

```bash
pnpm dev          # Start all packages
pnpm dev:api      # API server on :3000
pnpm dev:mobile   # Expo dev server

pnpm lint         # ESLint
pnpm check-types  # TypeScript
pnpm format       # Prettier
```

## Database

```bash
pnpm --filter @lucidity/db db:generate   # Generate migration files
pnpm --filter @lucidity/db db:migrate    # Run migrations
pnpm --filter @lucidity/db db:studio     # Open Drizzle Studio
```

Schema documentation: [`packages/db/schema.dbml`](packages/db/schema.dbml)
