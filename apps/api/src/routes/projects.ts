import { Hono } from 'hono';
import { db } from '../lib/db.js';
import { eq, and, projects } from '@lucidity/db';
import { CreateProjectSchema, UpdateProjectSchema } from '@lucidity/shared';
import { uuidv7 } from 'uuidv7';
import { getCurrentUser } from '../lib/auth.js';

const router = new Hono();

router.get('/', async (c) => {
  const user = await getCurrentUser(c);
  const allProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id));
  return c.json(allProjects);
});

router.get('/:id', async (c) => {
  const user = await getCurrentUser(c);
  const id = c.req.param('id');
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)));

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

  const [updatedProject] = await db
    .update(projects)
    .set(parsed.data)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .returning();

  if (!updatedProject) return c.json({ error: 'Project not found' }, 404);

  return c.json(updatedProject);
});

router.delete('/:id', async (c) => {
  const user = await getCurrentUser(c);
  const id = c.req.param('id');

  const [deletedProject] = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .returning();

  if (!deletedProject) return c.json({ error: 'Project not found' }, 404);
  return c.body(null, 204);
});

export default router;
