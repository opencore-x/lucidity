import type { Context } from 'hono';
import { Hono } from 'hono';
import { randomBytes } from 'node:crypto';
import { getAuth } from '@hono/clerk-auth';
import { uuidv7 } from 'uuidv7';
import { db } from '../lib/db.js';
import { apiKeys, users, eq } from '@lucidity/db';
import { hashApiKey } from '../lib/apiKeyAuth.js';
import { unauthorizedError } from '../lib/errors.js';

const router = new Hono();

async function getClerkUser(c: Context) {
  const auth = getAuth(c);
  if (!auth?.userId) throw unauthorizedError();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, auth.userId));

  if (!user) throw unauthorizedError('User not found');
  return user;
}

// Generate new API key (replaces existing if any)
router.post('/', async (c) => {
  const user = await getClerkUser(c);

  // Delete existing key if any (single key enforcement)
  await db.delete(apiKeys).where(eq(apiKeys.userId, user.id));

  // Generate raw key: luc_ + 20 random bytes as hex (44 chars total)
  const rawKey = `luc_${randomBytes(20).toString('hex')}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12); // "luc_" + first 8 hex chars

  await db.insert(apiKeys).values({
    id: uuidv7(),
    userId: user.id,
    keyHash,
    keyPrefix,
  });

  return c.json({ key: rawKey, prefix: keyPrefix }, 201);
});

// Get key metadata (never returns the key itself)
router.get('/', async (c) => {
  const user = await getClerkUser(c);

  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, user.id));

  if (!apiKey) {
    return c.json({ exists: false });
  }

  return c.json({
    exists: true,
    prefix: apiKey.keyPrefix,
    createdAt: apiKey.createdAt,
    lastUsedAt: apiKey.lastUsedAt,
  });
});

// Revoke API key
router.delete('/', async (c) => {
  const user = await getClerkUser(c);

  await db.delete(apiKeys).where(eq(apiKeys.userId, user.id));

  return c.body(null, 204);
});

export default router;
