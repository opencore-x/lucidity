import { z } from 'zod';
import { TIME_SESSION_DEVICE_VALUES } from '../constants.js';

export const CreateTimeSessionSchema = z.object({
  taskId: z.uuidv7(),
  device: z.enum(TIME_SESSION_DEVICE_VALUES).optional(),
  notes: z.string().optional(),
});

export const TimeSessionSchema = CreateTimeSessionSchema.extend({
  id: z.uuidv7(),
  userId: z.uuidv7(),
  taskId: z.uuidv7(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().nullable(),
  elapsedSeconds: z.number(),
  device: z.enum(TIME_SESSION_DEVICE_VALUES).nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const UpdateTimeSessionSchema = z.object({
  notes: z.string().nullable().optional(),
});
