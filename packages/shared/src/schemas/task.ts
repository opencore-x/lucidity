import { z } from 'zod';
import {
  TASK_STATUS_VALUES,
  PRIORITY_MIN,
  PRIORITY_MAX,
  RECURRING_FREQUENCY_VALUES,
} from '../constants.js';

// What client sends when creating a task
export const CreateTaskSchema = z.object({
  // Optional client-generated UUIDv7. When provided the server uses it as the row id
  // instead of minting its own, so an optimistic row and its saved row share one stable
  // id (no temp→real swap). Omitted by older/other clients → server generates the id.
  id: z.uuidv7().optional(),
  title: z.string().min(1).max(500),
  projectId: z.uuidv7().nullable().optional(),
  milestoneId: z.uuidv7().nullable().optional(),
  parentTaskId: z.uuidv7().optional(),
  description: z.string().optional(),
  status: z.enum(TASK_STATUS_VALUES).default('pending'),
  priority: z.number().min(PRIORITY_MIN).max(PRIORITY_MAX).default(500),
  position: z.number().optional(),
  completedAt: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  reminderAt: z.coerce.date().nullable().optional(),
  recurringFrequency: z.enum(RECURRING_FREQUENCY_VALUES).nullable().optional(),
});

// Full task schema (database representation)
export const TaskSchema = CreateTaskSchema.extend({
  id: z.uuidv7(),
  userId: z.uuidv7(),
  projectId: z.uuidv7().nullable(),
  milestoneId: z.uuidv7().nullable(),
  parentTaskId: z.uuidv7().nullable(),
  description: z.string().nullable(),
  status: z.enum(TASK_STATUS_VALUES),
  priority: z.number().min(PRIORITY_MIN).max(PRIORITY_MAX),
  position: z.number().nullable(),
  taskNumber: z.number().nullable(),
  completedAt: z.coerce.date().nullable(),
  dueDate: z.coerce.date().nullable(),
  reminderAt: z.coerce.date().nullable(),
  recurringFrequency: z.enum(RECURRING_FREQUENCY_VALUES).nullable(),
  reviewedAt: z.coerce.date().nullable(),
  activeTimerStartedAt: z.coerce.date().nullable(),
  totalElapsedSeconds: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Partial schema for updates - allows null for clearable fields.
// NOTE: status/priority must override CreateTaskSchema's `.default()` here.
// `.partial()` makes fields optional but does NOT strip defaults, so without
// these overrides an update that omits status/priority would inject
// status:'pending' and priority:500 and silently clobber the stored values.
export const UpdateTaskSchema = CreateTaskSchema.omit({ id: true })
  .partial()
  .extend({
  projectId: z.uuidv7().nullable().optional(),
  milestoneId: z.uuidv7().nullable().optional(),
  parentTaskId: z.uuidv7().nullable().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(TASK_STATUS_VALUES).optional(),
  priority: z.number().min(PRIORITY_MIN).max(PRIORITY_MAX).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  reminderAt: z.coerce.date().nullable().optional(),
  recurringFrequency: z.enum(RECURRING_FREQUENCY_VALUES).nullable().optional(),
});
