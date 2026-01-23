import { z } from 'zod';
import {
  TaskSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
} from './schemas/task.js';
import {
  UserSchema,
  CreateUserSchema,
  UpdateUserSchema,
} from './schemas/user.js';

export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
