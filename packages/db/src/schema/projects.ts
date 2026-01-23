import {
  boolean,
  pgTable,
  uuid,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 7 }),
  description: varchar('description'),
  isArchived: boolean('is_archived').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
