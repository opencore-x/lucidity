import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest } from '../client.js';

interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MilestoneProgress {
  milestoneId: string;
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  blocked: number;
  deferred: number;
  percent: number;
}

function formatMilestone(m: Milestone): string {
  const due = m.dueDate
    ? ` (due: ${new Date(m.dueDate).toLocaleDateString()})`
    : '';
  return `${m.name}${due}`;
}

function progressBar(percent: number, width = 20): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percent}%`;
}

export function registerMilestoneTools(server: McpServer) {
  server.tool(
    'list_milestones',
    'List milestones, optionally filtered by project.',
    {
      project_id: z.string().optional().describe('Filter by project ID'),
    },
    async ({ project_id }) => {
      const qs = project_id ? `?project_id=${project_id}` : '';
      const milestones = await apiRequest<Milestone[]>(`/api/milestones${qs}`);

      const summary =
        milestones.length === 0
          ? 'No milestones found.'
          : milestones
              .map((m) => `- ${formatMilestone(m)} [${m.id}]`)
              .join('\n');

      return {
        content: [
          {
            type: 'text' as const,
            text: `Found ${milestones.length} milestone(s):\n\n${summary}`,
          },
        ],
      };
    },
  );

  server.tool(
    'create_milestone',
    'Create a new milestone for a project.',
    {
      project_id: z.string().describe('Project ID to create milestone for'),
      name: z.string().describe('Milestone name'),
      description: z.string().optional().describe('Milestone description'),
      due_date: z
        .string()
        .optional()
        .describe('Due date in ISO 8601 format (e.g. 2025-06-30)'),
    },
    async ({ project_id, name, description, due_date }) => {
      const body: Record<string, unknown> = { projectId: project_id, name };
      if (description) body['description'] = description;
      if (due_date) body['dueDate'] = due_date;

      const milestone = await apiRequest<Milestone>('/api/milestones', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Created milestone: ${formatMilestone(milestone)} [${milestone.id}]`,
          },
        ],
      };
    },
  );

  server.tool(
    'update_milestone',
    'Update an existing milestone.',
    {
      id: z.string().describe('Milestone ID to update'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
      due_date: z
        .string()
        .optional()
        .describe('New due date in ISO 8601 format'),
    },
    async ({ id, name, description, due_date }) => {
      const body: Record<string, unknown> = {};
      if (name) body['name'] = name;
      if (description !== undefined) body['description'] = description;
      if (due_date !== undefined) body['dueDate'] = due_date;

      const milestone = await apiRequest<Milestone>(`/api/milestones/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Updated milestone: ${formatMilestone(milestone)} [${milestone.id}]`,
          },
        ],
      };
    },
  );

  server.tool(
    'delete_milestone',
    'Delete a milestone. Tasks assigned to this milestone will be unlinked but not deleted.',
    {
      id: z.string().describe('Milestone ID to delete'),
    },
    async ({ id }) => {
      await apiRequest(`/api/milestones/${id}`, { method: 'DELETE' });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Deleted milestone ${id}. Tasks previously in this milestone still exist.`,
          },
        ],
      };
    },
  );

  server.tool(
    'get_milestone_progress',
    'Get completion progress for a milestone. Shows task counts by status and a visual progress bar.',
    {
      id: z.string().describe('Milestone ID'),
    },
    async ({ id }) => {
      const progress = await apiRequest<MilestoneProgress>(
        `/api/milestones/${id}/progress`,
      );

      const bar = progressBar(progress.percent);
      const text = [
        `Milestone progress: ${bar}`,
        `${progress.completed}/${progress.total} tasks completed`,
        `  Pending: ${progress.pending} | In Progress: ${progress.inProgress} | Blocked: ${progress.blocked} | Deferred: ${progress.deferred}`,
      ].join('\n');

      return {
        content: [{ type: 'text' as const, text }],
      };
    },
  );
}
