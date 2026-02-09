import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest } from '../client.js';

interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

function formatComment(c: Comment): string {
  const sourceLabel = c.source === 'claude' ? ' (AI)' : '';
  const date = new Date(c.createdAt).toLocaleDateString();
  return `[${date}${sourceLabel}] ${c.content}`;
}

export function registerCommentTools(server: McpServer) {
  server.tool(
    'list_comments',
    'List comments on a task.',
    {
      task_id: z.string().describe('Task ID to list comments for'),
    },
    async ({ task_id }) => {
      const comments = await apiRequest<Comment[]>(
        `/api/tasks/${task_id}/comments`,
      );

      const summary =
        comments.length === 0
          ? 'No comments on this task.'
          : comments.map((c) => `- ${formatComment(c)} [${c.id}]`).join('\n');

      return {
        content: [
          {
            type: 'text' as const,
            text: `${comments.length} comment(s):\n\n${summary}`,
          },
        ],
      };
    },
  );

  server.tool(
    'create_comment',
    'Add a comment to a task.',
    {
      task_id: z.string().describe('Task ID to comment on'),
      content: z.string().describe('Comment content (supports markdown)'),
      source: z
        .enum(['user', 'claude'])
        .optional()
        .describe("Comment source: 'user' (default) or 'claude' for AI-generated comments"),
    },
    async ({ task_id, content, source }) => {
      const body: Record<string, unknown> = { content };
      if (source) body['source'] = source;

      const comment = await apiRequest<Comment>(
        `/api/tasks/${task_id}/comments`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: `Added comment: ${formatComment(comment)} [${comment.id}]`,
          },
        ],
      };
    },
  );
}
