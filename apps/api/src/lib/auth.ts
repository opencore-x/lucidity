import type { Context } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { users, projects, eq } from '@opentask/db';
import { db } from './db.js';
import { uuidv7 } from 'uuidv7';
import { unauthorizedError } from './errors.js';

/**
 * Get current authenticated user from Clerk context.
 * Creates user in DB on first login (just-in-time sync).
 * Throws AppError if not authenticated.
 */
export async function getCurrentUser(c: Context) {
  const auth = getAuth(c);

  if (!auth?.userId) {
    throw unauthorizedError();
  }

  // Find user by clerkId
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, auth.userId));

  if (user) return user;

  // First time - create user with Clerk data
  const [newUser] = await db
    .insert(users)
    .values({
      id: uuidv7(),
      clerkId: auth.userId,
      email: auth.sessionClaims?.email as string,
      name: (auth.sessionClaims?.name as string) ?? 'User',
    })
    .returning();

  // Create default "Todo" project for new user
  await db.insert(projects).values({
    id: uuidv7(),
    userId: newUser.id,
    name: 'Todo',
  });

  return newUser;
}
