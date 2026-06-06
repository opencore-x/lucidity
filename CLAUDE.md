# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lucidity is a task management app built as a pnpm monorepo with Turborepo. It consists of a Hono REST API, an Expo React Native mobile app, a shared types/validation package, a Drizzle database package, and an MCP server for Claude integration.

## Commands

```bash
# Development (starts all packages)
pnpm dev

# Run individual packages
pnpm dev:api                    # API server on :3001
pnpm dev:mobile                 # Expo dev server

# iOS builds
pnpm ios:local                  # Development build on device
pnpm ios:prod                   # Production build on device

# Database (run from packages/db)
pnpm --filter @lucidity/db db:generate   # Generate migration files
pnpm --filter @lucidity/db db:migrate    # Run migrations
pnpm --filter @lucidity/db db:studio     # Open Drizzle Studio
# NOTE: Do NOT use db:push — it has a known drizzle-kit bug (#4944) that
# tries to drop/recreate pgEnum types and fails. Always use db:generate
# followed by db:migrate instead.

# Quality
pnpm lint
pnpm check-types
pnpm format                     # Prettier
```

## Monorepo Structure

```
apps/api/          → @lucidity/api      Hono REST API (tsx watch, port 3001)
apps/mobile/       → @lucidity/mobile   Expo React Native app (expo-router v6)
apps/daemon/       → @lucidity/daemon   Lucid local daemon — cron, jobs, chat (see apps/daemon/README.md)
packages/db/       → @lucidity/db       Drizzle ORM schema + Neon PostgreSQL
packages/shared/   → @lucidity/shared   Zod schemas and TypeScript types
packages/runtime/  → @lucidity/runtime  Lucid's stateless brain (prompt builders + AgentExecutor seam)
packages/mcp-server/                    MCP server for Claude integration
```

## Architecture & Data Flow

```
Neon PostgreSQL → Drizzle ORM (@lucidity/db) → Hono API (@lucidity/api)
                                                      ↓ REST (Clerk JWT or API key)
                                               React Query → Mobile UI
```

### API (`apps/api`)

- **Framework:** Hono with middleware stack: logger → CORS → clerkMiddleware → error handler
- **Auth:** Dual auth — Clerk JWT tokens (primary) and API keys (`Bearer luc_...`). The `getCurrentUser()` helper in `src/lib/auth.ts` handles both and does just-in-time user creation on first Clerk login.
- **Routes:** Each entity has its own router in `src/routes/`. Route registration order matters — `commentRouter` and `taskQueryRouter` must be mounted before `taskRouter` so `/today`, `/week`, and `/:taskId/comments` match before `/:id`.
- **IDs:** UUIDv7 (time-ordered) for all entities.
- **Validation:** Request bodies validated with Zod schemas from `@lucidity/shared`.

### Mobile (`apps/mobile`)

- **Navigation:** File-based routing with expo-router v6. Tab layout in `(tabs)/` with Projects, Today, Week, Search screens.
- **Server state:** TanStack React Query with optimistic updates on all mutations (create/update/delete). Hooks in `hooks/` wrap query/mutation logic. API client in `api/client.ts` injects Clerk tokens.
- **UI state:** Zustand store (`stores/sheetStore.ts`) manages bottom sheet task stack for drill-down navigation into subtasks.
- **Styling:** NativeWind (Tailwind for RN) with `@rn-primitives/*` headless components. Dark/light mode via `useColorScheme`.
- **Gestures:** react-native-gesture-handler for swipe actions (left=delete, right=set due today). react-native-reanimated for animations.

### Database (`packages/db`)

- **Tables:** `users`, `projects`, `tasks`, `milestones`, `comments`, `api_keys`
- **Task hierarchy:** Self-referential `parentTaskId` enables unlimited subtask nesting. Recursive CTE for cascade deletion.
- **Recurring tasks:** `recurringFrequency` field (daily/weekly/monthly/yearly) with fixed-interval recurrence calculated in API on completion toggle.
- **Task statuses:** `pending`, `in_progress`, `completed`, `blocked`, `deferred`
- **Priority:** Integer 1-1000, default 500 (lower = higher priority).

### Shared (`packages/shared`)

- Zod schemas define the shape of each entity (Task, Project, User, Milestone, Comment) plus Create/Update variants.
- TypeScript types are inferred from Zod schemas (`z.infer<typeof Schema>`).
- Both API and mobile import from this package for consistent validation and types.
- Both `@lucidity/shared` and `@lucidity/db` compile to `dist/` via `tsc` (their `package.json` `exports` point at `dist/`). The Turbo `dev` task has `dependsOn: ["^build"]`, so `pnpm dev` / `pnpm dev:api` build these packages before starting the API — a clean checkout needs no manual build. `pnpm dev` also runs `tsc --watch` in each package, so edits recompile and are picked up on API server restart. Production (Render) runs `pnpm build`, which compiles all packages before `node dist/index.js`. Dev and prod use the same compiled output.

## Key Patterns

- **Virtual Inbox:** Tasks with `projectId: null` appear in an "Inbox" section in the mobile UI. This is purely a UI concept — there's no Inbox entity in the database.
- **Optimistic updates:** Every mutation in `hooks/useTasks.ts` (and similar) snapshots cache, applies optimistic change, then rolls back on error. Temp IDs use `temp-${Date.now()}`.
- **Bottom sheet drill-down:** `sheetStore` maintains a `taskStack` array. Opening a subtask pushes onto the stack; back button pops.
- **Inline creation:** Tasks and projects are created inline (no modal/sheet). Persistent input row inside each project group.
- **Due date propagation:** When a parent task's due date changes, all descendants are updated. Recurring frequency requires a due date.

## Environment

Single `.env` file at monorepo root. The API loads it via `tsx --env-file=../../.env`. Mobile uses `APP_ENV` to select config.

Required variables: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
