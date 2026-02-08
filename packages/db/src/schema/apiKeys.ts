import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull()
      .unique(),
    keyHash: varchar('key_hash', { length: 64 }).notNull(),
    keyPrefix: varchar('key_prefix', { length: 16 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    lastUsedAt: timestamp('last_used_at'),
  },
  (table) => [index('api_keys_key_hash_idx').on(table.keyHash)],
);
