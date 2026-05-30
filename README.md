# Lucidity

> Your personal assistant. The interesting part is what happens when two of them meet.

[![License](https://img.shields.io/badge/license-AGPL--3.0%20%2F%20Commercial-blue)](LICENSE) · [lucidity.my](https://lucidity.my)

**Status:** Active development, building in public. Some of what's described below works today; some is documented design that hasn't shipped yet. See [What works today](#what-works-today) for the honest split.

---

## What Lucidity is

A personal assistant that runs on your hardware and uses the AI you already pay for. Today she manages your life: tasks, projects, milestones, sub-tasks, recurring schedules, comments — across mobile, web, and API. Talk to her through Claude Desktop, Claude Code, Codex, or Cursor by plugging in her MCP server, or use the apps directly.

That much is shipped. But the productivity app isn't why Lucidity exists.

## The interesting part

The long-term wedge is this: **two people who both use Lucidity don't message each other directly. Their Lucidities do.**

A friend in Tokyo wants to send a long message at 3am their time. A coworker wants to know your earliest free slot. A family member needs the wifi password while you're in a meeting. None of these need to interrupt you — and none of them do. Their Lucidity asks yours; yours responds within the permissions you've set.

This is what makes Lucidity different from a todo app, a chat app, or another AI assistant:

- **Per-relationship trust gradients.** Mom can fetch photos; brother can also fetch files; a friend can only ping urgent.
- **Agent-mediated delivery.** Your assistant decides when, how, and whether to deliver.
- **Async-by-default.** A message sent at 3am in Berlin doesn't wake up Singapore. It waits, and arrives with breakfast.
- **Delegation without disturbance.** Family asks; your Lucidity answers within her grants; you stay focused.

It's not shipped yet. It's where Lucidity is going.

## What Lucidity isn't

- **Not another agent runtime.** OpenClaw exists. Lucidity integrates with it; she doesn't replace it.
- **Not another AI subscription.** Bring your own Claude Pro/Max or ChatGPT Plus/Pro plan. Lucidity sells context, not inference.
- **Not a chat layer on someone else's app.** Own UI only — third-party channels are someone else's game.

## A note on dogfooding

Lucidity's own roadmap, milestones, and bug list live inside Lucidity. The author uses her daily. The project uses her daily. Nothing in this README is productivity advice from someone with a Notion template — it's the system running this project.

## Shipped

- Task management across mobile, web, and API
- Projects, milestones, comments, recurring tasks, sub-tasks
- Inline task and project creation, swipe gestures, drag-to-reorder
- Native bottom tabs (Today, Week, Search)
- Optimistic updates, dark mode, keyboard handling
- Clerk auth + API key auth
- MCP server (`@lucidity/mcp-server`) for BYOAI
- Web app with Kanban, theme toggle, settings

## On the roadmap

- Daily briefing (pull via MCP)
- Local always-on daemon (free self-host tier)
- Server-side scheduled actions (paid tier)
- Agent-mediated comms with trust gradients
- Push notifications and reminders
- Offline-first sync

## Architecture sketch

Three transports, same prompt builders:

```
buildBriefingPrompt(userId) → { messages, tools, schema }
                  │
        ┌─────────┼─────────────────────┐
        ▼         ▼                     ▼
    MCP tool  Local daemon         Server endpoint
    (free)    (free, BYOAI)        (Pro tier — price TBD)
              via Claude Code      via Anthropic API
              subprocess
```

- **Free / self-host**: MCP + local daemon on your always-on hardware (Mac mini, VPS, Docker host). Uses your existing Claude Pro/Max plan.
- **Pro tier** (price TBD): Lucidity-hosted always-on agent for users without local always-on infra.

## Tech stack

<details>
<summary>Expand</summary>

| Layer | Technology |
|---|---|
| Mobile | Expo (React Native), Expo Router v6 |
| Web | TanStack Start + TanStack Router (Vite) |
| Backend | Hono on Node.js |
| Database | PostgreSQL (Neon) + Drizzle ORM |
| Server state | TanStack React Query |
| UI state | Zustand |
| Styling | NativeWind (Tailwind for RN) |
| Auth | Clerk + API keys |
| MCP | Official MCP SDK |
| Monorepo | Turborepo + pnpm workspaces |

</details>

## Monorepo

```
apps/
  api/        Hono REST API
  mobile/     Expo React Native app
  web/        TanStack Start web app
packages/
  db/                  Drizzle ORM schema + migrations  [AGPL-3.0]
  shared/              Zod schemas and TypeScript types [AGPL-3.0]
  mcp-server/          MCP server for AI clients        [AGPL-3.0]
  eslint-config/       Shared ESLint config             [MIT]
  typescript-config/   Shared tsconfig                  [MIT]
```

## Development

```bash
pnpm install
pnpm dev          # Start all packages
pnpm dev:api      # API server on :3000
pnpm dev:mobile   # Expo dev server
pnpm dev:web      # Vite / TanStack Start dev server

pnpm lint
pnpm check-types
pnpm format
```

The `shared` and `db` packages compile to `dist/` (`tsc`). The dev scripts build them automatically before starting (Turbo's `dev` task `dependsOn: ["^build"]`) and watch-recompile on changes, so a clean checkout needs no manual build step — `pnpm dev` / `pnpm dev:api` just work. Production builds the same way via `pnpm build`.

### Database

```bash
pnpm --filter @lucidity/db db:generate
pnpm --filter @lucidity/db db:migrate
pnpm --filter @lucidity/db db:studio
```

Schema reference: [`packages/db/schema.dbml`](packages/db/schema.dbml)

### Environment

Single `.env` file at the monorepo root. Copy `.env.example` and fill in:
`DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.

## Licensing

Per-folder licensing, same pattern as Cal.com, Sentry, Plausible, and PostHog:

- **Runtime** (`packages/mcp-server`, `packages/shared`, `packages/db`) → **AGPL-3.0**. Auditable, self-hostable.
- **Product** (`apps/api`, `apps/web`, `apps/mobile`) → **Lucidity Commercial License**. Source-available; not redistributable; not for commercial hosting.
- **Tooling configs** (`packages/eslint-config`, `packages/typescript-config`) → **MIT**.

Full details: [`LICENSE`](LICENSE) and per-folder `LICENSE` files.

## Contact

Commercial licensing, partnerships, or just want to talk: ankit@sejw.al

## Contributing

PRs are not currently accepted — see [`CONTRIBUTING.md`](CONTRIBUTING.md). Issues, bug reports, and design feedback are welcome.

## Security

For security issues, please don't open a public issue. See [`SECURITY.md`](SECURITY.md).
