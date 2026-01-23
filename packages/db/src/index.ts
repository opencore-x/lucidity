import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema/index.js';

export * from './schema/tasks.js';
export * from './schema/users.js';
export * from './schema/projects.js';

// Re-export drizzle-orm helpers
export { eq, and, or, desc, asc, isNull, isNotNull } from 'drizzle-orm';

export function createDb(databaseUrl: string) {
  const client = neon(databaseUrl);
  return drizzle(client, { schema });
}
