import { z } from 'zod';

// What client sends when creating a project
export const CreateProjectSchema = z.object({
  userId: z.uuidv7(), // TODO: remove after auth - will come from session
  name: z.string().max(255),
  color: z.string().length(7).optional(),
  description: z.string().optional(),
  isArchived: z.boolean().default(false),
});

// Full project schema (database representation)
export const ProjectSchema = CreateProjectSchema.extend({
  id: z.uuidv7(),
  color: z.string().length(7).nullable(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Partial schema for updates
export const UpdateProjectSchema = CreateProjectSchema.partial();
