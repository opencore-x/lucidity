# @lucidity/mcp-server

MCP server for managing Lucidity tasks and projects from AI clients.

## Quick Start

1. Generate an API key in the Lucidity mobile app: **Settings > API Key > Generate**
2. Add to Claude Code:
   ```bash
   claude mcp add lucidity \
     -e LUCIDITY_API_KEY=luc_your_key \
     -e LUCIDITY_API_URL=http://localhost:3000 \
     -- node /path/to/packages/mcp-server/dist/index.js
   ```
3. Restart Claude Code

## Tools

`list_tasks` `create_task` `update_task` `complete_task` `delete_task` `list_projects` `create_project` `get_today` `get_week` `search`

## Docs

See [/docs/mcp-server.md](../../docs/mcp-server.md) for architecture decisions, auth design, and future opportunities.
