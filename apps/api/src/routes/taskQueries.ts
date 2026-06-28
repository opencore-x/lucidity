import { Hono } from 'hono';
import { db } from '../lib/db.js';
import { tasks, projects, comments, eq, and, inArray, isNull, sql } from '@lucidity/db';
import { getCurrentUser } from '../lib/auth.js';
import {
  accessibleProjectIds,
  assertTaskAccess,
  taskAccessCondition,
  taskAccessSql,
} from '../lib/authz.js';
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

const taskQueryRouter = new Hono();

// GET /api/tasks/today — Non-completed root tasks due today or overdue
taskQueryRouter.get('/today', async (c) => {
  const user = await getCurrentUser(c);
  const now = new Date();
  const todayEnd = endOfDay(now);

  const accessibleIds = await accessibleProjectIds(user.id, 'read');

  const result = await db
    .select()
    .from(tasks)
    .where(
      and(
        taskAccessCondition(user.id, accessibleIds),
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

  const accessibleIds = await accessibleProjectIds(user.id, 'read');

  const result = await db
    .select()
    .from(tasks)
    .where(
      and(
        taskAccessCondition(user.id, accessibleIds),
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

  const accessibleIds = await accessibleProjectIds(user.id, 'read');

  // IDOR guard: a foreign project_id yields zeroed stats, not another's counts.
  if (projectId && !accessibleIds.includes(projectId)) {
    return c.json({
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      blocked: 0,
      deferred: 0,
      overdue: 0,
    });
  }

  const conditions = [
    taskAccessSql(user.id, accessibleIds),
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

  const accessibleIds = await accessibleProjectIds(user.id, 'read');

  // IDOR guard: a foreign project_id returns nothing, not another's tasks.
  if (projectId && !accessibleIds.includes(projectId)) {
    return c.json([]);
  }

  const conditions = [
    taskAccessCondition(user.id, accessibleIds),
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

  const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!task) return c.json({ error: 'Task not found' }, 404);
  await assertTaskAccess(user.id, task, 'write');

  const [updated] = await db
    .update(tasks)
    .set({ reviewedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: 'Task not found' }, 404);
  }

  return c.json(updated);
});

const searchRouter = new Hono();

// Build a short context snippet around the first occurrence of `q` in `text`,
// with leading/trailing ellipses and collapsed whitespace.
function buildSnippet(text: string, q: string, radius = 40): string {
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) {
    return text.length > radius * 2 ? `${text.slice(0, radius * 2)}…` : text;
  }
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + q.length + radius);
  let snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < text.length) snippet = `${snippet}…`;
  return snippet;
}

// GET /api/search?q=... — ILIKE search across task titles, descriptions,
// comment content, and project names. Each matched task carries a `match`
// object naming the field that matched (title | description | comment) and a
// context snippet so callers can see why it surfaced.
searchRouter.get('/search', async (c) => {
  const user = await getCurrentUser(c);
  const q = c.req.query('q')?.trim();

  if (!q) {
    return c.json({ tasks: [], projects: [] });
  }

  const pattern = `%${q}%`;

  const accessibleIds = await accessibleProjectIds(user.id, 'read');
  const taskScope = taskAccessCondition(user.id, accessibleIds);
  const projectScope =
    accessibleIds.length > 0 ? inArray(projects.id, accessibleIds) : sql`false`;

  const [titleDescTasks, commentMatches, matchedProjects] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(
        and(
          taskScope,
          sql`(${tasks.title} ILIKE ${pattern} OR ${tasks.description} ILIKE ${pattern})`,
        ),
      )
      .orderBy(sql`${tasks.createdAt} DESC`)
      .limit(50),
    db
      .select({ task: tasks, commentContent: comments.content })
      .from(comments)
      .innerJoin(tasks, eq(comments.taskId, tasks.id))
      .where(and(taskScope, sql`${comments.content} ILIKE ${pattern}`))
      .orderBy(sql`${comments.createdAt} DESC`)
      .limit(50),
    db
      .select()
      .from(projects)
      .where(and(projectScope, sql`${projects.name} ILIKE ${pattern}`))
      .orderBy(sql`${projects.createdAt} DESC`)
      .limit(20),
  ]);

  const ql = q.toLowerCase();
  const byId = new Map<string, any>();

  // Title/description matches take priority over comment matches.
  for (const t of titleDescTasks) {
    const inTitle = t.title.toLowerCase().includes(ql);
    const field = inTitle ? 'title' : 'description';
    const source = inTitle ? t.title : (t.description ?? '');
    byId.set(t.id, { ...t, match: { field, snippet: buildSnippet(source, q) } });
  }

  for (const { task, commentContent } of commentMatches) {
    if (byId.has(task.id)) continue;
    byId.set(task.id, {
      ...task,
      match: { field: 'comment', snippet: buildSnippet(commentContent, q) },
    });
  }

  return c.json({ tasks: [...byId.values()], projects: matchedProjects });
});

export { taskQueryRouter, searchRouter };
