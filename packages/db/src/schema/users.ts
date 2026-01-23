import { uuid, varchar, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  clerkId: varchar('clerk_id'),
  email: varchar('email', { length: 500 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
