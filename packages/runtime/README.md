# @lucidity/runtime — Lucid's brain

Stateless, shared core for **Lucid** (Lucidity's personal agent): prompt assembly + the model-executor seam.
Pure and side-effect-light, so it can be driven by the local daemon today and by the API / a desktop app
later. AGPL-3.0.

It deliberately holds **no I/O or scheduling** — that's the host's job ([`@lucidity/daemon`](../../apps/daemon)).
The runtime just turns data into prompts and runs them through an executor.

## What it provides

**Prompt builders** (pure — data in, `{ systemPrompt, userPrompt }` out):
- `buildBriefingPrompt` — the daily briefing from today/overdue tasks.
- `buildWeeklyReviewPrompt` — a weekly review from week tasks + aggregate stats.
- `buildChatSystemPrompt` — the system prompt for an interactive chat session.
- `buildMemoryReflectionPrompt` — extract new durable facts after a briefing.

**Executor seam** — the one boundary between the brain and the underlying model engine:
- `AgentExecutor` interface (`run` + optional streaming `runStream`).
- `ClaudeCodeExecutor` — the free-tier engine: spawns `claude --print` on the user's Pro/Max subscription,
  with the environment sanitized so it never bills an `ANTHROPIC_API_KEY`. Parses `--output-format json`,
  supports `--resume` for multi-turn chat and stream-json for token streaming.
  (Future: an Anthropic-SDK executor for the Pro tier, a Codex executor — same prompts, different engine.)

**Memory helpers** (pure) — `parseFacts`, `mergeFacts` (dedupe + recency cap), `renderMemoryFile` for the
files-as-truth `MEMORY.md`.

**Persona** — `loadDefaultPersona()` (the bundled Lucid persona; the daemon lets a vault `SOUL.md` override it).

**API client** — `createApiClient({ apiUrl, apiKey })`, a thin authenticated fetch wrapper for the Lucidity REST API.

## Notes

- The persona/identity is **"Lucid"**; the user-facing product brand is **"Lucidity"**.
- A `memory` seam runs through the prompt builders so the daemon can weave in `MEMORY.md` facts.
- `pnpm test` runs the (zero-dependency, `node:test`) unit tests for the pure builders + memory helpers.
