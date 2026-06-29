import { z } from 'zod';

import {
  PROJECT_VISIBILITY_VALUES,
  MEMBER_ACCESS_VALUES,
  PROJECT_ACCESS_VALUES,
  SENDER_KINDS,
  HARNESS_REQUEST_KINDS,
} from './constants.js';
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

import {
  TimeSessionSchema,
  CreateTimeSessionSchema,
  UpdateTimeSessionSchema,
} from './schemas/timeSession.js';

import {
  ProjectMemberSchema,
  CreateProjectMemberSchema,
  UpdateProjectMemberSchema,
  ProjectMemberWithUserSchema,
  InviteProjectMemberSchema,
} from './schemas/projectMember.js';

import {
  AskRequestSchema,
  BriefingRequestSchema,
  JournalRequestSchema,
  HarnessRequestSchema,
  JournalEntrySchema,
  AskResponseSchema,
  BriefingResponseSchema,
  JournalResponseSchema,
  HarnessResponseSchema,
  HarnessStreamEventSchema,
  HarnessMessageSchema,
} from './schemas/harness.js';

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

export type TimeSession = z.infer<typeof TimeSessionSchema>;
export type CreateTimeSession = z.input<typeof CreateTimeSessionSchema>;
export type UpdateTimeSession = z.infer<typeof UpdateTimeSessionSchema>;

export type ProjectMember = z.infer<typeof ProjectMemberSchema>;
export type CreateProjectMember = z.input<typeof CreateProjectMemberSchema>;
export type UpdateProjectMember = z.infer<typeof UpdateProjectMemberSchema>;
export type ProjectMemberWithUser = z.infer<typeof ProjectMemberWithUserSchema>;
export type InviteProjectMember = z.input<typeof InviteProjectMemberSchema>;

export type ProjectVisibility = (typeof PROJECT_VISIBILITY_VALUES)[number];
export type MemberAccess = (typeof MEMBER_ACCESS_VALUES)[number];
export type ProjectAccess = (typeof PROJECT_ACCESS_VALUES)[number];

// Lucid harness wire contract (M6)
export type SenderKind = (typeof SENDER_KINDS)[number];
export type HarnessRequestKind = (typeof HARNESS_REQUEST_KINDS)[number];

// Per-variant inputs use z.input so client-set defaults (senderKind) stay
// optional at construction; the validated union (HarnessRequest) has them filled.
export type AskRequest = z.input<typeof AskRequestSchema>;
export type BriefingRequest = z.input<typeof BriefingRequestSchema>;
export type JournalRequest = z.input<typeof JournalRequestSchema>;
export type HarnessRequest = z.infer<typeof HarnessRequestSchema>;
export type HarnessRequestInput = z.input<typeof HarnessRequestSchema>;

export type JournalEntry = z.infer<typeof JournalEntrySchema>;
export type AskResponse = z.infer<typeof AskResponseSchema>;
export type BriefingResponse = z.infer<typeof BriefingResponseSchema>;
export type JournalResponse = z.infer<typeof JournalResponseSchema>;
export type HarnessResponse = z.infer<typeof HarnessResponseSchema>;
export type HarnessStreamEvent = z.infer<typeof HarnessStreamEventSchema>;
export type HarnessMessage = z.infer<typeof HarnessMessageSchema>;
