import { z } from 'zod';

export const ProjectSchema = z.object({
  id: z.uuidv7(),
  userId: z.uuidv7(),
  name: z.string().max(255),
  color: z.string().length(7).nullable(),
  description: z.string().nullable(),
  isArchived: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateProjectSchema = ProjectSchema.omit({
  id: true,
  // userId: true, TODO: uncomment after auth is implemented
  createdAt: true,
  updatedAt: true,
});

export const UpdateProjectSchema = ProjectSchema.partial();
