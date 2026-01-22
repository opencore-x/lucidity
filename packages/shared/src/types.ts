import { z } from 'zod';
import { TaskSchema, CreateTaskSchema, UpdateTaskSchema } from './schemas/task.js';

export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;
