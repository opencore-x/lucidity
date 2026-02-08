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
  dueDate: string | null;
  completedAt: string | null;
  recurringFrequency: string | null;
  projectId: string | null;
  parentTaskId: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatTask(t: Task): string {
  const status = t.status === 'completed' ? '[x]' : '[ ]';
  const due = t.dueDate
    ? ` (due: ${new Date(t.dueDate).toLocaleDateString()})`
    : '';
  const recurring = t.recurringFrequency ? ` 🔁${t.recurringFrequency}` : '';
  return `${status} ${t.title}${due}${recurring}`;
}

export function registerTaskTools(server: McpServer) {
  server.tool(
    'list_tasks',
    'List all tasks. Optionally filter by status or project ID.',
    {
      status: z
        .enum(['pending', 'in_progress', 'completed'])
        .optional()
        .describe('Filter by task status'),
      project_id: z.string().optional().describe('Filter by project ID'),
    },
    async ({ status, project_id }) => {
      const allTasks = await apiRequest<Task[]>('/api/tasks');

      let filtered = allTasks;
      if (status) {
        filtered = filtered.filter((t) => t.status === status);
      }
      if (project_id) {
        filtered = filtered.filter((t) => t.projectId === project_id);
      }

      const summary =
        filtered.length === 0
          ? 'No tasks found.'
          : filtered.map((t) => `- ${formatTask(t)} [${t.id}]`).join('\n');

      return {
        content: [
          {
            type: 'text' as const,
            text: `Found ${filtered.length} task(s):\n\n${summary}\n\n---\n${JSON.stringify(filtered, null, 2)}`,
          },
        ],
      };
    },
  );

  server.tool(
    'create_task',
    'Create a new task.',
    {
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      project_id: z.string().optional().describe('Project ID to assign to'),
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
      parent_task_id,
      due_date,
      priority,
      recurring_frequency,
    }) => {
      const body: Record<string, unknown> = { title };
      if (description) body['description'] = description;
      if (project_id) body['projectId'] = project_id;
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
            text: `Created task: ${formatTask(task)} [${task.id}]\n\n${JSON.stringify(task, null, 2)}`,
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
      description: z.string().optional().describe('New description'),
      status: z
        .enum(['pending', 'in_progress', 'completed'])
        .optional()
        .describe('New status'),
      project_id: z.string().optional().describe('New project ID'),
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
      due_date,
      priority,
      recurring_frequency,
    }) => {
      const body: Record<string, unknown> = {};
      if (title) body['title'] = title;
      if (description !== undefined) body['description'] = description;
      if (status) body['status'] = status;
      if (project_id) body['projectId'] = project_id;
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
            text: `Updated task: ${formatTask(task)} [${task.id}]\n\n${JSON.stringify(task, null, 2)}`,
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
            text: `${action} task: ${formatTask(task)} [${task.id}]\n\n${JSON.stringify(task, null, 2)}`,
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
}
