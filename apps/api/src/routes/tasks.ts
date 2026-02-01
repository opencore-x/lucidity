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
import { tasks, eq, and, asc, sql } from '@lucidity/db';
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
          Math.min(anchorDay, daysInNextYearMonth)
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
  const allTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, user.id))
    .orderBy(sql`${tasks.position} ASC NULLS LAST`, asc(tasks.createdAt));
  return c.json(allTasks);
});

router.post('/', async (c) => {
  const body = await c.req.json();
  const user = await getCurrentUser(c);
  const parsed = CreateTaskSchema.safeParse(body);

  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  // Block creating recurring task without a dueDate
  if (parsed.data.recurringFrequency && !parsed.data.dueDate) {
    return c.json({ error: 'Cannot set recurring frequency without a due date' }, 400);
  }

  const id = uuidv7();

  const [newTask] = await db
    .insert(tasks)
    .values({ ...parsed.data, id, userId: user.id })
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
        .returning()
    )
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
    parsed.data.dueDate !== undefined ? parsed.data.dueDate : existingTask.dueDate;

  // Block setting recurringFrequency without a dueDate
  if (parsed.data.recurringFrequency && !effectiveDueDate) {
    return c.json({ error: 'Cannot set recurring frequency without a due date' }, 400);
  }

  // If clearing dueDate, also clear recurringFrequency
  const updateData = { ...parsed.data };
  if (parsed.data.dueDate === null && existingTask.recurringFrequency) {
    updateData.recurringFrequency = null;
  }

  const [updated] = await db
    .update(tasks)
    .set(updateData)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .returning();

  // If updating recurringFrequency, propagate to all descendants (with dueDate)
  if (updateData.recurringFrequency !== undefined) {
    const dueDateToPropagate = updated.dueDate;
    await db.execute(sql`
      WITH RECURSIVE descendants AS (
        SELECT id FROM tasks WHERE parent_task_id = ${id} AND user_id = ${user.id}
        UNION ALL
        SELECT t.id FROM tasks t
        JOIN descendants d ON t.parent_task_id = d.id
        WHERE t.user_id = ${user.id}
      )
      UPDATE tasks
      SET recurring_frequency = ${updateData.recurringFrequency},
          due_date = ${dueDateToPropagate}
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
    const taskStatus = task.status === 'completed' ? 'pending' : 'completed';
    const [updated] = await db
      .update(tasks)
      .set({ status: taskStatus })
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
      .returning();
    return c.json(updated);
  }

  // Recurring: calculate next due date and reset
  const nextDueDate = calculateNextDueDate(
    task.dueDate ?? new Date(),
    task.recurringFrequency
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
