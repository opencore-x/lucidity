import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest } from '../client.js';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: number;
  position: number | null;
  taskNumber: number | null;
  dueDate: string | null;
  completedAt: string | null;
  recurringFrequency: string | null;
  reviewedAt: string | null;
  projectId: string | null;
  parentTaskId: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatTask(t: Task): string {
  const statusMap: Record<string, string> = {
    completed: '[x]',
    blocked: '[!]',
    deferred: '[-]',
    in_progress: '[~]',
  };
  const status = statusMap[t.status ?? ''] ?? '[ ]';
  const num = t.taskNumber != null ? ` #${t.taskNumber}` : '';
  const due = t.dueDate
    ? ` (due: ${new Date(t.dueDate).toLocaleDateString()})`
    : '';
  const recurring = t.recurringFrequency ? ` 🔁${t.recurringFrequency}` : '';
  return `${status} ${t.title}${num}${due}${recurring}`;
}

export function registerTaskTools(server: McpServer) {
  server.tool(
    'list_tasks',
    'List tasks with server-side filtering and pagination. Returns task IDs for use with other tools.',
    {
      status: z
        .enum(['pending', 'in_progress', 'completed', 'blocked', 'deferred'])
        .optional()
        .describe('Filter by task status'),
      project_id: z.string().optional().describe('Filter by project ID'),
      milestone_id: z.string().optional().describe('Filter by milestone ID'),
      task_number: z
        .number()
        .optional()
        .describe('Filter by task number within a project (use with project_id)'),
      root_only: z
        .boolean()
        .optional()
        .describe('Only show root tasks, exclude subtasks (default: false)'),
      due_before: z
        .string()
        .optional()
        .describe('Tasks due on or before this date (ISO 8601)'),
      due_after: z
        .string()
        .optional()
        .describe('Tasks due on or after this date (ISO 8601)'),
      limit: z
        .number()
        .optional()
        .describe('Max results to return (default 50, max 200)'),
      offset: z
        .number()
        .optional()
        .describe('Number of results to skip (default 0)'),
    },
    async ({ status, project_id, milestone_id, task_number, root_only, due_before, due_after, limit, offset }) => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (project_id) params.set('project_id', project_id);
      if (milestone_id) params.set('milestone_id', milestone_id);
      if (task_number !== undefined) params.set('task_number', String(task_number));
      if (root_only) params.set('root_only', 'true');
      if (due_before) params.set('due_before', due_before);
      if (due_after) params.set('due_after', due_after);
      if (limit !== undefined) params.set('limit', String(limit));
      if (offset !== undefined) params.set('offset', String(offset));

      const qs = params.toString();
      const result = await apiRequest<{ tasks: Task[]; total: number; hasMore: boolean }>(
        `/api/tasks${qs ? `?${qs}` : ''}`,
      );

      const summary =
        result.tasks.length === 0
          ? 'No tasks found.'
          : result.tasks.map((t) => `- ${formatTask(t)} [${t.id}]`).join('\n');

      let text = `Found ${result.tasks.length} of ${result.total} task(s):\n\n${summary}`;
      if (result.hasMore) {
        text += `\n\n(${result.total - (offset ?? 0) - result.tasks.length} more tasks available — use offset to paginate)`;
      }

      return {
        content: [{ type: 'text' as const, text }],
      };
    },
  );

  server.tool(
    'create_task',
    'Create a new task.',
    {
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description (supports markdown)'),
      project_id: z.string().optional().describe('Project ID to assign to'),
      milestone_id: z
        .string()
        .optional()
        .describe('Milestone ID to assign to'),
      parent_task_id: z
        .string()
        .optional()
        .describe('Parent task ID (for subtasks)'),
      due_date: z
        .string()
        .optional()
        .describe('Due date in ISO 8601 format (e.g. 2025-01-15)'),
      priority: z
        .number()
        .optional()
        .describe('Priority (1-1000, default 500)'),
      recurring_frequency: z
        .enum(['daily', 'weekly', 'monthly', 'yearly'])
        .optional()
        .describe('Recurring frequency (requires due_date)'),
    },
    async ({
      title,
      description,
      project_id,
      milestone_id,
      parent_task_id,
      due_date,
      priority,
      recurring_frequency,
    }) => {
      const body: Record<string, unknown> = { title };
      if (description) body['description'] = description;
      if (project_id) body['projectId'] = project_id;
      if (milestone_id) body['milestoneId'] = milestone_id;
      if (parent_task_id) body['parentTaskId'] = parent_task_id;
      if (due_date) body['dueDate'] = due_date;
      if (priority !== undefined) body['priority'] = priority;
      if (recurring_frequency)
        body['recurringFrequency'] = recurring_frequency;

      const task = await apiRequest<Task>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Created task: ${formatTask(task)} [${task.id}]`,
          },
        ],
      };
    },
  );

  server.tool(
    'update_task',
    'Update an existing task.',
    {
      id: z.string().describe('Task ID to update'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description (supports markdown)'),
      status: z
        .enum(['pending', 'in_progress', 'completed', 'blocked', 'deferred'])
        .optional()
        .describe('New status'),
      project_id: z.string().optional().describe('New project ID'),
      milestone_id: z
        .string()
        .optional()
        .describe('New milestone ID (use empty string to unset)'),
      due_date: z
        .string()
        .optional()
        .describe('New due date in ISO 8601 format'),
      priority: z.number().optional().describe('New priority (1-1000)'),
      recurring_frequency: z
        .enum(['daily', 'weekly', 'monthly', 'yearly'])
        .optional()
        .describe('New recurring frequency'),
    },
    async ({
      id,
      title,
      description,
      status,
      project_id,
      milestone_id,
      due_date,
      priority,
      recurring_frequency,
    }) => {
      const body: Record<string, unknown> = {};
      if (title) body['title'] = title;
      if (description !== undefined) body['description'] = description;
      if (status) body['status'] = status;
      if (project_id) body['projectId'] = project_id;
      if (milestone_id !== undefined)
        body['milestoneId'] = milestone_id || null;
      if (due_date !== undefined) body['dueDate'] = due_date;
      if (priority !== undefined) body['priority'] = priority;
      if (recurring_frequency !== undefined)
        body['recurringFrequency'] = recurring_frequency;

      const task = await apiRequest<Task>(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Updated task: ${formatTask(task)} [${task.id}]`,
          },
        ],
      };
    },
  );

  server.tool(
    'complete_task',
    'Toggle task completion. For recurring tasks, this advances to the next occurrence.',
    {
      id: z.string().describe('Task ID to complete/uncomplete'),
    },
    async ({ id }) => {
      const task = await apiRequest<Task>(`/api/tasks/${id}/complete`, {
        method: 'PATCH',
      });

      const action =
        task.status === 'completed' ? 'Completed' : 'Reopened';
      return {
        content: [
          {
            type: 'text' as const,
            text: `${action} task: ${formatTask(task)} [${task.id}]`,
          },
        ],
      };
    },
  );

  server.tool(
    'delete_task',
    'Delete a task and all its subtasks.',
    {
      id: z.string().describe('Task ID to delete'),
    },
    async ({ id }) => {
      await apiRequest(`/api/tasks/${id}`, { method: 'DELETE' });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Deleted task ${id} and all subtasks.`,
          },
        ],
      };
    },
  );

  server.tool(
    'mark_task_reviewed',
    'Mark a task as reviewed by AI. Sets reviewedAt timestamp so it won\'t appear in unreviewed lists.',
    {
      id: z.string().describe('Task ID to mark as reviewed'),
    },
    async ({ id }) => {
      const task = await apiRequest<Task>(`/api/tasks/${id}/review`, {
        method: 'PATCH',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Marked as reviewed: ${formatTask(task)} [${task.id}]`,
          },
        ],
      };
    },
  );
}
