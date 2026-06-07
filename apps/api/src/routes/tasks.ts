import { Hono } from 'hono';
import { uuidv7 } from 'uuidv7';
import {
  addDays,
  addMonths,
  addYears,
  getDate,
  getDay,
  getMonth,
  setDate,
  setMonth,
  startOfDay,
  endOfMonth,
  getDaysInMonth,
} from 'date-fns';
import { db } from '../lib/db.js';
import { tasks, eq, and, asc, desc, isNull, sql } from '@lucidity/db';
import { CreateTaskSchema, UpdateTaskSchema } from '@lucidity/shared';
import { getCurrentUser } from '../lib/auth.js';

/**
 * Calculate the next occurrence of a recurring task using fixed recurrence.
 * - Daily: next day after today
 * - Weekly: next occurrence of the same weekday
 * - Monthly: next occurrence of the same day-of-month
 * - Yearly: next occurrence of the same month+day
 */
function calculateNextDueDate(anchorDate: Date, frequency: string): Date {
  const today = startOfDay(new Date());

  switch (frequency) {
    case 'daily': {
      // Simply return tomorrow
      return addDays(today, 1);
    }

    case 'weekly': {
      // Find the next occurrence of the same weekday
      const anchorWeekday = getDay(anchorDate); // 0 = Sunday, 6 = Saturday
      const todayWeekday = getDay(today);

      let daysUntilNext = anchorWeekday - todayWeekday;
      if (daysUntilNext <= 0) {
        // If today is the anchor day or past it, go to next week
        daysUntilNext += 7;
      }

      return addDays(today, daysUntilNext);
    }

    case 'monthly': {
      // Find the next occurrence of the same day-of-month
      const anchorDay = getDate(anchorDate); // 1-31

      // Start with current month
      let nextDate = setDate(today, Math.min(anchorDay, getDaysInMonth(today)));

      // If that date is today or in the past, move to next month
      if (nextDate <= today) {
        const nextMonth = addMonths(today, 1);
        // Handle months with fewer days (e.g., anchor is 31, but month has 30)
        const daysInNextMonth = getDaysInMonth(nextMonth);
        nextDate = setDate(nextMonth, Math.min(anchorDay, daysInNextMonth));
      }

      return startOfDay(nextDate);
    }

    case 'yearly': {
      // Find the next occurrence of the same month+day
      const anchorMonth = getMonth(anchorDate); // 0-11
      const anchorDay = getDate(anchorDate); // 1-31

      // Try this year first
      let nextDate = setMonth(setDate(today, 1), anchorMonth); // Set month first to avoid overflow
      const daysInTargetMonth = getDaysInMonth(nextDate);
      nextDate = setDate(nextDate, Math.min(anchorDay, daysInTargetMonth));

      // If that date is today or in the past, move to next year
      if (nextDate <= today) {
        nextDate = addYears(nextDate, 1);
        // Recalculate for leap year edge case (Feb 29)
        const daysInNextYearMonth = getDaysInMonth(nextDate);
        nextDate = setDate(
          setMonth(nextDate, anchorMonth),
          Math.min(anchorDay, daysInNextYearMonth),
        );
      }

      return startOfDay(nextDate);
    }

    default:
      return addDays(today, 1);
  }
}

const router = new Hono();

