import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { tasks } from './tasks.js';

export const commentSourceEnum = pgEnum('comment_source', ['user', 'claude']);

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey(),
  taskId: uuid('task_id')
    .references(() => tasks.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  content: text('content').notNull(),
  source: commentSourceEnum('source').default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
