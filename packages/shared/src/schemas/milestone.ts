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

// Merge one or more source milestones into a target: reassign all their
// tasks to the target, then delete the sources.
export const MergeMilestonesSchema = z.object({
  targetMilestoneId: z.uuidv7(),
  sourceMilestoneIds: z.array(z.uuidv7()).min(1),
});
