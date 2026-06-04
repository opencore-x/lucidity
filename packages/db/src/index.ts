import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema/index.js';

export * from './schema/tasks.js';
export * from './schema/users.js';
export * from './schema/projects.js';
export * from './schema/milestones.js';
export * from './schema/comments.js';
export * from './schema/apiKeys.js';
export * from './schema/timeSessions.js';

// Re-export drizzle-orm helpers
export { eq, and, or, desc, asc, isNull, isNotNull, inArray, sql } from 'drizzle-orm';

export function createDb(databaseUrl: string) {
  const client = neon(databaseUrl);
  return drizzle(client, { schema });
}
