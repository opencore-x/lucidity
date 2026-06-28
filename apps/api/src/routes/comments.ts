import { Hono } from 'hono';
import { uuidv7 } from 'uuidv7';
import { db } from '../lib/db.js';
import { comments, tasks, users, eq, and, sql } from '@lucidity/db';
import { CreateCommentSchema, UpdateCommentSchema } from '@lucidity/shared';
import { getCurrentUser } from '../lib/auth.js';
import { assertTaskAccess } from '../lib/authz.js';

const router = new Hono();

// GET /api/tasks/:taskId/comments
router.get('/:taskId/comments', async (c) => {
  const user = await getCurrentUser(c);
  const taskId = c.req.param('taskId');

  // Verify the task exists and the user may read it
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

  if (!task) return c.json({ error: 'Task not found' }, 404);
  await assertTaskAccess(user.id, task, 'read');

  // Join the author so the client can render their real name + avatar (not just the
  // current logged-in user). leftJoin keeps the comment even if the user row is missing.
  const result = await db
    .select({
      id: comments.id,
      taskId: comments.taskId,
      userId: comments.userId,
      content: comments.content,
      source: comments.source,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      authorName: users.name,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.taskId, taskId))
    .orderBy(sql`${comments.createdAt} ASC`);

  return c.json(result);
});

// POST /api/tasks/:taskId/comments
router.post('/:taskId/comments', async (c) => {
  const user = await getCurrentUser(c);
  const taskId = c.req.param('taskId');

  // Verify the task exists and the user may write to it
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

  if (!task) return c.json({ error: 'Task not found' }, 404);
  await assertTaskAccess(user.id, task, 'write');

  const body = await c.req.json();
  const parsed = CreateCommentSchema.safeParse(body);

  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const id = uuidv7();

  const [newComment] = await db
    .insert(comments)
    .values({ ...parsed.data, id, taskId, userId: user.id })
    .returning();

  // Echo the author's name + avatar so the new comment renders them immediately.
  return c.json(
    { ...newComment, authorName: user.name, authorAvatarUrl: user.avatarUrl },
    201,
  );
});

// PATCH /api/tasks/:taskId/comments/:commentId
router.patch('/:taskId/comments/:commentId', async (c) => {
  const user = await getCurrentUser(c);
  const taskId = c.req.param('taskId');
  const commentId = c.req.param('commentId');

  // Verify the task exists and the user may write to it
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

  if (!task) return c.json({ error: 'Task not found' }, 404);
  await assertTaskAccess(user.id, task, 'write');

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

  // Verify the task exists and the user may write to it
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

  if (!task) return c.json({ error: 'Task not found' }, 404);
  await assertTaskAccess(user.id, task, 'write');

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
