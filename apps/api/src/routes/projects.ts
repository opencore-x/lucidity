import { Hono } from 'hono';
import { db } from '../lib/db.js';
import { eq, projects } from '@opentask/db';
import { CreateProjectSchema, UpdateProjectSchema } from '@opentask/shared';
import { uuidv7 } from 'uuidv7';

const router = new Hono();

router.get('/', async (c) => {
  const allProjects = await db.select().from(projects);
  return c.json(allProjects);
});

router.get('/:id', async (c) => {
  const id = c.req.param('id');
  const project = await db.select().from(projects).where(eq(projects.id, id));

  if (!project.length) return c.json({ error: 'Project not found' }, 404);

  return c.json(project[0]);
});

router.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = CreateProjectSchema.safeParse(body);

  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const id = uuidv7();

  const [newProject] = await db
    .insert(projects)
    .values({ ...parsed.data, id })
    .returning();

  return c.json(newProject, 201);
});

router.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const parsed = UpdateProjectSchema.safeParse(body);

  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const [updatedProject] = await db
    .update(projects)
    .set(parsed.data)
    .where(eq(projects.id, id))
    .returning();

  if (!updatedProject) return c.json({ error: 'Project not found' }, 404);

  return c.json(updatedProject);
});

router.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [deletedProject] = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning();

  if (!deletedProject) return c.json({ error: 'Project not found' }, 404);
  return c.body(null, 204);
});

export default router;
