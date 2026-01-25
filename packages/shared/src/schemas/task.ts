import { z } from 'zod';
import {
  TASK_STATUS_VALUES,
  PRIORITY_MIN,
  PRIORITY_MAX,
} from '../constants.js';

export const TaskSchema = z.object({
  id: z.uuidv7(),
  userId: z.uuidv7(),
  projectId: z.uuidv7().nullable(),
  parentTaskId: z.uuidv7().nullable(),
  title: z.string().min(1).max(500),
  description: z.string().nullable(),
  status: z.enum(TASK_STATUS_VALUES),
  priority: z.number().min(PRIORITY_MIN).max(PRIORITY_MAX),
  position: z.number().nullable(),
  completedAt: z.coerce.date().nullable(),
  dueDate: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateTaskSchema = TaskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  projectId: z.uuidv7().optional(),
  parentTaskId: z.uuidv7().optional(),
  description: z.string().optional(),
  status: z.enum(TASK_STATUS_VALUES).default('pending'),
  priority: z.number().min(PRIORITY_MIN).max(PRIORITY_MAX).default(500),
  position: z.number().optional(),
  completedAt: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();
