import { z } from 'zod';
import {
  AI_REVIEW_DEPTH_VALUES,
  PROJECT_VISIBILITY_VALUES,
  PROJECT_ACCESS_VALUES,
} from '../constants.js';

// What client sends when creating a project
export const CreateProjectSchema = z.object({
  name: z.string().max(255),
  color: z.string().length(7).optional(),
  description: z.string().optional(),
  isArchived: z.boolean().default(false),
  aiReviewDepth: z.enum(AI_REVIEW_DEPTH_VALUES).default('light'),
});

// Full project schema (database representation)
export const ProjectSchema = CreateProjectSchema.extend({
  id: z.uuidv7(),
  userId: z.uuidv7(),
  color: z.string().length(7).nullable(),
  description: z.string().nullable(),
  aiReviewDepth: z.enum(AI_REVIEW_DEPTH_VALUES),
  visibility: z.enum(PROJECT_VISIBILITY_VALUES).default('private'),
  // Resolved per-request from the calling user's ownership/membership. Optional
  // because it isn't a stored column — the API attaches it to project responses.
  userAccess: z.enum(PROJECT_ACCESS_VALUES).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Partial schema for updates
export const UpdateProjectSchema = CreateProjectSchema.partial();
