import { Hono } from 'hono';
import { db } from '../lib/db.js';
import { tasks, eq } from '@opentask/db';
import { CreateTaskSchema, UpdateTaskSchema } from '@opentask/shared';

const router = new Hono();

router.get('/', async (c) => {
  const allTasks = await db.select().from(tasks);
  return c.json(allTasks);
});

router.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = CreateTaskSchema.safeParse(body);

  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const [newTask] = await db.insert(tasks).values(parsed.data).returning();
  return c.json({ newTask }, 201);
});

router.get('/:id', async (c) => {
  const id = c.req.param('id');
  const task = await db.select().from(tasks).where(eq(tasks.id, id));

  if (!task.length) return c.json({ error: 'Task not found' }, 404);

  return c.json(task[0], 200);
});

router.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateTaskSchema.safeParse(body);

  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const [updated] = await db
    .update(tasks)
    .set(parsed.data)
    .where(eq(tasks.id, id))
    .returning();

  if (!updated) return c.json({ error: 'Task not found' }, 404);

  return c.json({ updated });
});

router.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [deleted] = await db.delete(tasks).where(eq(tasks.id, id)).returning();

  if (!deleted) return c.json({ error: 'Task not found' }, 404);

  return c.json({ message: 'Task Deleted' });
});

router.patch('/:id/reorder', async (c) => {});
router.patch('/:id/complete', async (c) => {
  const id = c.req.param('id');

  const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!task) return c.json({ error: 'Task not found' }, 404);

  const taskStatus = task.status === 'completed' ? 'pending' : 'completed';

  const [updated] = await db
    .update(tasks)
    .set({ status: taskStatus })
    .where(eq(tasks.id, id))
    .returning();

  return c.json(updated);
});

export default router;
