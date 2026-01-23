import { Hono } from 'hono';
import { uuidv7 } from 'uuidv7';
import { CreateUserSchema } from '@opentask/shared';
import { eq, users } from '@opentask/db';
import { db } from '../lib/db.js';

const router = new Hono();

router.get('/', async (c) => {
  const allUsers = await db.select().from(users);
  return c.json(allUsers);
});

router.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = await db.select().from(users).where(eq(users.id, id));

  if (!user.length) return c.json({ error: 'No user found' }, 404);
  return c.json(user[0]);
});

router.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = CreateUserSchema.safeParse(body);

  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const id = uuidv7();
  const [newUser] = await db
    .insert(users)
    .values({ ...parsed.data, id })
    .returning();
  return c.json(newUser, 201);
});

export default router;
