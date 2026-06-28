import { Hono } from 'hono';
import { db } from '../lib/db.js';
import { eq, and, projects, tasks } from '@lucidity/db';

/**
 * Unauthenticated read-only access to PUBLIC projects (visibility = 'public').
 * These routes never call getCurrentUser, so anyone with the link can read them —
 * that's the whole point of a public share link. A project that isn't public (or
 * doesn't exist) returns 404 indistinguishably, so private/shared ids aren't
 * probeable. Revocation is simply setting the project back to private.
 */
const router = new Hono();

router.get('/projects/:id', async (c) => {
  const id = c.req.param('id');

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.visibility, 'public')));

  if (!project) return c.json({ error: 'Not found' }, 404);

  const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, id));

  return c.json({ project, tasks: projectTasks });
});

export default router;
