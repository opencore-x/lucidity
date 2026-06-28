import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { eq, inArray, projects, tasks } from '@lucidity/db';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  PROJECT_VISIBILITY_VALUES,
} from '@lucidity/shared';
import { uuidv7 } from 'uuidv7';
import { getCurrentUser } from '../lib/auth.js';
import {
  accessibleProjectIds,
  assertProjectAccess,
  assertProjectOwner,
} from '../lib/authz.js';

const VisibilitySchema = z.object({
  visibility: z.enum(PROJECT_VISIBILITY_VALUES),
});

const router = new Hono();

router.get('/', async (c) => {
  const user = await getCurrentUser(c);
  const ids = await accessibleProjectIds(user.id, 'read');
  if (ids.length === 0) return c.json([]);
  const allProjects = await db
    .select()
    .from(projects)
    .where(inArray(projects.id, ids));
  return c.json(allProjects);
});

router.get('/:id', async (c) => {
  const user = await getCurrentUser(c);
  const id = c.req.param('id');

  await assertProjectAccess(user.id, id, 'read');

  const project = await db.select().from(projects).where(eq(projects.id, id));

  if (!project.length) return c.json({ error: 'Project not found' }, 404);

  return c.json(project[0]);
});

router.post('/', async (c) => {
  const user = await getCurrentUser(c);
  const body = await c.req.json();
  const parsed = CreateProjectSchema.safeParse(body);

  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const id = uuidv7();

  const [newProject] = await db
    .insert(projects)
    .values({ ...parsed.data, id, userId: user.id })
    .returning();

  return c.json(newProject, 201);
});

router.patch('/:id', async (c) => {
  const user = await getCurrentUser(c);
  const id = c.req.param('id');
  const body = await c.req.json();

  const parsed = UpdateProjectSchema.safeParse(body);

  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  await assertProjectAccess(user.id, id, 'write');

  const [updatedProject] = await db
    .update(projects)
    .set(parsed.data)
    .where(eq(projects.id, id))
    .returning();

  if (!updatedProject) return c.json({ error: 'Project not found' }, 404);

  return c.json(updatedProject);
});

// Visibility is owner-only — a stricter gate than the write access an
// edit-member has, so it lives on its own endpoint rather than UpdateProjectSchema.
router.patch('/:id/visibility', async (c) => {
  const user = await getCurrentUser(c);
  const id = c.req.param('id');
  const body = await c.req.json();

  const parsed = VisibilitySchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  await assertProjectOwner(user.id, id);

  const [updated] = await db
    .update(projects)
    .set({ visibility: parsed.data.visibility })
    .where(eq(projects.id, id))
    .returning();

  if (!updated) return c.json({ error: 'Project not found' }, 404);
  return c.json(updated);
});

router.delete('/:id', async (c) => {
  const user = await getCurrentUser(c);
  const id = c.req.param('id');

  await assertProjectAccess(user.id, id, 'write');

  // Deleting the project removes all its tasks regardless of author.
  await db.delete(tasks).where(eq(tasks.projectId, id));

  await db.delete(projects).where(eq(projects.id, id));

  return c.body(null, 204);
});

export default router;
