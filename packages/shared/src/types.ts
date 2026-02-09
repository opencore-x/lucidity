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

import {
  ProjectSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
} from './schemas/project.js';

import {
  MilestoneSchema,
  CreateMilestoneSchema,
  UpdateMilestoneSchema,
} from './schemas/milestone.js';

import {
  CommentSchema,
  CreateCommentSchema,
  UpdateCommentSchema,
} from './schemas/comment.js';

export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.input<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;

export type Project = z.infer<typeof ProjectSchema>;
export type CreateProject = z.input<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;

export type Milestone = z.infer<typeof MilestoneSchema>;
export type CreateMilestone = z.infer<typeof CreateMilestoneSchema>;
export type UpdateMilestone = z.infer<typeof UpdateMilestoneSchema>;

export type Comment = z.infer<typeof CommentSchema>;
export type CreateComment = z.input<typeof CreateCommentSchema>;
export type UpdateComment = z.infer<typeof UpdateCommentSchema>;
