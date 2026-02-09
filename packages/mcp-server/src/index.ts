#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTaskTools } from './tools/tasks.js';
import { registerProjectTools } from './tools/projects.js';
import { registerQueryTools } from './tools/queries.js';
import { registerMilestoneTools } from './tools/milestones.js';
import { registerCommentTools } from './tools/comments.js';

const server = new McpServer({
  name: 'lucidity',
  version: '0.1.0',
});

registerTaskTools(server);
registerProjectTools(server);
registerQueryTools(server);
registerMilestoneTools(server);
registerCommentTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
