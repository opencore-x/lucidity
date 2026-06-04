import { Hono } from 'hono';
import { uuidv7 } from 'uuidv7';
import { db } from '../lib/db.js';
import { milestones, tasks, eq, and, inArray, sql } from '@lucidity/db';
import {
  CreateMilestoneSchema,
  UpdateMilestoneSchema,
  MergeMilestonesSchema,
} from '@lucidity/shared';
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
    .orderBy(sql`${milestones.name} ASC`);

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

// Merge source milestones into a target: reassign all their tasks to the
// target, then delete the sources. Registered before '/:id' routes (it's a
// distinct POST path, so no conflict, but kept explicit for clarity).
router.post('/merge', async (c) => {
  const user = await getCurrentUser(c);
  const body = await c.req.json();
  const parsed = MergeMilestonesSchema.safeParse(body);

  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { targetMilestoneId } = parsed.data;
  // De-dupe sources and drop the target if it was included.
  const sourceIds = [...new Set(parsed.data.sourceMilestoneIds)].filter(
    (sourceId) => sourceId !== targetMilestoneId,
  );

  if (sourceIds.length === 0) {
    return c.json(
      { error: 'No source milestones to merge (after removing the target)' },
      400,
    );
  }

  // Fetch target + sources scoped to this user in one query.
  const owned = await db
    .select({ id: milestones.id, projectId: milestones.projectId })
    .from(milestones)
    .where(
      and(
        eq(milestones.userId, user.id),
        inArray(milestones.id, [targetMilestoneId, ...sourceIds]),
      ),
    );

  const target = owned.find((m) => m.id === targetMilestoneId);
  if (!target) return c.json({ error: 'Target milestone not found' }, 404);

  const ownedSourceIds = sourceIds.filter((sourceId) =>
    owned.some((m) => m.id === sourceId),
  );
  const missing = sourceIds.filter((sourceId) => !ownedSourceIds.includes(sourceId));
  if (missing.length > 0) {
    return c.json(
      { error: `Source milestone(s) not found: ${missing.join(', ')}` },
      404,
    );
  }

  // Guard against merging across projects — milestones belong to one project.
  const crossProject = owned.filter(
    (m) => m.id !== targetMilestoneId && m.projectId !== target.projectId,
  );
  if (crossProject.length > 0) {
    return c.json(
      {
        error: `Cannot merge milestones from a different project than the target: ${crossProject
          .map((m) => m.id)
          .join(', ')}`,
      },
      400,
    );
  }

  // Reassign tasks, then delete the sources — atomically. The neon-http
  // driver has no interactive transactions, so use db.batch(), which runs
  // both statements in a single atomic HTTP transaction.
  const [movedTaskIds] = await db.batch([
    db
      .update(tasks)
      .set({ milestoneId: targetMilestoneId })
      .where(
        and(
          eq(tasks.userId, user.id),
          inArray(tasks.milestoneId, ownedSourceIds),
        ),
      )
      .returning({ id: tasks.id }),
    db
      .delete(milestones)
      .where(
        and(
          eq(milestones.userId, user.id),
          inArray(milestones.id, ownedSourceIds),
        ),
      ),
  ]);

  return c.json({
    targetMilestoneId,
    mergedMilestoneIds: ownedSourceIds,
    movedTaskCount: movedTaskIds.length,
  });
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
