import { Hono } from 'hono';
import { uuidv7 } from 'uuidv7';
import { db } from '../lib/db.js';
import { comments, tasks, eq, and, sql } from '@lucidity/db';
import { CreateCommentSchema, UpdateCommentSchema } from '@lucidity/shared';
import { getCurrentUser } from '../lib/auth.js';

const router = new Hono();

// GET /api/tasks/:taskId/comments
router.get('/:taskId/comments', async (c) => {
  const user = await getCurrentUser(c);
  const taskId = c.req.param('taskId');

  // Verify task belongs to user
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

  if (!task) return c.json({ error: 'Task not found' }, 404);

  const result = await db
    .select()
    .from(comments)
    .where(eq(comments.taskId, taskId))
    .orderBy(sql`${comments.createdAt} ASC`);

  return c.json(result);
});

// POST /api/tasks/:taskId/comments
router.post('/:taskId/comments', async (c) => {
  const user = await getCurrentUser(c);
  const taskId = c.req.param('taskId');

  // Verify task belongs to user
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

  if (!task) return c.json({ error: 'Task not found' }, 404);

  const body = await c.req.json();
  const parsed = CreateCommentSchema.safeParse(body);

  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const id = uuidv7();

  const [newComment] = await db
    .insert(comments)
    .values({ ...parsed.data, id, taskId, userId: user.id })
    .returning();

  return c.json(newComment, 201);
});

// PATCH /api/tasks/:taskId/comments/:commentId
router.patch('/:taskId/comments/:commentId', async (c) => {
  const user = await getCurrentUser(c);
  const taskId = c.req.param('taskId');
  const commentId = c.req.param('commentId');

  // Verify task belongs to user
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

  if (!task) return c.json({ error: 'Task not found' }, 404);

  const body = await c.req.json();
  const parsed = UpdateCommentSchema.safeParse(body);

  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const [updated] = await db
    .update(comments)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(comments.id, commentId),
        eq(comments.taskId, taskId),
        eq(comments.userId, user.id),
      ),
    )
    .returning();

  if (!updated) return c.json({ error: 'Comment not found' }, 404);
  return c.json(updated);
});

// DELETE /api/tasks/:taskId/comments/:commentId
router.delete('/:taskId/comments/:commentId', async (c) => {
  const user = await getCurrentUser(c);
  const taskId = c.req.param('taskId');
  const commentId = c.req.param('commentId');

  // Verify task belongs to user
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

  if (!task) return c.json({ error: 'Task not found' }, 404);

  const [deleted] = await db
    .delete(comments)
    .where(
      and(
        eq(comments.id, commentId),
        eq(comments.taskId, taskId),
        eq(comments.userId, user.id),
      ),
    )
    .returning();

  if (!deleted) return c.json({ error: 'Comment not found' }, 404);
  return c.body(null, 204);
});

export default router;
