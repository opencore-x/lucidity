import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  pgEnum,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { projects } from './projects.js';

const statusEnum = pgEnum('task_status', [
  'pending',
  'in_progress',
  'completed',
]);

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  parentTaskId: uuid('parent_task_id').references((): AnyPgColumn => tasks.id),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: statusEnum('status').default('pending'),
  priority: integer('priority').notNull().default(500),
  position: integer('position'),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
