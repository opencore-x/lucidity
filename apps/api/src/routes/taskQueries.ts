import { Hono } from 'hono';
import { db } from '../lib/db.js';
import { tasks, projects, eq, and, isNull, sql } from '@lucidity/db';
import { getCurrentUser } from '../lib/auth.js';
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

const taskQueryRouter = new Hono();

// GET /api/tasks/today — Non-completed root tasks due today or overdue
taskQueryRouter.get('/today', async (c) => {
  const user = await getCurrentUser(c);
  const now = new Date();
  const todayEnd = endOfDay(now);

  const result = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, user.id),
        isNull(tasks.parentTaskId),
        sql`${tasks.status} != 'completed'`,
        sql`${tasks.dueDate} <= ${todayEnd}`,
      ),
    )
    .orderBy(sql`${tasks.dueDate} ASC NULLS LAST`);

  return c.json(result);
});

// GET /api/tasks/week — Non-completed root tasks due this week (Mon–Sun)
taskQueryRouter.get('/week', async (c) => {
  const user = await getCurrentUser(c);
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const result = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, user.id),
        isNull(tasks.parentTaskId),
        sql`${tasks.status} != 'completed'`,
        sql`${tasks.dueDate} >= ${weekStart}`,
        sql`${tasks.dueDate} <= ${weekEnd}`,
      ),
    )
    .orderBy(sql`${tasks.dueDate} ASC NULLS LAST`);

  return c.json(result);
});

// GET /api/tasks/stats — Aggregate task counts by status
taskQueryRouter.get('/stats', async (c) => {
  const user = await getCurrentUser(c);
  const projectId = c.req.query('project_id');

  const conditions = [
    sql`user_id = ${user.id}`,
    sql`parent_task_id IS NULL`,
  ];

  if (projectId) {
    conditions.push(sql`project_id = ${projectId}`);
  }

  const whereClause = sql.join(conditions, sql` AND `);

  const queryResult = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'blocked') as blocked,
      COUNT(*) FILTER (WHERE status = 'deferred') as deferred,
      COUNT(*) FILTER (WHERE status != 'completed' AND due_date < NOW()) as overdue
    FROM tasks WHERE ${whereClause}
  `);

  const row = queryResult.rows[0];

  return c.json({
    total: Number(row?.total ?? 0),
    pending: Number(row?.pending ?? 0),
    inProgress: Number(row?.in_progress ?? 0),
    completed: Number(row?.completed ?? 0),
    blocked: Number(row?.blocked ?? 0),
    deferred: Number(row?.deferred ?? 0),
    overdue: Number(row?.overdue ?? 0),
  });
});

// GET /api/tasks/unreviewed — Non-completed root tasks never reviewed by AI
taskQueryRouter.get('/unreviewed', async (c) => {
  const user = await getCurrentUser(c);
  const projectId = c.req.query('project_id');
  const limit = parseInt(c.req.query('limit') || '50', 10);

  const conditions = [
    eq(tasks.userId, user.id),
    isNull(tasks.parentTaskId),
    isNull(tasks.reviewedAt),
    sql`${tasks.status} != 'completed'`,
  ];

  if (projectId) {
    conditions.push(eq(tasks.projectId, projectId));
  }

  const result = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(sql`${tasks.projectId} ASC NULLS LAST`, sql`${tasks.priority} ASC`)
    .limit(limit);

  return c.json(result);
});

// PATCH /api/tasks/:id/review — Mark a task as reviewed
taskQueryRouter.patch('/:id/review', async (c) => {
  const user = await getCurrentUser(c);
  const id = c.req.param('id');

  const [updated] = await db
    .update(tasks)
    .set({ reviewedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning();

  if (!updated) {
    return c.json({ error: 'Task not found' }, 404);
  }

  return c.json(updated);
});

const searchRouter = new Hono();

// GET /api/search?q=... — ILIKE search across tasks and projects
searchRouter.get('/search', async (c) => {
  const user = await getCurrentUser(c);
  const q = c.req.query('q')?.trim();

  if (!q) {
    return c.json({ tasks: [], projects: [] });
  }

  const pattern = `%${q}%`;

  const [matchedTasks, matchedProjects] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, user.id),
          sql`(${tasks.title} ILIKE ${pattern} OR ${tasks.description} ILIKE ${pattern})`,
        ),
      )
      .orderBy(sql`${tasks.createdAt} DESC`)
      .limit(50),
    db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.userId, user.id),
          sql`${projects.name} ILIKE ${pattern}`,
        ),
      )
      .orderBy(sql`${projects.createdAt} DESC`)
      .limit(20),
  ]);

  return c.json({ tasks: matchedTasks, projects: matchedProjects });
});

export { taskQueryRouter, searchRouter };
