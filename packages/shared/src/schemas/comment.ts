import { z } from 'zod';

export const CreateCommentSchema = z.object({
  content: z.string().min(1),
});

export const CommentSchema = CreateCommentSchema.extend({
  id: z.uuidv7(),
  taskId: z.uuidv7(),
  userId: z.uuidv7(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const UpdateCommentSchema = z.object({
  content: z.string().min(1),
});
