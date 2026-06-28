import {
  MEMBER_ACCESS_VALUES,
  PROJECT_VISIBILITY_VALUES,
} from '@lucidity/shared';

export type AccessMode = 'read' | 'write';
export type MemberAccess = (typeof MEMBER_ACCESS_VALUES)[number];
export type ProjectVisibility = (typeof PROJECT_VISIBILITY_VALUES)[number];

export interface ProjectAccessContext {
  /** Is the requesting user the project's owner (projects.userId)? */
  isOwner: boolean;
  /** The user's membership access, or null if they are not a member. */
  memberAccess: MemberAccess | null;
  /** The project's visibility. */
  visibility: ProjectVisibility;
}

/**
 * Pure authorization decision — the single source of truth for who may
 * read/write a project. Kept free of DB access so it can be unit-tested
 * exhaustively; the DB-backed wrappers in authz.ts build the context and
 * delegate here.
 *
 *   read  = owner OR member (any access) OR visibility = 'public'
 *   write = owner OR (member AND access = 'edit')
 *
 * `access` is a consumer-style view/edit picker (Google-Docs model), not RBAC.
 */
export function decideProjectAccess(mode: AccessMode, ctx: ProjectAccessContext): boolean {
  if (ctx.isOwner) return true;

  if (mode === 'read') {
    return ctx.memberAccess !== null || ctx.visibility === 'public';
  }

  // write
  return ctx.memberAccess === 'edit';
}
