import { z } from 'zod';
import { COMMENT_SOURCE_VALUES } from '../constants.js';

export const CreateCommentSchema = z.object({
  content: z.string().min(1),
  source: z.enum(COMMENT_SOURCE_VALUES).default('user'),
});

export const CommentSchema = CreateCommentSchema.extend({
  id: z.uuidv7(),
  taskId: z.uuidv7(),
  userId: z.uuidv7(),
  source: z.enum(COMMENT_SOURCE_VALUES),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const UpdateCommentSchema = z.object({
  content: z.string().min(1),
});
