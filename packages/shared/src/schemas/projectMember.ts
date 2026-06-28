import { z } from 'zod';
import { MEMBER_ACCESS_VALUES } from '../constants.js';

// What client sends when adding/inviting a member to a project.
// `access` is a consumer-style view/edit picker (Google-Docs model), not RBAC.
export const CreateProjectMemberSchema = z.object({
  projectId: z.uuidv7(),
  userId: z.uuidv7(),
  access: z.enum(MEMBER_ACCESS_VALUES).default('view'),
});

// Full project member schema (database representation)
export const ProjectMemberSchema = CreateProjectMemberSchema.extend({
  id: z.uuidv7(),
  access: z.enum(MEMBER_ACCESS_VALUES),
  invitedBy: z.uuidv7().nullable(),
  createdAt: z.coerce.date(),
});

// Partial schema for updates (only access can change)
export const UpdateProjectMemberSchema = z.object({
  access: z.enum(MEMBER_ACCESS_VALUES),
});
