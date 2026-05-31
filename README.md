# Lucidity

> Your personal assistant. The interesting part is what happens when two of them meet.

[![License](https://img.shields.io/badge/license-AGPL--3.0%20%2F%20Commercial-blue)](LICENSE) · [lucidity.my](https://lucidity.my)

**Status:** Active development, building in public. Some of what's described below works today; some is documented design that hasn't shipped yet. See [Shipped](#shipped) and [On the roadmap](#on-the-roadmap) for the honest split.

---

## What Lucidity is

A personal assistant — named **Lucid** by default — that runs on your hardware and uses the AI you already pay for. Today she manages your life: tasks, projects, milestones, sub-tasks, recurring schedules, and comments, across mobile and web. Talk to her through Claude Desktop, Claude Code, Codex, or Cursor by plugging in the MCP server, or use the apps directly.

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

## Tasks today, life-graph tomorrow

Tasks are the entry point, not the destination. The next pillar is a **markdown notes vault you own** — real `.md` files on your device, the way Obsidian works, except the notes link to your tasks and projects and Lucid can read and write them.

- **Files are the source of truth.** A note is a plain `.md` file in a folder; the database is only a derived, regenerable index. If the two ever disagree, the files win.
- **Your notes never have to leave your device.** Most task apps are cloud-by-default; the vault is local-first by design.
- **Agents are filesystem-native.** `claude --print "summarise my notes"` over the folder just works — the folder *is* the API.

A note linking to a note linking to a task linking to a project *is* the life-graph. That's the direction. (Design stage — see the roadmap.)

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
- Web app with Kanban, theme toggle, settings _(being superseded by a desktop app — see roadmap)_

## On the roadmap

- Markdown notes vault — files-as-truth `.md` files, wikilinks, and a notes ↔ tasks graph (the life-graph)
- Desktop app (Tauri/Electron) — direct vault access; runs the daemon in-process and hosts the CLI; supersedes the web app
- `lucidity` CLI over the vault
- Daily briefing (pull via MCP)
- Local always-on daemon (free self-host tier)
- Server-side scheduled actions (paid tier)
- Agent-mediated comms with trust gradients
- Bring-your-own-sync (iCloud / Google Drive / Git), plus hosted vault sync (Pro)
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
- **Clients**: mobile, a desktop app, and a `lucidity` CLI. The desktop app — replacing the web app — has real filesystem access: it reads the vault directly, runs the daemon in-process, and hosts the CLI.

## Connect your AI (BYOAI)

The MCP server (`@lucidity/mcp-server`) exposes your tasks, projects, milestones, and today/week views to any MCP-capable client — Claude Desktop, Claude Code, Codex, Cursor. You bring the AI plan you already pay for; Lucidity brings the context.

1. **Generate an API key** in the app (Settings → API keys) — it looks like `luc_…`.
2. **Build the server** (not yet published to npm):
   ```bash
   pnpm install
   pnpm --filter @lucidity/mcp-server build
   ```
3. **Register it with your client.** For Claude Desktop, add to `claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "lucidity": {
         "command": "node",
         "args": ["/absolute/path/to/lucidity/packages/mcp-server/dist/index.js"],
         "env": {
           "LUCIDITY_API_KEY": "luc_your_key_here"
         }
       }
     }
   }
   ```
4. **Restart the client.** Lucid's tools — `list_tasks`, `create_task`, `complete_task`, `get_today`, `get_week`, `search`, and more — are now available.

`LUCIDITY_API_URL` defaults to `http://localhost:3000`; set it in `env` to point at your Lucidity API — the hosted `https://api.lucidity.my` or a self-hosted instance.

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

### Agent skills

The repo pins a set of [Expo agent skills](https://github.com/vercel-labs/skills) in `skills-lock.json` (committed). The actual skill content in `.agents/skills/` is regenerable cache and is gitignored — like `node_modules` vs a lockfile. `pnpm install` restores it automatically via a `postinstall` hook, or run it directly:

```bash
npx skills install   # restore .agents/skills/ from skills-lock.json
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

## Contact

Commercial licensing, partnerships, or just want to talk: ankit@sejw.al

## Contributing

PRs are not currently accepted — see [`CONTRIBUTING.md`](CONTRIBUTING.md). Issues, bug reports, and design feedback are welcome.

## Security

For security issues, please don't open a public issue. See [`SECURITY.md`](SECURITY.md).
