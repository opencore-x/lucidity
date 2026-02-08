import { createHash } from 'node:crypto';
import { db } from './db.js';
import { apiKeys, users, eq, and, sql } from '@lucidity/db';

const LAST_USED_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export async function getUserByApiKey(rawKey: string) {
  const hash = hashApiKey(rawKey);

  const result = await db
    .select({
      user: users,
      apiKey: apiKeys,
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(eq(apiKeys.keyHash, hash));

  if (!result.length) return null;

  const { user, apiKey } = result[0]!;

  // Throttled lastUsedAt update (fire-and-forget, 5 min window)
  const now = new Date();
  if (
    !apiKey.lastUsedAt ||
    now.getTime() - apiKey.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS
  ) {
    db.update(apiKeys)
      .set({ lastUsedAt: now })
      .where(eq(apiKeys.id, apiKey.id))
      .execute()
      .catch(() => {});
  }

  return user;
}