router.get('/', async (c) => {
  const user = await getCurrentUser(c);

  const status = c.req.query('status');
  const projectId = c.req.query('project_id');
  const milestoneId = c.req.query('milestone_id');
  const taskNumber = c.req.query('task_number');
  const rootOnly = c.req.query('root_only') === 'true';
  const dueBefore = c.req.query('due_before');
  const dueAfter = c.req.query('due_after');
  const createdAfter = c.req.query('created_after');
  const createdBefore = c.req.query('created_before');
  const sortBy = c.req.query('sort_by');
  const limit = Math.min(
    Math.max(parseInt(c.req.query('limit') || '50', 10) || 50, 1),
    200,
  );
  const offset = Math.max(parseInt(c.req.query('offset') || '0', 10) || 0, 0);

  const conditions = [eq(tasks.userId, user.id)];

  if (status) {
    conditions.push(sql`${tasks.status} = ${status}`);
  }
  if (projectId) {
    conditions.push(eq(tasks.projectId, projectId));
  }
  if (milestoneId) {
    conditions.push(eq(tasks.milestoneId, milestoneId));
  }
  if (taskNumber) {
    conditions.push(eq(tasks.taskNumber, parseInt(taskNumber, 10)));
  }
  if (rootOnly) {
    conditions.push(isNull(tasks.parentTaskId));
  }
  if (dueBefore) {
    conditions.push(sql`${tasks.dueDate} <= ${new Date(dueBefore)}`);
  }
  if (dueAfter) {
    conditions.push(sql`${tasks.dueDate} >= ${new Date(dueAfter)}`);
  }
  if (createdAfter) {
    conditions.push(sql`${tasks.createdAt} >= ${new Date(createdAfter)}`);
  }
  if (createdBefore) {
    conditions.push(sql`${tasks.createdAt} <= ${new Date(createdBefore)}`);
  }

  const where = and(...conditions);

  // Default ordering: manually-positioned tasks keep their drag order, but unpositioned
  // tasks (position NULL) sort FIRST, newest-first among them — so a freshly created task
  // naturally lands at the top and STAYS there. NULLS FIRST (not LAST) is what makes the
  // server agree with the optimistic prepend; with NULLS LAST a new NULL-position task
  // sorted after any positioned tasks and visibly jumped to the bottom on refetch.
  // sort_by is opt-in and overrides this.
  const orderByClause =
    sortBy === 'created_desc'
      ? [desc(tasks.createdAt)]
      : sortBy === 'created_asc'
        ? [asc(tasks.createdAt)]
        : [sql`${tasks.position} ASC NULLS FIRST`, desc(tasks.createdAt)];

  const [allTasks, countResult] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(where)
      .orderBy(...orderByClause)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(where),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    tasks: allTasks,
    total,
    hasMore: offset + allTasks.length < total,
  });
});

router.post('/', async (c) => {
  const body = await c.req.json();
  const user = await getCurrentUser(c);
  const parsed = CreateTaskSchema.safeParse(body);

  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  // Block creating recurring task without a dueDate
  if (parsed.data.recurringFrequency && !parsed.data.dueDate) {
    return c.json(
      { error: 'Cannot set recurring frequency without a due date' },
      400,
    );
  }

  // Honor a client-supplied UUIDv7 (optimistic-create stable id); otherwise mint one.
  const id = parsed.data.id ?? uuidv7();

  let taskNumber: number | null = null;
  if (parsed.data.projectId) {
    const [result] = await db
      .select({ max: sql<number>`COALESCE(MAX(${tasks.taskNumber}), 0) + 1` })
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, parsed.data.projectId),
          eq(tasks.userId, user.id),
        ),
      );
    taskNumber = result.max;
  }

  const [newTask] = await db
    .insert(tasks)
    .values({ ...parsed.data, id, userId: user.id, taskNumber })
    .returning();
  return c.json(newTask, 201);
});

