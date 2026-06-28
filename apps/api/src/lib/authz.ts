import { projects, projectMembers, eq, and } from '@lucidity/db';
import { db } from './db.js';
import { forbiddenError, notFoundError } from './errors.js';
import {
  decideProjectAccess,
  type AccessMode,
  type MemberAccess,
} from './authz-policy.js';

export {
  decideProjectAccess,
  type AccessMode,
  type MemberAccess,
  type ProjectVisibility,
  type ProjectAccessContext,
} from './authz-policy.js';

/**
 * Central authorization seam for project-scoped access.
 *
 * Lucidity historically inlined access control as `eq(table.userId, user.id)`
 * everywhere — that is owner-only authentication, not authorization. These
 * helpers replace that pattern so projects can be shared (members) or public.
 * The actual allow/deny rule lives in the pure `decideProjectAccess` policy;
 * everything here just loads the context from the database.
 */

/**
 * Project IDs the user may act on, for `mode`:
 *   read  → owned ∪ all memberships ∪ public projects
 *   write → owned ∪ memberships with 'edit' access
 *
 * Used to scope list/collection queries (e.g. `inArray(projects.id, ids)`).
 */
export async function accessibleProjectIds(
  userId: string,
  mode: AccessMode = 'read',
): Promise<string[]> {
  const ids = new Set<string>();

  const owned = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.userId, userId));
  for (const row of owned) ids.add(row.id);

  const memberships = await db
    .select({ projectId: projectMembers.projectId, access: projectMembers.access })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));
  for (const m of memberships) {
    if (mode === 'read' || m.access === 'edit') ids.add(m.projectId);
  }

  if (mode === 'read') {
    const publicProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.visibility, 'public'));
    for (const row of publicProjects) ids.add(row.id);
  }

  return [...ids];
}

/**
 * Assert that `userId` may `read`/`write` `projectId`.
 * Throws `notFoundError` if the project does not exist, `forbiddenError` if it
 * exists but the user lacks the required access. Resolves silently when allowed.
 */
export async function assertProjectAccess(
  userId: string,
  projectId: string,
  mode: AccessMode,
): Promise<void> {
  const [project] = await db
    .select({ userId: projects.userId, visibility: projects.visibility })
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) throw notFoundError('Project not found');

  const isOwner = project.userId === userId;

  let memberAccess: MemberAccess | null = null;
  if (!isOwner) {
    const [membership] = await db
      .select({ access: projectMembers.access })
      .from(projectMembers)
      .where(
        and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)),
      );
    memberAccess = membership?.access ?? null;
  }

  const allowed = decideProjectAccess(mode, {
    isOwner,
    memberAccess,
    visibility: project.visibility,
  });

  if (!allowed) throw forbiddenError();
}
