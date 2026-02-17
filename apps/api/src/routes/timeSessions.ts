import { Hono } from 'hono';
import { uuidv7 } from 'uuidv7';
import { db } from '../lib/db.js';
import { timeSessions, tasks, eq, and, isNull, sql } from '@lucidity/db';
import { UpdateTimeSessionSchema } from '@lucidity/shared';
import { getCurrentUser } from '../lib/auth.js';

const router = new Hono();

// GET /api/tasks/active-timer — get user's currently active timer session
router.get('/active-timer', async (c) => {
  const user = await getCurrentUser(c);

  const [session] = await db
    .select()
    .from(timeSessions)
    .where(and(eq(timeSessions.userId, user.id), isNull(timeSessions.endedAt)));

  if (!session) return c.json(null);
  return c.json(session);
});

// POST /api/tasks/:taskId/timer/start — start a timer on a task
router.post('/:taskId/timer/start', async (c) => {
  const user = await getCurrentUser(c);
  const taskId = c.req.param('taskId');
  const body = await c.req.json().catch(() => ({}));
  const device = body.device || null;

  // Verify task belongs to user
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

  if (!task) return c.json({ error: 'Task not found' }, 404);

  // If there's already an active timer on this task, return it
  if (task.activeTimerStartedAt) {
    const [existing] = await db
      .select()
      .from(timeSessions)
      .where(and(eq(timeSessions.taskId, taskId), isNull(timeSessions.endedAt)));

    if (existing) return c.json(existing);
  }

  // Stop any other active timer for this user first
  await stopActiveSession(user.id);

  const now = new Date();
  const id = uuidv7();

  const [session] = await db
    .insert(timeSessions)
    .values({ id, taskId, userId: user.id, startedAt: now, device })
    .returning();

  await db
    .update(tasks)
    .set({ activeTimerStartedAt: now })
    .where(eq(tasks.id, taskId));

  return c.json(session, 201);
});

// POST /api/tasks/:taskId/timer/stop — stop the active timer on a task
router.post('/:taskId/timer/stop', async (c) => {
  const user = await getCurrentUser(c);
  const taskId = c.req.param('taskId');

  // Verify task belongs to user
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

  if (!task) return c.json({ error: 'Task not found' }, 404);

  if (!task.activeTimerStartedAt) {
    return c.json({ error: 'No active timer on this task' }, 400);
  }

  const session = await stopActiveSession(user.id, taskId);
  if (!session) return c.json({ error: 'No active session found' }, 400);

  return c.json(session);
});

// GET /api/tasks/:taskId/time-sessions — list all time sessions for a task
router.get('/:taskId/time-sessions', async (c) => {
  const user = await getCurrentUser(c);
  const taskId = c.req.param('taskId');

  // Verify task belongs to user
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

  if (!task) return c.json({ error: 'Task not found' }, 404);

  const sessions = await db
    .select()
    .from(timeSessions)
    .where(eq(timeSessions.taskId, taskId))
    .orderBy(sql`${timeSessions.startedAt} DESC`);

  return c.json(sessions);
});

// PATCH /api/tasks/:taskId/time-sessions/:sessionId — update a session's notes
router.patch('/:taskId/time-sessions/:sessionId', async (c) => {
  const user = await getCurrentUser(c);
  const taskId = c.req.param('taskId');
  const sessionId = c.req.param('sessionId');

  const body = await c.req.json();
  const parsed = UpdateTimeSessionSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const [updated] = await db
    .update(timeSessions)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(timeSessions.id, sessionId),
        eq(timeSessions.taskId, taskId),
        eq(timeSessions.userId, user.id),
      ),
    )
    .returning();

  if (!updated) return c.json({ error: 'Session not found' }, 404);
  return c.json(updated);
});

// DELETE /api/tasks/:taskId/time-sessions/:sessionId — delete a session
router.delete('/:taskId/time-sessions/:sessionId', async (c) => {
  const user = await getCurrentUser(c);
  const taskId = c.req.param('taskId');
  const sessionId = c.req.param('sessionId');

  const [session] = await db
    .select()
    .from(timeSessions)
    .where(
      and(
        eq(timeSessions.id, sessionId),
        eq(timeSessions.taskId, taskId),
        eq(timeSessions.userId, user.id),
      ),
    );

  if (!session) return c.json({ error: 'Session not found' }, 404);

  // If deleting an active session, clear the task's timer state
  if (!session.endedAt) {
    await db
      .update(tasks)
      .set({ activeTimerStartedAt: null })
      .where(eq(tasks.id, taskId));
  }

  await db.delete(timeSessions).where(eq(timeSessions.id, sessionId));

  // Recalculate total elapsed seconds for the task
  await recalcTotalElapsed(taskId);

  return c.body(null, 204);
});

// GET /api/tasks/:taskId/time-total — get total time including subtask rollup
router.get('/:taskId/time-total', async (c) => {
  const user = await getCurrentUser(c);
  const taskId = c.req.param('taskId');

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

  if (!task) return c.json({ error: 'Task not found' }, 404);

  // Recursive CTE to sum elapsed seconds across task and all descendants
  const queryResult = await db.execute(sql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM tasks WHERE id = ${taskId} AND user_id = ${user.id}
      UNION ALL
      SELECT t.id FROM tasks t
      JOIN descendants d ON t.parent_task_id = d.id
      WHERE t.user_id = ${user.id}
    )
    SELECT COALESCE(SUM(total_elapsed_seconds), 0)::int AS total
    FROM tasks
    WHERE id IN (SELECT id FROM descendants)
  `);

  const row = queryResult.rows[0] as { total: number } | undefined;
  return c.json({ totalSeconds: row?.total ?? 0 });
});

async function stopActiveSession(userId: string, taskId?: string) {
  const conditions = [eq(timeSessions.userId, userId), isNull(timeSessions.endedAt)];
  if (taskId) conditions.push(eq(timeSessions.taskId, taskId));

  const [active] = await db
    .select()
    .from(timeSessions)
    .where(and(...conditions));

  if (!active) return null;

  const now = new Date();
  const elapsed = Math.floor((now.getTime() - active.startedAt.getTime()) / 1000);

  const [stopped] = await db
    .update(timeSessions)
    .set({ endedAt: now, elapsedSeconds: elapsed, updatedAt: now })
    .where(eq(timeSessions.id, active.id))
    .returning();

  // Update the task's accumulated time and clear active timer
  await db
    .update(tasks)
    .set({
      totalElapsedSeconds: sql`${tasks.totalElapsedSeconds} + ${elapsed}`,
      activeTimerStartedAt: null,
    })
    .where(eq(tasks.id, active.taskId));

  return stopped;
}

async function recalcTotalElapsed(taskId: string) {
  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${timeSessions.elapsedSeconds}), 0)` })
    .from(timeSessions)
    .where(eq(timeSessions.taskId, taskId));

  await db
    .update(tasks)
    .set({ totalElapsedSeconds: result?.total ?? 0 })
    .where(eq(tasks.id, taskId));
}

export default router;
