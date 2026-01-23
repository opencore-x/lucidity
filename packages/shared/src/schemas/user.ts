import { z } from 'zod';

export const UserSchema = z.object({
  id: z.uuidv7(),
  clerkId: z.string().max(255),
  email: z.email().max(255),
  name: z.string().min(2).max(255),
  avatarUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateUserSchema = UserSchema.partial();
