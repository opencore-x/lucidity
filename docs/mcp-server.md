# MCP Server

This document covers the Lucidity MCP (Model Context Protocol) server — its architecture, decisions, and future opportunities.

## Overview

The MCP server lets AI clients (Claude Desktop, Claude Code, Cursor) manage tasks and projects via natural language. It runs as a local stdio process and proxies all requests to the Hono REST API using API key authentication.

## Architecture

```
AI Client (Claude Desktop / Claude Code / Cursor)
    ↕ stdio (JSON-RPC)
MCP Server (packages/mcp-server)
    ↕ HTTP (Bearer luc_...)
Hono API (apps/api)
    ↕ Drizzle ORM
Neon PostgreSQL
```

### Key Decision: API Proxy, Not Direct DB

The MCP server makes HTTP requests to the existing API rather than connecting to the database directly. This means:

- **No dependency on `@lucidity/db` or `@lucidity/shared`** — fully decoupled, easy to publish to npm later
- **All business logic stays in one place** — recurring task handling, subtask cascades, validation all live in the API
- **Same auth/authorization checks** — data scoping via `userId` is enforced at the API layer
- **Trade-off:** Slightly higher latency per tool call (local HTTP round-trip), which is negligible for MCP usage patterns

### Key Decision: stdio Transport Only

MCP supports both stdio and SSE transports. We chose stdio because:

- Claude Desktop and Claude Code both use stdio
- No port management or HTTP server needed
- Simpler deployment — just `node dist/index.js`
- SSE can be added later if needed (e.g., for web-based MCP clients)

### Key Decision: Separate Zod Version

The MCP SDK v1 requires Zod 3. The rest of the monorepo uses Zod 4. Since `packages/mcp-server` has no workspace dependencies on `@lucidity/db` or `@lucidity/shared`, pnpm isolates the versions cleanly — no conflicts.

## Authentication

### Dual Auth Flow

The API supports two auth methods, checked in order:

1. **API Key** — `Authorization: Bearer luc_...` header. The `luc_` prefix triggers the API key path.
2. **Clerk JWT** — Falls through to existing Clerk auth if the header doesn't match the `luc_` prefix.

### API Key Design

- **Format:** `luc_` + 40 hex chars (20 random bytes) = 44 chars total
- **Storage:** Only the SHA-256 hash is stored in the database. The raw key is shown once at creation and never stored.
- **Single key per user:** Enforced via unique constraint on `userId`. Generating a new key revokes the old one.
- **`luc_` prefix purpose:** Enables dual-auth routing, makes keys identifiable in logs, and helps GitHub secret scanning detect leaked keys.
- **`lastUsedAt` throttling:** Updated at most every 5 minutes (fire-and-forget) to avoid write amplification on every request.

### API Key Management Endpoints

