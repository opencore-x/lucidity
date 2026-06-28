import {
  pgTable,
  pgEnum,
  uuid,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

import { users } from './users.js';
import { projects } from './projects.js';

export const memberAccessEnum = pgEnum('member_access', ['view', 'edit']);

export const projectMembers = pgTable(
  'project_members',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    access: memberAccessEnum('access').default('edit').notNull(),
    invitedBy: uuid('invited_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [unique('project_members_project_user_unique').on(table.projectId, table.userId)],
);
