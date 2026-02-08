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