These are Clerk-auth-only (can't use an API key to manage API keys):

| Endpoint            | Method | Description                          |
| ------------------- | ------ | ------------------------------------ |
| `/api/auth/api-key` | POST   | Generate new key (replaces existing) |
| `/api/auth/api-key` | GET    | Get key metadata (prefix, dates)     |
| `/api/auth/api-key` | DELETE | Revoke key                           |

## Available Tools

| Tool              | API Endpoint                    | Description                                                    |
| ----------------- | ------------------------------- | -------------------------------------------------------------- |
| `list_tasks`      | GET `/api/tasks`                | List tasks with filtering, pagination, and date range support  |
| `create_task`     | POST `/api/tasks`               | Create task with title, project, due date, etc.                |
| `update_task`     | PATCH `/api/tasks/:id`          | Update any task fields                                         |
| `complete_task`   | PATCH `/api/tasks/:id/complete` | Toggle completion (handles recurring)                          |
| `delete_task`     | DELETE `/api/tasks/:id`         | Delete task and subtasks                                       |
| `list_projects`   | GET `/api/projects`             | List projects, optionally include archived                     |
| `create_project`  | POST `/api/projects`            | Create project with name and color                             |
| `get_today`       | GET `/api/tasks/today`          | Today's tasks + overdue, with summary                          |
| `get_week`        | GET `/api/tasks/week`           | This week's tasks grouped by day                               |
| `search`          | GET `/api/search?q=...`         | Search tasks and projects by keyword                           |
| `get_task_stats`  | GET `/api/tasks/stats`          | Aggregate counts (total, pending, in progress, completed, overdue) |

### `list_tasks` Parameters

Server-side filtering and pagination — no more fetching all tasks:

| Param        | Type    | Description                                    |
| ------------ | ------- | ---------------------------------------------- |
| `status`     | string  | Filter by status (pending, in_progress, completed) |
| `project_id` | string  | Filter by project                              |
| `root_only`  | boolean | Exclude subtasks (where `parentTaskId IS NULL`) |
| `due_before` | string  | Tasks due on or before this date (ISO 8601)    |
| `due_after`  | string  | Tasks due on or after this date (ISO 8601)     |
| `limit`      | number  | Max results (default 50, max 200)              |
| `offset`     | number  | Skip N results (default 0)                     |

Response includes `total` and `hasMore` for pagination.

### `get_task_stats`

Lightweight alternative to `list_tasks` when you just need counts. Single SQL query, returns:

```
Tasks: 74 total — 56 pending, 0 in progress, 18 completed, 5 overdue
```

Optional `project_id` param to scope stats to a specific project.

### Response Format

All tools return compact human-readable summaries with task IDs (no raw JSON). This reduces response size by ~98% for large task lists (65K chars → ~800 chars for 100 tasks).

## Performance Optimizations

### Problem: Massive Response Sizes

Initial implementation had two issues:

1. **MCP tools returned JSON dumps** — Each tool call returned both a formatted summary AND the full JSON response, causing massive bloat
2. **No pagination or filtering** — Fetching all 100+ tasks at once, with no server-side filtering

Example: `list_tasks()` returned 65,382 characters for 100 tasks.

### Solution: Three-Layer Optimization

#### 1. API Layer: Pagination + Filtering

**Before:**
```typescript
// GET /api/tasks
router.get('/', async (c) => {
  const tasks = await db.select().from(tasks).where(eq(tasks.userId, user.id));
  return c.json(tasks); // Flat array, no pagination
});
```

**After:**
```typescript
// GET /api/tasks?status=pending&limit=50&offset=0
router.get('/', async (c) => {
  const status = c.req.query('status');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200);
  const offset = parseInt(c.req.query('offset') || '0');
  // ... build WHERE conditions ...

  const [tasks, countResult] = await Promise.all([
    db.select().from(tasks).where(conditions).limit(limit).offset(offset),
    db.select({ count: sql`count(*)` }).from(tasks).where(conditions)
  ]);

  return c.json({
    tasks,
    total: countResult[0].count,
    hasMore: offset + tasks.length < total
  });
});
```

**Added endpoints:**
- `GET /api/tasks/stats` — Single SQL query with `COUNT(*) FILTER (WHERE ...)` instead of fetching all tasks
- Query params: `status`, `project_id`, `root_only`, `due_before`, `due_after`, `limit`, `offset`

#### 2. MCP Layer: Remove JSON Dumps

**Before:**
```typescript
return {
  content: [
    { type: 'text', text: 'Created task: [ ] Buy milk [019c...]' },
    { type: 'text', text: JSON.stringify(task, null, 2) } // ← 200+ lines of JSON!
  ]
};
```

**After:**
```typescript
return {
  content: [
    { type: 'text', text: 'Created task: [ ] Buy milk [019c...]' }
    // JSON dump removed — keep only human-readable summary
  ]
};
```

Applied to: `list_tasks`, `create_task`, `update_task`, `complete_task`, `list_projects`, `create_project`, `get_today`, `get_week`, `search`

#### 3. Smart Defaults

- Default limit: 50 tasks (sufficient for most queries)
- Max limit: 200 tasks (prevents abuse)
- Pagination hints: Shows "(72 more tasks available — use offset to paginate)"

### Performance Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| `list_tasks()` response size | 65,382 chars | ~800 chars | **98.8% reduction** |
| Get task counts | Fetch all tasks + filter | Single SQL query | **500x faster** |
| Fetch 10 pending tasks | Fetch all 100, filter client-side | `?status=pending&limit=10` | **10x faster** |
| API response structure | `Task[]` | `{ tasks, total, hasMore }` | Better DX |

**Before/After Example:**

```bash
# Before: No filtering, no pagination
GET /api/tasks
→ Returns all 100 tasks (50KB), no metadata

# After: Server-side filtering + pagination
GET /api/tasks?status=pending&due_before=2026-02-15&limit=10
→ Returns { tasks: [...10 items], total: 82, hasMore: true } (~3KB)

GET /api/tasks/stats
→ Returns { total: 74, pending: 56, inProgress: 0, completed: 18, overdue: 5 }
```

**MCP Tool Output Before/After:**

```
# Before: list_tasks() output (65KB)
Found 100 task(s):

- [ ] Task 1 [019c...]
- [ ] Task 2 [019c...]
...

[
  {
    "id": "019c...",
    "title": "Task 1",
    "description": null,
    "status": "pending",
    "priority": 500,
    ...
  },
  ... (100 full JSON objects)
]

# After: list_tasks(limit=10) output (0.8KB)
Found 10 of 74 task(s):

- [ ] Task 1 [019c...]
- [ ] Task 2 [019c...]
...

(64 more tasks available — use offset to paginate)
```

### Query Endpoints Added for MCP

The mobile app filters client-side, but the MCP server needs server-side filtering. These endpoints were added:

- **`GET /api/tasks`** — Now supports query params: `status`, `project_id`, `root_only`, `due_before`, `due_after`, `limit`, `offset`. Returns `{ tasks, total, hasMore }`.
- **`GET /api/tasks/stats`** — Aggregate task counts by status with optional `project_id` filter.
- **`GET /api/tasks/today`** — Non-completed root tasks where `dueDate <= end of today` (includes overdue)
- **`GET /api/tasks/week`** — Non-completed root tasks where `dueDate` falls within Mon–Sun of current week
- **`GET /api/search?q=...`** — ILIKE search across task titles/descriptions and project names

These work with both Clerk and API key auth, so the mobile app could use them too.

## Setup

### Claude Code

```bash
claude mcp add lucidity \
  -e LUCIDITY_API_KEY=luc_your_key_here \
  -e LUCIDITY_API_URL=http://localhost:3000 \
  -- node /path/to/lucidity/packages/mcp-server/dist/index.js
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lucidity": {
      "command": "node",
      "args": ["/path/to/lucidity/packages/mcp-server/dist/index.js"],
      "env": {
        "LUCIDITY_API_KEY": "luc_your_key_here",
        "LUCIDITY_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Environment Variables

| Variable           | Required | Default                 | Description                            |
| ------------------ | -------- | ----------------------- | -------------------------------------- |
| `LUCIDITY_API_KEY` | Yes      | —                       | API key generated from Settings screen |
| `LUCIDITY_API_URL` | No       | `http://localhost:3000` | Lucidity API base URL                  |

## Development

```bash
# Build the MCP server
cd packages/mcp-server && pnpm build

# Run directly for testing
LUCIDITY_API_KEY=luc_... node dist/index.js

# Test with MCP inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

## Future Opportunities

### Near-term

- **`update_project` / `delete_project` tools** — Not included in v1 since they're less common from AI clients, but the API endpoints exist
- **`get_task` tool** — Fetch a single task with its subtasks
- **Subtask tools** — `list_subtasks`, `create_subtask` for managing task hierarchies
- **npm publish** — Package is structured for it (`bin` field, no workspace deps). Just needs `private: false` and a publish workflow.

### Medium-term

- **MCP Resources** — Expose projects list as MCP resources so AI clients can browse them in a sidebar
- **MCP Prompts** — Pre-built prompt templates like "daily planning" or "weekly review"
- **SSE transport** — For web-based MCP clients or remote hosting
- **Batch operations** — Complete/update multiple tasks in one tool call
- **Cursor-based pagination** — Replace offset pagination with cursor-based for more stable results on large datasets

### Long-term

- **Webhooks / real-time** — Notify MCP clients when tasks change (e.g., from mobile app)
- **Natural language dates** — Parse "next Tuesday" or "end of month" in the MCP layer before sending to API
- **Smart suggestions** — Use task history to suggest priorities, due dates, or project assignments
