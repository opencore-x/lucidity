# @lucidity/daemon — Lucid, the local daemon

Lucid is Lucidity's always-on **personal agent**: a small, local, headless daemon that proactively works
your tasks for you. It runs on your own machine, on your own Claude subscription (no API key, $0 marginal),
and reaches you through native notifications and an interactive terminal chat.

```
cron ─▶ daemon assembles a prompt from your real tasks ─▶ `claude --print` (your Pro/Max plan)
     ─▶ Lucid's reply ─▶ delivered (macOS notification) + logged + remembered
```

It's a thin orchestrator (config, scheduler, per-lane queue, run log, delivery, jobs) on top of
[`@lucidity/runtime`](../../packages/runtime) (the stateless prompt/executor "brain"). AGPL-3.0.

## How it works (the free-tier model)

The daemon does **not** use an Anthropic API key. It shells out to the official **`claude --print`** CLI,
which runs on your Claude Pro/Max subscription. The executor sanitizes its environment (unsets
`ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN`) so it always rides the subscription, never a billed key.

> ⚠️ Since 2026-06-15, `claude -p` on a subscription draws from a separate monthly Agent SDK credit — it's
> not unlimited. The daemon is frugal by design (a couple of model calls per day). Set `"reflect": false`
> to halve the daily cost (skips the post-briefing memory update).

## Prerequisites

- **Node 18+** and this monorepo built (`pnpm install` at the root).
- **Claude Code CLI** installed and logged in (`claude` on your PATH; run `claude` once to authenticate, or
  `claude setup-token` for a headless host).
- **macOS** for notification delivery + the `install` (launchd) command. Other platforms can still use
  `--deliver stdout` and run the scheduler in the foreground.
- A **Lucidity API key** (`luc_…`) from the app: Settings → API Key.
- Optional: **`terminal-notifier`** (`brew install terminal-notifier`) so notifications show the Lucidity
  name + logo. Without it, delivery falls back to `osascript` (a generic icon).

## Setup

Create `~/.lucidity/config.json` (chmod 600 — it holds your key):

```jsonc
{
  "apiKey": "luc_xxx",              // required; from Lucidity → Settings → API Key
  "apiUrl": "http://localhost:3000",// API base URL (default shown)
  "briefingTime": "08:00",          // daily briefing, 24h HH:MM
  "model": "sonnet",                // optional; "haiku" to stay frugal
  "timezone": "Asia/Kolkata",       // optional; IANA name (default: system tz)
  "delivery": "macos",              // "macos" | "stdout"  (default macos on macOS)
  "vaultPath": "~/.lucidity/vault", // optional; where Lucid's memory files live
  "reflect": true,                  // optional; update MEMORY.md after each briefing
  "weeklyReview": true,             // optional; run the weekly review
  "weeklyReviewDay": "sun",         // optional; sun..sat or 0-6
  "weeklyReviewTime": "18:00",      // optional; 24h HH:MM
  "chatPort": 4849                  // optional; loopback chat-server port
}
```

```sh
chmod 600 ~/.lucidity/config.json
```

## Commands

The `lucidity` command (and the `lucidity-daemon` alias) is the entry point. `install` links it onto your PATH.

| Command | What it does |
|---|---|
| `lucidity install` | Register the macOS LaunchAgent (runs at login, keeps alive), link the `lucidity` CLI, generate the notifier app. Re-run to upgrade/restart. |
| `lucidity uninstall` | Stop and remove the LaunchAgent. |
| `lucidity status` | Whether the daemon is installed and running. |
| `lucidity chat` | Talk to Lucid in your terminal — memory-aware, multi-turn, streamed. Ctrl-C / Ctrl-D to exit. |
| `lucidity --run-now briefing` | Run today's briefing once, now. |
| `lucidity --run-now weekly-review` | Run the weekly review once, now. |
| `lucidity --deliver stdout` | Override the delivery channel for a `--run-now` (e.g. print instead of notify). |
| `lucidity` *(no args)* | Run the scheduler + chat server in the foreground (the LaunchAgent normally does this). |

## Jobs

- **Daily briefing** (`briefingTime`, default 08:00) — a short, prioritized briefing from your today/overdue
  tasks (`GET /api/tasks/today`), in Lucid's voice. Afterward (if `reflect`), Lucid notes durable facts about
  you into `MEMORY.md`.
- **Weekly review** (`weeklyReviewDay`/`Time`, default Sun 18:00) — a reflective look at the week from
  `GET /api/tasks/week` + `/api/tasks/stats`.

Jobs serialize on a per-lane queue (never two `claude` runs on one lane at once) and append to the run log.

## Interactive chat (lite local gateway)

`lucidity chat` connects to a loopback HTTP/SSE server the daemon hosts on `127.0.0.1:<chatPort>` (token auth
via `~/.lucidity/chat-token`). Each turn streams Lucid's reply; the conversation resumes across turns via
`claude -p --resume`, and Lucid sees your persona + memory + a snapshot of today's tasks. Local-only by design
(free chat must run where your Claude subscription is); phone chat is a future Pro-tier feature.

## Where everything lives (`~/.lucidity/`)

```
config.json        your config (chmod 600)
chat-token         local chat-server auth token (chmod 600)
runs/<date>.jsonl  append-only run history (status, duration, cost, delivery)
logs/              daemon.out.log / daemon.err.log (launchd output)
vault/
  SOUL.md          Lucid's persona (seeded from the default; edit to taste)
  MEMORY.md        durable facts Lucid remembers about you (files-as-truth)
  sessions/        per-run transcripts (briefing / weekly-review)
Lucidity.app       generated bundle so notifications show the Lucidity icon + name
```

These are **yours and local** — none of it is committed to the repo.

## Troubleshooting

- **`Claude Code CLI not found`** — `claude` isn't on PATH. Install Claude Code; under launchd the PATH is
  baked at `install` time, so re-run `lucidity install` after installing `claude`.
- **`No config found` / `"apiKey" must start with "luc_"`** — create/fix `~/.lucidity/config.json`.
- **`Could not reach Lucid…`** (from `lucidity chat`) — the daemon isn't running; `lucidity install` (or run
  `lucidity` in a terminal to host it in the foreground).
- **Notification shows a generic icon** — `brew install terminal-notifier`, then `lucidity install`.
- **Out of quota** — `claude -p` hit your subscription's Agent SDK credit; it resets monthly. Consider
  `"model": "haiku"` and/or `"reflect": false`.

## Not included

Phone push (deferred — iOS needs the paid Apple Developer Program), a hosted/Pro executor, and the full notes
vault. See the plan docs for the roadmap.
