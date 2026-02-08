import { Hono } from 'hono';
import { uuidv7 } from 'uuidv7';
import { db } from '../lib/db.js';
import { milestones, tasks, eq, and, sql } from '@lucidity/db';
import { CreateMilestoneSchema, UpdateMilestoneSchema } from '@lucidity/shared';
import { getCurrentUser } from '../lib/auth.js';

const router = new Hono();

router.get('/', async (c) => {
  const user = await getCurrentUser(c);
  const projectId = c.req.query('project_id');

  const conditions = [eq(milestones.userId, user.id)];
  if (projectId) {
    conditions.push(eq(milestones.projectId, projectId));
  }

  const result = await db
    .select()
    .from(milestones)
    .where(and(...conditions))
    .orderBy(sql`${milestones.createdAt} ASC`);

  return c.json(result);
});

router.get('/:id', async (c) => {
  const user = await getCurrentUser(c);
  const id = c.req.param('id');

  const [milestone] = await db
    .select()
    .from(milestones)
    .where(and(eq(milestones.id, id), eq(milestones.userId, user.id)));

  if (!milestone) return c.json({ error: 'Milestone not found' }, 404);
  return c.json(milestone);
});

router.get('/:id/progress', async (c) => {
  const user = await getCurrentUser(c);
  const id = c.req.param('id');

  const [milestone] = await db
    .select()
    .from(milestones)
    .where(and(eq(milestones.id, id), eq(milestones.userId, user.id)));

  if (!milestone) return c.json({ error: 'Milestone not found' }, 404);

  const queryResult = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'blocked') as blocked,
      COUNT(*) FILTER (WHERE status = 'deferred') as deferred
    FROM tasks
    WHERE milestone_id = ${id} AND user_id = ${user.id}
  `);

  const row = queryResult.rows[0];
  const total = Number(row?.total ?? 0);
  const completed = Number(row?.completed ?? 0);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return c.json({
    milestoneId: id,
    total,
    completed,
    pending: Number(row?.pending ?? 0),
    inProgress: Number(row?.in_progress ?? 0),
    blocked: Number(row?.blocked ?? 0),
    deferred: Number(row?.deferred ?? 0),
    percent,
  });
});

router.post('/', async (c) => {
  const user = await getCurrentUser(c);
  const body = await c.req.json();
  const parsed = CreateMilestoneSchema.safeParse(body);

  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const id = uuidv7();

  const [newMilestone] = await db
    .insert(milestones)
    .values({ ...parsed.data, id, userId: user.id })
    .returning();

  return c.json(newMilestone, 201);
});

router.patch('/:id', async (c) => {
  const user = await getCurrentUser(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateMilestoneSchema.safeParse(body);

  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const [updated] = await db
    .update(milestones)
    .set(parsed.data)
    .where(and(eq(milestones.id, id), eq(milestones.userId, user.id)))
    .returning();

  if (!updated) return c.json({ error: 'Milestone not found' }, 404);
  return c.json(updated);
});

router.delete('/:id', async (c) => {
  const user = await getCurrentUser(c);
  const id = c.req.param('id');

  const [milestone] = await db
    .select()
    .from(milestones)
    .where(and(eq(milestones.id, id), eq(milestones.userId, user.id)));

  if (!milestone) return c.json({ error: 'Milestone not found' }, 404);

  // Unlink tasks from this milestone before deleting
  await db
    .update(tasks)
    .set({ milestoneId: null })
    .where(and(eq(tasks.milestoneId, id), eq(tasks.userId, user.id)));

  await db
    .delete(milestones)
    .where(and(eq(milestones.id, id), eq(milestones.userId, user.id)));

  return c.body(null, 204);
});

export default router;
