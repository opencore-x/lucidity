import { Hono } from 'hono';
import { z } from 'zod';
import { uuidv7 } from 'uuidv7';
import { db } from '../lib/db.js';
import { projectMembers, users, eq, and } from '@lucidity/db';
import { MEMBER_ACCESS_VALUES } from '@lucidity/shared';
import { getCurrentUser } from '../lib/auth.js';
import { assertProjectAccess, assertProjectOwner } from '../lib/authz.js';

const router = new Hono();

// v1 invites an EXISTING user by email; default access lets a collaborator
// work the project immediately. (@handle picker + pending invites: Social milestone.)
const InviteSchema = z.object({
  email: z.string().email(),
  access: z.enum(MEMBER_ACCESS_VALUES).default('edit'),
});

const UpdateAccessSchema = z.object({
  access: z.enum(MEMBER_ACCESS_VALUES),
});

// GET /api/projects/:id/members — anyone with read access sees the roster.
router.get('/:id/members', async (c) => {
  const user = await getCurrentUser(c);
  const projectId = c.req.param('id');
  await assertProjectAccess(user.id, projectId, 'read');

  const members = await db
    .select({
      userId: projectMembers.userId,
      access: projectMembers.access,
      invitedBy: projectMembers.invitedBy,
      createdAt: projectMembers.createdAt,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId));

  return c.json(members);
});

// POST /api/projects/:id/members { email, access } — owner-only.
router.post('/:id/members', async (c) => {
  const user = await getCurrentUser(c);
  const projectId = c.req.param('id');
  const project = await assertProjectOwner(user.id, projectId);

  const body = await c.req.json();
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const [invitee] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email));
  if (!invitee) return c.json({ error: 'No user with that email' }, 404);

  if (invitee.id === project.userId) {
    return c.json({ error: 'The owner already has full access' }, 400);
  }

  const [existing] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, invitee.id),
      ),
    );
  if (existing) return c.json({ error: 'User is already a member' }, 409);

  const [member] = await db
    .insert(projectMembers)
    .values({
      id: uuidv7(),
      projectId,
      userId: invitee.id,
      access: parsed.data.access,
      invitedBy: user.id,
    })
    .returning();

  return c.json(
    {
      ...member,
      name: invitee.name,
      email: invitee.email,
      avatarUrl: invitee.avatarUrl,
    },
    201,
  );
});

// PATCH /api/projects/:id/members/:userId { access } — owner-only.
router.patch('/:id/members/:userId', async (c) => {
  const user = await getCurrentUser(c);
  const projectId = c.req.param('id');
  const memberUserId = c.req.param('userId');
  await assertProjectOwner(user.id, projectId);

  const body = await c.req.json();
  const parsed = UpdateAccessSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const [updated] = await db
    .update(projectMembers)
    .set({ access: parsed.data.access })
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, memberUserId),
      ),
    )
    .returning();

  if (!updated) return c.json({ error: 'Member not found' }, 404);
  return c.json(updated);
});

// DELETE /api/projects/:id/members/:userId — owner-only.
router.delete('/:id/members/:userId', async (c) => {
  const user = await getCurrentUser(c);
  const projectId = c.req.param('id');
  const memberUserId = c.req.param('userId');
  await assertProjectOwner(user.id, projectId);

  const [deleted] = await db
    .delete(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, memberUserId),
      ),
    )
    .returning();

  if (!deleted) return c.json({ error: 'Member not found' }, 404);
  return c.body(null, 204);
});

export default router;
