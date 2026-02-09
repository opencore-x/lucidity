import {
  boolean,
  pgTable,
  pgEnum,
  uuid,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const aiReviewDepthEnum = pgEnum('ai_review_depth', ['deep', 'light', 'none']);

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 7 }),
  description: varchar('description'),
  isArchived: boolean('is_archived').default(false),
  aiReviewDepth: aiReviewDepthEnum('ai_review_depth').default('light').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
