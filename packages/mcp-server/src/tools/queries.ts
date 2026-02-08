import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest } from '../client.js';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: number;
  dueDate: string | null;
  completedAt: string | null;
  recurringFrequency: string | null;
  projectId: string | null;
  parentTaskId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  isArchived: boolean | null;
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

export function registerQueryTools(server: McpServer) {
  server.tool(
    'get_today',
    "Get today's tasks including overdue items. Shows non-completed root tasks due today or earlier.",
    {},
    async () => {
      const tasks = await apiRequest<Task[]>('/api/tasks/today');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdue = tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < today,
      );
      const dueToday = tasks.filter(
        (t) => !t.dueDate || new Date(t.dueDate) >= today,
      );

      let summary = `📅 Today — ${tasks.length} task(s)\n\n`;

      if (overdue.length > 0) {
        summary += `⚠️ Overdue (${overdue.length}):\n`;
        summary += overdue
          .map((t) => `  - ${formatTask(t)} [${t.id}]`)
          .join('\n');
        summary += '\n\n';
      }

      if (dueToday.length > 0) {
        summary += `Today (${dueToday.length}):\n`;
        summary += dueToday
          .map((t) => `  - ${formatTask(t)} [${t.id}]`)
          .join('\n');
      }

      if (tasks.length === 0) {
        summary += 'No tasks due today. You\'re all caught up!';
      }

      return {
        content: [{ type: 'text' as const, text: summary }],
      };
    },
  );

  server.tool(
    'get_week',
    "Get this week's tasks (Monday to Sunday). Shows non-completed root tasks grouped by day.",
    {},
    async () => {
      const tasks = await apiRequest<Task[]>('/api/tasks/week');

      const days = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ];

      // Group by day of week
      const grouped: Record<string, Task[]> = {};
      for (const day of days) {
        grouped[day] = [];
      }

      for (const task of tasks) {
        if (task.dueDate) {
          const date = new Date(task.dueDate);
          // getDay(): 0=Sun, 1=Mon, ... 6=Sat → convert to Mon=0 index
          const dayIndex = (date.getDay() + 6) % 7;
          const dayName = days[dayIndex];
          if (dayName) {
            grouped[dayName]!.push(task);
          }
        }
      }

      let summary = `📋 This Week — ${tasks.length} task(s)\n\n`;

      for (const day of days) {
        const dayTasks = grouped[day]!;
        if (dayTasks.length > 0) {
          summary += `${day} (${dayTasks.length}):\n`;
          summary += dayTasks
            .map((t) => `  - ${formatTask(t)} [${t.id}]`)
            .join('\n');
          summary += '\n\n';
        }
      }

      if (tasks.length === 0) {
        summary += 'No tasks scheduled this week.';
      }

      return {
        content: [{ type: 'text' as const, text: summary }],
      };
    },
  );

  server.tool(
    'search',
    'Search tasks and projects by keyword. Searches task titles, descriptions, and project names.',
    {
      query: z.string().describe('Search query'),
    },
    async ({ query }) => {
      const result = await apiRequest<{ tasks: Task[]; projects: Project[] }>(
        `/api/search?q=${encodeURIComponent(query)}`,
      );

      let summary = `🔍 Search results for "${query}":\n\n`;

      if (result.tasks.length > 0) {
        summary += `Tasks (${result.tasks.length}):\n`;
        summary += result.tasks
          .map((t) => `  - ${formatTask(t)} [${t.id}]`)
          .join('\n');
        summary += '\n\n';
      }

      if (result.projects.length > 0) {
        summary += `Projects (${result.projects.length}):\n`;
        summary += result.projects
          .map((p) => `  - ${p.name} [${p.id}]`)
          .join('\n');
        summary += '\n\n';
      }

      if (result.tasks.length === 0 && result.projects.length === 0) {
        summary += 'No results found.';
      }

      return {
        content: [{ type: 'text' as const, text: summary }],
      };
    },
  );

  server.tool(
    'get_task_stats',
    'Get aggregate task statistics (total, pending, in progress, completed, overdue). Lightweight alternative to listing all tasks when you just need counts.',
    {
      project_id: z
        .string()
        .optional()
        .describe('Scope stats to a specific project ID'),
    },
    async ({ project_id }) => {
      const qs = project_id ? `?project_id=${project_id}` : '';
      const stats = await apiRequest<{
        total: number;
        pending: number;
        inProgress: number;
        completed: number;
        overdue: number;
      }>(`/api/tasks/stats${qs}`);

      const text = `Tasks: ${stats.total} total — ${stats.pending} pending, ${stats.inProgress} in progress, ${stats.completed} completed, ${stats.overdue} overdue`;

      return {
        content: [{ type: 'text' as const, text }],
      };
    },
  );
}
