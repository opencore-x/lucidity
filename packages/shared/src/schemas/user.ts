import { z } from 'zod';

// What client sends when creating a user
export const CreateUserSchema = z.object({
  email: z.email().max(255),
  name: z.string().min(2).max(255),
  clerkId: z.string().max(255).optional(),
  avatarUrl: z.string().optional(),
});

// Full user schema (database representation)
export const UserSchema = CreateUserSchema.extend({
  id: z.uuidv7(),
  clerkId: z.string().max(255).nullable(),
  avatarUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Partial schema for updates
export const UpdateUserSchema = CreateUserSchema.partial();
