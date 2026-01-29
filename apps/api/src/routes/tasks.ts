import { Hono } from 'hono';
import { uuidv7 } from 'uuidv7';
import { db } from '../lib/db.js';
import { tasks, eq, and, asc } from '@lucidity/db';
import { CreateTaskSchema, UpdateTaskSchema } from '@lucidity/shared';
import { getCurrentUser } from '../lib/auth.js';

const router = new Hono();

router.get('/', async (c) => {
  const user = await getCurrentUser(c);
  const allTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, user.id))
    .orderBy(asc(tasks.createdAt));
  return c.json(allTasks);
});

router.post('/', async (c) => {
  const body = await c.req.json();
  const user = await getCurrentUser(c);
  const parsed = CreateTaskSchema.safeParse(body);

  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const id = uuidv7();

  const [newTask] = await db
    .insert(tasks)
    .values({ ...parsed.data, id, userId: user.id })
    .returning();
  return c.json(newTask, 201);
});

router.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = await getCurrentUser(c);
  const task = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

  if (!task.length) return c.json({ error: 'Task not found' }, 404);
  return c.json(task[0]);
});

router.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateTaskSchema.safeParse(body);
  const user = await getCurrentUser(c);

  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const [updated] = await db
    .update(tasks)
    .set(parsed.data)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning();

  if (!updated) return c.json({ error: 'Task not found' }, 404);
  return c.json(updated);
});

router.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const user = await getCurrentUser(c);

  const [deleted] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning();

  if (!deleted) return c.json({ error: 'Task not found' }, 404);
  return c.body(null, 204);
});

router.patch('/:id/complete', async (c) => {
  const id = c.req.param('id');
  const user = await getCurrentUser(c);

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));
  if (!task) return c.json({ error: 'Task not found' }, 404);

  const taskStatus = task.status === 'completed' ? 'pending' : 'completed';

  const [updated] = await db
    .update(tasks)
    .set({ status: taskStatus })
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning();
  return c.json(updated);
});

// router.patch('/:id/reorder', async (c) => {});

export default router;
