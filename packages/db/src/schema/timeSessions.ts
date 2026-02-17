import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { tasks } from './tasks.js';

export const timeSessions = pgTable(
  'time_sessions',
  {
    id: uuid('id').primaryKey(),
    taskId: uuid('task_id')
      .references(() => tasks.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    startedAt: timestamp('started_at').notNull(),
    endedAt: timestamp('ended_at'),
    elapsedSeconds: integer('elapsed_seconds').notNull().default(0),
    device: varchar('device', { length: 50 }),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('time_sessions_task_id_idx').on(table.taskId),
    index('time_sessions_user_id_idx').on(table.userId),
    index('time_sessions_user_active_idx').on(table.userId, table.endedAt),
  ],
);
