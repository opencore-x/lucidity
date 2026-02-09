import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest } from '../client.js';

interface Project {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  isArchived: boolean | null;
  aiReviewDepth: string;
  createdAt: string;
  updatedAt: string;
}

function formatProject(p: Project): string {
  const archived = p.isArchived ? ' (archived)' : '';
  const color = p.color ? ` ${p.color}` : '';
  const review = p.aiReviewDepth !== 'light' ? ` [review: ${p.aiReviewDepth}]` : '';
  return `${p.name}${color}${archived}${review}`;
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
            text: `Found ${filtered.length} project(s):\n\n${summary}`,
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
      ai_review_depth: z
        .enum(['deep', 'light', 'none'])
        .optional()
        .describe('AI review depth: deep (dev projects), light (default), none (skip)'),
    },
    async ({ name, color, description, ai_review_depth }) => {
      const body: Record<string, unknown> = { name };
      if (color) body['color'] = color;
      if (description) body['description'] = description;
      if (ai_review_depth) body['aiReviewDepth'] = ai_review_depth;

      const project = await apiRequest<Project>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Created project: ${formatProject(project)} [${project.id}]`,
          },
        ],
      };
    },
  );

  server.tool(
    'update_project',
    'Update an existing project.',
    {
      id: z.string().describe('Project ID to update'),
      name: z.string().optional().describe('New project name'),
      color: z.string().optional().describe('New hex color code'),
      description: z.string().optional().describe('New description'),
      is_archived: z.boolean().optional().describe('Archive or unarchive'),
      ai_review_depth: z
        .enum(['deep', 'light', 'none'])
        .optional()
        .describe('AI review depth: deep, light, or none'),
    },
    async ({ id, name, color, description, is_archived, ai_review_depth }) => {
      const body: Record<string, unknown> = {};
      if (name) body['name'] = name;
      if (color) body['color'] = color;
      if (description !== undefined) body['description'] = description;
      if (is_archived !== undefined) body['isArchived'] = is_archived;
      if (ai_review_depth) body['aiReviewDepth'] = ai_review_depth;

      const project = await apiRequest<Project>(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `Updated project: ${formatProject(project)} [${project.id}]`,
          },
        ],
      };
    },
  );
}
