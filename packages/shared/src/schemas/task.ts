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
});

export const UpdateTaskSchema = CreateTaskSchema.partial();