// Reorder route must come before /:id to avoid matching "reorder" as a UUID
router.patch('/reorder', async (c) => {
  const user = await getCurrentUser(c);
  const body = await c.req.json();
  const { taskIds } = body as { taskIds: string[] };

  if (!Array.isArray(taskIds)) {
    return c.json({ error: 'taskIds must be an array' }, 400);
  }

  // Update position for each task based on array index
  const updates = await Promise.all(
    taskIds.map((id, index) =>
      db
        .update(tasks)
        .set({ position: index })
        .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
        .returning(),
    ),
  );

  return c.json({ updated: updates.flat().length });
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

  // Fetch current task to validate recurring constraints
  const [existingTask] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

  if (!existingTask) return c.json({ error: 'Task not found' }, 404);

  // Determine the effective dueDate after this update
  const effectiveDueDate =
    parsed.data.dueDate !== undefined
      ? parsed.data.dueDate
      : existingTask.dueDate;

  // Block setting recurringFrequency without a dueDate
  if (parsed.data.recurringFrequency && !effectiveDueDate) {
    return c.json(
      { error: 'Cannot set recurring frequency without a due date' },
      400,
    );
  }

  // If clearing dueDate, also clear recurringFrequency
  const updateData: Record<string, any> = { ...parsed.data };
  if (parsed.data.dueDate === null && existingTask.recurringFrequency) {
    updateData.recurringFrequency = null;
  }

  // Assign new taskNumber when projectId changes
  if (
    parsed.data.projectId !== undefined &&
    parsed.data.projectId !== existingTask.projectId
  ) {
    if (parsed.data.projectId) {
      const [result] = await db
        .select({ max: sql<number>`COALESCE(MAX(${tasks.taskNumber}), 0) + 1` })
        .from(tasks)
        .where(
          and(
            eq(tasks.projectId, parsed.data.projectId),
            eq(tasks.userId, user.id),
          ),
        );
      updateData.taskNumber = result.max;
    } else {
      updateData.taskNumber = null;
    }
  }

  const [updated] = await db
    .update(tasks)
    .set(updateData)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning();

  // Propagate dueDate to all descendants if it changed
  if (parsed.data.dueDate !== undefined) {
    await db.execute(sql`
      WITH RECURSIVE descendants AS (
        SELECT id FROM tasks WHERE parent_task_id = ${id} AND user_id = ${user.id}
        UNION ALL
        SELECT t.id FROM tasks t
        JOIN descendants d ON t.parent_task_id = d.id
        WHERE t.user_id = ${user.id}
      )
      UPDATE tasks
      SET due_date = ${updated.dueDate}
      WHERE id IN (SELECT id FROM descendants)
    `);
  }

  // Propagate projectId to all descendants if it changed, and clear their milestones
  if (
    parsed.data.projectId !== undefined &&
    parsed.data.projectId !== existingTask.projectId
  ) {
    await db.execute(sql`
      WITH RECURSIVE descendants AS (
        SELECT id FROM tasks WHERE parent_task_id = ${id} AND user_id = ${user.id}
        UNION ALL
        SELECT t.id FROM tasks t
        JOIN descendants d ON t.parent_task_id = d.id
        WHERE t.user_id = ${user.id}
      )
      UPDATE tasks
      SET project_id = ${updated.projectId}, milestone_id = NULL
      WHERE id IN (SELECT id FROM descendants)
    `);
  }

  // Propagate recurringFrequency to all descendants if it changed
  if (updateData.recurringFrequency !== undefined) {
    await db.execute(sql`
      WITH RECURSIVE descendants AS (
        SELECT id FROM tasks WHERE parent_task_id = ${id} AND user_id = ${user.id}
        UNION ALL
        SELECT t.id FROM tasks t
        JOIN descendants d ON t.parent_task_id = d.id
        WHERE t.user_id = ${user.id}
      )
      UPDATE tasks
      SET recurring_frequency = ${updateData.recurringFrequency}
      WHERE id IN (SELECT id FROM descendants)
    `);
  }

  return c.json(updated);
});

router.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const user = await getCurrentUser(c);

  // Verify task exists and belongs to user
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

  if (!task) return c.json({ error: 'Task not found' }, 404);

  // Recursively delete all descendants using a CTE
  await db.execute(sql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM tasks WHERE parent_task_id = ${id} AND user_id = ${user.id}
      UNION ALL
      SELECT t.id FROM tasks t
      JOIN descendants d ON t.parent_task_id = d.id
      WHERE t.user_id = ${user.id}
    )
    DELETE FROM tasks WHERE id IN (SELECT id FROM descendants)
  `);

  // Delete the parent task
  await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

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

  // Non-recurring: simple toggle
  if (!task.recurringFrequency) {
    const isCompleting = task.status !== 'completed';
    const [updated] = await db
      .update(tasks)
      .set({
        status: isCompleting ? 'completed' : 'pending',
        completedAt: isCompleting ? new Date() : null,
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
      .returning();
    return c.json(updated);
  }

  // Recurring: calculate next due date and reset
  const nextDueDate = calculateNextDueDate(
    task.dueDate ?? new Date(),
    task.recurringFrequency,
  );

  // Reset parent task with new due date
  const [updated] = await db
    .update(tasks)
    .set({ status: 'pending', dueDate: nextDueDate, completedAt: null })
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning();

  // Reset all descendants too
  await db.execute(sql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM tasks WHERE parent_task_id = ${id} AND user_id = ${user.id}
      UNION ALL
      SELECT t.id FROM tasks t
      JOIN descendants d ON t.parent_task_id = d.id
      WHERE t.user_id = ${user.id}
    )
    UPDATE tasks SET status = 'pending', due_date = ${nextDueDate}, completed_at = NULL
    WHERE id IN (SELECT id FROM descendants)
  `);

  return c.json(updated);
});

export default router;
