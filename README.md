# Lucidity

> Your Lucidity is your personal assistant. Yours alone. The interesting part is what happens when two Lucidities meet.

[![License](https://img.shields.io/badge/license-AGPL--3.0%20%2F%20Commercial-blue)](LICENSE)

**Status:** Active development, building in public. Some of what's described below works today; some is documented design that hasn't shipped yet. See [What works today](#what-works-today) for the honest split.

---

## What Lucidity is

Lucidity is a personal assistant — yours alone, running on hardware you control, using the AI you already pay for.

Today, she manages your life: tasks, projects, milestones, sub-tasks, recurring schedules, comments, mobile + web + API. You can talk to her through your existing AI client (Claude Desktop, Claude Code, Codex, Cursor) by plugging in her MCP server. Or use the apps directly.

That much is shipped.

But the productivity app isn't why Lucidity exists.

## The interesting part

The long-term wedge is this: **two people who both use Lucidity don't message each other directly. Their Lucidities do.**

When your mom asks for last weekend's photos at 11pm her time, she asks her Lucidity. Her Lucidity asks yours. Yours checks the permission you granted ("Mom can see photos. Mom does not bypass quiet hours."), pulls the album, delivers it to her — without pinging you. You see what happened in your agent journal in the morning.

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

Lucidity's own roadmap, milestones, and bug list live inside Lucidity. The author uses her daily. The project uses her daily. Nothing in this README is productivity advice from someone with a Notion template — it's the system running this project. (Yes, that's a chicken-and-egg problem for the public roadmap. We'll get there.)

## What works today

| Area | Status |
|---|---|
| Task management (mobile + web + API) | ✅ Shipped |
| Projects, milestones, comments, recurring tasks, sub-tasks | ✅ Shipped |
| Inline task and project creation, swipe gestures, drag-to-reorder | ✅ Shipped |
| Native bottom tabs (Today, Week, Search) | ✅ Shipped |
| Optimistic updates, dark mode, keyboard handling | ✅ Shipped |
| Clerk auth + API key auth | ✅ Shipped |
| MCP server (`@lucidity/mcp-server`) for BYOAI | ✅ Shipped |
| Web app with Kanban, theme toggle, settings | ✅ Shipped |
| Daily briefing (pull via MCP) | 🚧 Designed |
| Local always-on daemon (free self-host tier) | 🚧 Designed |
| Server-side scheduled actions (paid tier) | 🚧 Designed |
| Agent-mediated comms with trust gradients | 🚧 Designed |
| Push notifications and reminders | 🚧 Designed |
| Offline-first sync | 🚧 Designed |

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

| Layer | Technology |
|---|---|
| Mobile | Expo (React Native), Expo Router v6 |
| Web | Next.js |
| Backend | Hono on Node.js |
| Database | PostgreSQL (Neon) + Drizzle ORM |
| Server state | TanStack React Query |
| UI state | Zustand |
| Styling | NativeWind (Tailwind for RN) |
| Auth | Clerk + API keys |
| MCP | Official MCP SDK |
| Monorepo | Turborepo + pnpm workspaces |

## Monorepo

```
apps/
  api/        Hono REST API
  mobile/     Expo React Native app
  web/        Next.js web app
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
pnpm dev:web      # Next.js dev server

pnpm lint
pnpm check-types
pnpm format
```

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

Commercial licensing inquiries: ankit@sejw.al

## Contributing

PRs are not currently accepted — see [`CONTRIBUTING.md`](CONTRIBUTING.md). Issues, bug reports, and design feedback are welcome.

## Security

For security issues, please don't open a public issue. See [`SECURITY.md`](SECURITY.md).
