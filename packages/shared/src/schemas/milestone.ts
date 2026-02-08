import { z } from 'zod';

export const CreateMilestoneSchema = z.object({
  projectId: z.uuidv7(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  dueDate: z.coerce.date().optional(),
});

export const MilestoneSchema = CreateMilestoneSchema.extend({
  id: z.uuidv7(),
  userId: z.uuidv7(),
  projectId: z.uuidv7(),
  description: z.string().nullable(),
  dueDate: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const UpdateMilestoneSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});
