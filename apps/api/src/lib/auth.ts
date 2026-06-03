import type { Context } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { users, eq } from '@lucidity/db';
import { db } from './db.js';
import { uuidv7 } from 'uuidv7';
import { unauthorizedError } from './errors.js';
import { getUserByApiKey } from './apiKeyAuth.js';

/**
 * Get current authenticated user from Clerk context or API key.
 * Creates user in DB on first login (just-in-time sync for Clerk).
 * Throws AppError if not authenticated.
 */
export async function getCurrentUser(c: Context) {
  // Check for API key auth first (Bearer luc_...)
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer luc_')) {
    const rawKey = authHeader.slice(7); // Remove "Bearer "
    const user = await getUserByApiKey(rawKey);
    if (!user) throw unauthorizedError('Invalid API key');
    return user;
  }

  // Fall through to Clerk auth
  const auth = getAuth(c);

  if (!auth?.userId) {
    throw unauthorizedError();
  }

  // Find user by clerkId
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, auth.userId));

  if (user) {
    // Lazy one-time backfill: users created before avatar sync have a null avatarUrl.
    // Fetch the Clerk image once and persist it; subsequent requests skip this branch.
    if (!user.avatarUrl) {
      try {
        const clerk = c.get('clerk');
        const clerkUser = await clerk.users.getUser(auth.userId);
        if (clerkUser.imageUrl) {
          const [updated] = await db
            .update(users)
            .set({ avatarUrl: clerkUser.imageUrl })
            .where(eq(users.id, user.id))
            .returning();
          if (updated) return updated;
        }
      } catch {
        // Non-fatal — fall through and return the user without an avatar.
      }
    }
    return user;
  }

  // First time - fetch user details from Clerk API
  const clerkClient = c.get('clerk');
  const clerkUser = await clerkClient.users.getUser(auth.userId);

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error('User email not found in Clerk');
  }

  // Create user with Clerk data
  const [newUser] = await db
    .insert(users)
    .values({
      id: uuidv7(),
      clerkId: auth.userId,
      email,
      name: clerkUser.firstName
        ? `${clerkUser.firstName} ${clerkUser.lastName ?? ''}`.trim()
        : 'User',
      avatarUrl: clerkUser.imageUrl ?? null,
    })
    .returning();

  return newUser;
}
