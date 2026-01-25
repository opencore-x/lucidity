import { z } from 'zod';
import {
  TASK_STATUS_VALUES,
  PRIORITY_MIN,
  PRIORITY_MAX,
} from '../constants.js';

// What client sends when creating a task
export const CreateTaskSchema = z.object({
  userId: z.uuidv7(), // TODO: remove after auth - will come from session
  title: z.string().min(1).max(500),
  projectId: z.uuidv7().optional(),
  parentTaskId: z.uuidv7().optional(),
  description: z.string().optional(),
  status: z.enum(TASK_STATUS_VALUES).default('pending'),
  priority: z.number().min(PRIORITY_MIN).max(PRIORITY_MAX).default(500),
  position: z.number().optional(),
  completedAt: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
});

// Full task schema (database representation)
export const TaskSchema = CreateTaskSchema.extend({
  id: z.uuidv7(),
  projectId: z.uuidv7().nullable(),
  parentTaskId: z.uuidv7().nullable(),
  description: z.string().nullable(),
  status: z.enum(TASK_STATUS_VALUES),
  priority: z.number().min(PRIORITY_MIN).max(PRIORITY_MAX),
  position: z.number().nullable(),
  completedAt: z.coerce.date().nullable(),
  dueDate: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Partial schema for updates
export const UpdateTaskSchema = CreateTaskSchema.partial();
