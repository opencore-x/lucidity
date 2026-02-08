import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest } from '../client.js';

interface Project {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  isArchived: boolean | null;
  createdAt: string;
  updatedAt: string;
}

function formatProject(p: Project): string {
  const archived = p.isArchived ? ' (archived)' : '';
  const color = p.color ? ` ${p.color}` : '';
  return `${p.name}${color}${archived}`;
}

export function registerProjectTools(server: McpServer) {
  server.tool(
    'list_projects',
    'List all projects. By default hides archived projects.',
    {
      include_archived: z
        .boolean()
        .optional()
        .describe('Include archived projects (default: false)'),
    },
    async ({ include_archived }) => {
      const allProjects = await apiRequest<Project[]>('/api/projects');

      const filtered = include_archived
        ? allProjects
        : allProjects.filter((p) => !p.isArchived);

      const summary =
        filtered.length === 0
          ? 'No projects found.'
          : filtered
              .map((p) => `- ${formatProject(p)} [${p.id}]`)
              .join('\n');

      return {
        content: [
          {
            type: 'text' as const,
            text: `Found ${filtered.length} project(s):\n\n${summary}\n\n---\n${JSON.stringify(filtered, null, 2)}`,
          },
        ],
      };
    },
  );

  server.tool(
    'create_project',
    'Create a new project.',
    {
      name: z.string().describe('Project name'),
      color: z
        .string()
        .optional()
        .describe('Hex color code (e.g. #FF5733)'),
      description: z.string().optional().describe('Project description'),
    },
    async ({ name, color, description }) => {
      const body: Record<string, unknown> = { name };
      if (color) body['color'] = color;
      if (description) body['description'] = description;

      const project = await apiRequest<Project>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Created project: ${formatProject(project)} [${project.id}]\n\n${JSON.stringify(project, null, 2)}`,
          },
        ],
      };
    },
  );
}
