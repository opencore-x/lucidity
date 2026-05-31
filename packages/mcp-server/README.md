# @lucidity/mcp-server

MCP server for managing Lucidity tasks and projects from AI clients.

## Installation

### 1. Generate API Key
In the Lucidity mobile app: **Settings > API Key > Generate**

### 2. Build the MCP Server
```bash
cd packages/mcp-server
pnpm build
```

### 3. Link Globally (Development)
```bash
# From the mcp-server directory
pnpm link --global
```

This makes the `lucidity-mcp` command available globally without publishing to npm.

### 4. Add to Claude Code
Add the MCP server with `--scope user` to make it available across all projects:

```bash
claude mcp add lucidity \
  --scope user \
  -e LUCIDITY_API_KEY=luc_your_api_key_here \
  -e LUCIDITY_API_URL=https://api.lucidity.my \
  -- lucidity-mcp
```

For local development against localhost:
```bash
claude mcp add lucidity \
  --scope user \
  -e LUCIDITY_API_KEY=luc_your_api_key_here \
  -e LUCIDITY_API_URL=http://localhost:3000 \
  -- lucidity-mcp
```

**Scope options:**
- `--scope user` - Available across all projects (recommended)
- `--scope local` - Available only in current project (default)
- `--scope project` - Shared with team via `.mcp.json` file

### 5. Restart Claude Code
Close and reopen Claude Code for the changes to take effect.

## Verifying Installation

After installation with `--scope user`, the lucidity MCP server works from any directory:

```bash
# Check if the command is available
which lucidity-mcp

# Check user-scoped MCP configuration
cat ~/.claude.json | grep -A 10 lucidity
```

## Uninstalling

To remove the global link:
```bash
cd packages/mcp-server
pnpm unlink --global
```

To remove from Claude Code:
```bash
claude mcp remove lucidity
```

## Tools

- **Tasks:** `list_tasks` `create_task` `update_task` `complete_task` `delete_task` `mark_task_reviewed`
- **Projects:** `list_projects` `create_project` `update_project`
- **Milestones:** `list_milestones` `create_milestone` `update_milestone` `delete_milestone` `get_milestone_progress`
- **Comments:** `list_comments` `create_comment`
- **Queries:** `get_today` `get_week` `search` `get_task_stats` `get_unreviewed_tasks`

## Docs

See [/docs/mcp-server.md](../../docs/mcp-server.md) for architecture decisions, auth design, and future opportunities.
