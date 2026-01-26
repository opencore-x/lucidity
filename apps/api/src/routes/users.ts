import { Hono } from 'hono';
import { getCurrentUser } from '../lib/auth.js';

const router = new Hono();

// Get current authenticated user
router.get('/me', async (c) => {
  const user = await getCurrentUser(c);
  return c.json(user);
});

export default router;
